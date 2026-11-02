export type ReminderKind = 'water' | 'move';
export const REMINDER_KINDS: readonly ReminderKind[] = ['water', 'move'];
export const REMINDER_MINUTES_MIN = 15;
export const REMINDER_MINUTES_MAX = 180;
export const SNOOZE_MS = 10 * 60000;
export interface ReminderState { enabled: boolean; intervalMinutes: number; dueAt: number | null; pendingAt: number | null; }
export interface CareState { deferWhileFocusing: boolean; water: ReminderState; move: ReminderState; }
function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function time(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
}
function clock(now: number) {
	if (!time(now)) { throw new Error('Invalid reminder clock.'); }
}
export function validReminderMinutes(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= REMINDER_MINUTES_MIN && value <= REMINDER_MINUTES_MAX;
}
export function defaultCare(): CareState {
	return {
		deferWhileFocusing: true,
		water: { enabled: false, intervalMinutes: 60, dueAt: null, pendingAt: null },
		move: { enabled: false, intervalMinutes: 50, dueAt: null, pendingAt: null },
	};
}
export function restoreCare(value: unknown, now: number): CareState {
	clock(now);
	const raw = object(value);
	const result = defaultCare();
	result.deferWhileFocusing = raw.deferWhileFocusing !== false;
	for (const kind of REMINDER_KINDS) {
		const reminder = object(raw[kind]);
		const intervalMinutes = validReminderMinutes(reminder.intervalMinutes) ? reminder.intervalMinutes : result[kind].intervalMinutes;
		const enabled = reminder.enabled === true;
		const pendingAt = enabled && time(reminder.pendingAt) ? reminder.pendingAt : null;
		const dueAt = enabled && pendingAt === null
			? time(reminder.dueAt) ? Math.min(reminder.dueAt, now + intervalMinutes * 60000) : now + intervalMinutes * 60000
			: null;
		result[kind] = { enabled, intervalMinutes, pendingAt, dueAt };
	}
	return result;
}
export function configureReminder(state: CareState, kind: ReminderKind, enabled: boolean, intervalMinutes: number, now: number): CareState {
	clock(now);
	if (!REMINDER_KINDS.includes(kind) || !validReminderMinutes(intervalMinutes) || typeof enabled !== 'boolean') {
		throw new Error('Invalid reminder settings.');
	}
	return { ...state, [kind]: { enabled, intervalMinutes, pendingAt: null, dueAt: enabled ? now + intervalMinutes * 60000 : null } };
}
export function settleCare(state: CareState, now: number, previousNow = now): CareState {
	clock(now);
	clock(previousNow);
	let result = state;
	for (const kind of REMINDER_KINDS) {
		const reminder = state[kind];
		if (!reminder.enabled || reminder.pendingAt !== null) { continue; }
		if (now < previousNow) {
			result = { ...result, [kind]: { ...reminder, dueAt: now + reminder.intervalMinutes * 60000 } };
		} else if (reminder.dueAt !== null && reminder.dueAt <= now) {
			result = { ...result, [kind]: { ...reminder, pendingAt: reminder.dueAt, dueAt: null } };
		}
	}
	return result;
}
export function dismissReminder(state: CareState, kind: ReminderKind, action: 'done' | 'skip' | 'snooze', now: number): CareState {
	clock(now);
	if (!REMINDER_KINDS.includes(kind) || !['done', 'skip', 'snooze'].includes(action)) { throw new Error('Invalid reminder action.'); }
	const reminder = state[kind];
	if (!reminder.enabled || reminder.pendingAt === null) { return state; }
	return { ...state, [kind]: { ...reminder, pendingAt: null, dueAt: now + (action === 'snooze' ? SNOOZE_MS : reminder.intervalMinutes * 60000) } };
}
export function visibleReminder(state: CareState, focus: { phase: 'focus' | 'break'; status: string }): ReminderKind | undefined {
	if (state.deferWhileFocusing && focus.phase === 'focus' && focus.status === 'running') { return undefined; }
	return REMINDER_KINDS.filter(kind => state[kind].enabled && state[kind].pendingAt !== null)
		.sort((a, b) => state[a].pendingAt! - state[b].pendingAt!)[0];
}
export function nextReminderDue(state: CareState): number | undefined {
	const pending = REMINDER_KINDS.flatMap(kind => state[kind].enabled && state[kind].dueAt !== null ? [state[kind].dueAt!] : []);
	return pending.length ? Math.min(...pending) : undefined;
}
