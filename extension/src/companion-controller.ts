import {
	applyCompanionAction, companionSnapshot, hasNewerCompanionSchema, matchesCompanionState, parseCompanionAction,
	reconcileCompanion, restoreCompanionState, type CompanionSnapshot, type CompanionState, type GardenEntropy,
} from './companion-core';
import { randomInt, randomUUID } from 'node:crypto';
import { nextReminderDue } from './care-core';
import { gardenNextChange } from './garden-core';
import { StateWriter } from './state-writer';

export interface CompanionStorage {
	write(value: CompanionState): Promise<void>;
	read(): Promise<unknown>;
}

export interface CompanionClock {
	now(): number;
	set(callback: () => void, delayMs: number): unknown;
	clear(handle: unknown): void;
}

const systemClock: CompanionClock = {
	now: () => Date.now(),
	set: (callback, delayMs) => setTimeout(callback, delayMs),
	clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Host-independent companion orchestration. No VS Code, Electron or renderer dependency. */
export class CompanionController {
	private state: CompanionState;
	private readonly writer: StateWriter<CompanionState>;
	private queue: Promise<unknown> = Promise.resolve();
	private timer: unknown;
	private closed = false;
	private error: string | undefined;
	private lastObservedAt: number;
	private readonly newerSchema: boolean;
	private readonly listeners = new Set<(snapshot: CompanionSnapshot) => void>();

	constructor(
		saved: unknown,
		storage: CompanionStorage,
		legacyMessageIndex = 0,
		private readonly clock: CompanionClock = systemClock,
		private readonly entropy: GardenEntropy = { plantId: randomUUID, index: size => randomInt(size) },
	) {
		this.state = restoreCompanionState(saved, clock.now(), legacyMessageIndex);
		this.newerSchema = hasNewerCompanionSchema(saved);
		this.writer = new StateWriter(value => storage.write(value), () => storage.read(), matchesCompanionState);
		this.lastObservedAt = this.state.focus.startedAt ?? clock.now();
	}

	private enqueue<Value>(operation: () => Promise<Value>): Promise<Value> {
		const next = this.queue.catch(() => undefined).then(operation);
		this.queue = next;
		return next;
	}

	async initialize(): Promise<void> {
		if (this.newerSchema) {
			this.error = 'Saved companion data is from a newer version. Update Charmlet to use it.';
			this.emit();
			return;
		}
		await this.enqueue(async () => {
			const now = this.clock.now();
			const recovered = reconcileCompanion(this.state, now, undefined, true);
			// An existing session can still be shown when storage is unavailable.
			// New user actions never advance state unless their write is confirmed.
			this.state = recovered;
			try {
				await this.commit(recovered);
			} catch {
				return;
			}
			this.lastObservedAt = now;
			this.emit();
			this.schedule();
		});
	}

	snapshot(): CompanionSnapshot {
		return { ...companionSnapshot(this.state, this.clock.now()), ...(this.error ? { error: this.error } : {}) };
	}

	subscribe(listener: (snapshot: CompanionSnapshot) => void): () => void {
		this.listeners.add(listener);
		listener(this.snapshot());
		return () => { this.listeners.delete(listener); };
	}

	private emit() {
		for (const listener of this.listeners) {
			// UI observers must not turn a confirmed save into a failed operation.
			try { listener(this.snapshot()); } catch { /* Observer is independent of storage. */ }
		}
	}

	private async commit(state: CompanionState) {
		try {
			await this.writer.save(state);
			this.state = state;
			this.error = undefined;
		} catch (error) {
			this.error = 'Charmlet could not save companion settings. Try the action again.';
			this.stopTimer();
			this.emit();
			throw error;
		}
	}

	async dispatch(value: unknown): Promise<{ message?: string }> {
		if (this.closed) { throw new Error('Companion is closed.'); }
		if (this.newerSchema) { throw new Error(this.error ?? 'Newer companion data cannot be changed by this version.'); }
		const action = parseCompanionAction(value);
		if (!action) { throw new Error('Invalid companion action.'); }
		return this.enqueue(async () => {
			const now = this.clock.now();
			const result = applyCompanionAction(this.state, action, now, this.lastObservedAt, this.entropy);
			if (result.state !== this.state || this.error) { await this.commit(result.state); }
			this.lastObservedAt = now;
			this.emit();
			this.schedule();
			return result.message ? { message: result.message } : {};
		});
	}

	private stopTimer() {
		if (this.timer !== undefined) { this.clock.clear(this.timer); }
		this.timer = undefined;
	}

	private schedule() {
		this.stopTimer();
		if (this.closed || this.error) { return; }
		const now = this.clock.now();
		const candidates = [
			this.state.focus.status === 'running' ? Math.min(now + 1000, this.state.focus.deadlineAt!) : undefined,
			nextReminderDue(this.state.care), gardenNextChange(this.state.garden, now),
		].filter((value): value is number => value !== undefined);
		if (!candidates.length) { return; }
		const delay = Math.max(1, Math.min(2147483647, Math.min(...candidates) - now));
		this.timer = this.clock.set(() => {
			this.timer = undefined;
			void this.tick().catch(() => { /* commit reported the storage error; do not spin a retry loop. */ });
		}, delay);
	}

	private tick(): Promise<void> {
		return this.enqueue(async () => {
			if (this.closed) { return; }
			const now = this.clock.now();
			const next = reconcileCompanion(this.state, now, this.lastObservedAt);
			if (next !== this.state) { await this.commit(next); }
			this.lastObservedAt = now;
			this.emit();
			this.schedule();
		});
	}

	async flush(): Promise<void> {
		let pending: Promise<unknown>;
		do {
			pending = this.queue;
			await pending.catch(() => undefined);
		} while (pending !== this.queue);
		await this.writer.flush();
	}

	async dispose(): Promise<void> {
		this.closed = true;
		this.stopTimer();
		await this.flush();
		this.listeners.clear();
	}
}
