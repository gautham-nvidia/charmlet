import { ENCOURAGEMENT_CARDS, feedDeck, isFeedMode, learningCard, type FeedMode, type LearningCard } from './learning-cards';

export const MINUTE_MS = 60000;
export const FOCUS_MINUTES_LIMIT = 120;
export const BREAK_MINUTES_LIMIT = 30;
export const COMPANION_STATE_VERSION = 1;
export type FocusPhase = 'focus' | 'break';
export type FocusStatus = 'idle' | 'running' | 'paused' | 'finished';
export type FocusNotice = 'elapsed-away' | 'clock-changed' | null;

export interface FocusState {
	phase: FocusPhase;
	status: FocusStatus;
	durationMs: number;
	remainingMs: number;
	startedAt: number | null;
	deadlineAt: number | null;
	notice: FocusNotice;
}

export interface CompanionState {
	version: 1;
	revision: number;
	settings: { focusMinutes: number; breakMinutes: number; intent: string };
	focus: FocusState;
	learning: { mode: FeedMode; cardId: string; encouragementId: string; revealed: boolean };
}

export type CompanionAction =
	| { type: 'focus-configure'; focusMinutes: number; breakMinutes: number; intent: string }
	| { type: 'focus-start'; phase: FocusPhase; focusMinutes: number; breakMinutes: number; intent: string }
	| { type: 'focus-pause' }
	| { type: 'focus-resume' }
	| { type: 'focus-stop' }
	| { type: 'feed-mode'; mode: FeedMode }
	| { type: 'feed-next' }
	| { type: 'feed-reveal'; cardId: string; revealed: boolean };

export interface CompanionSnapshot {
	state: CompanionState;
	now: number;
	remainingMs: number;
	progress: number;
	error?: string;
}
export interface CompanionResult { state: CompanionState; message?: string; }

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function integer(value: unknown, minimum: number, maximum: number, fallback: number): number {
	return typeof value === 'number' && Number.isSafeInteger(value)
		? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

function clockValue(value: number): number {
	if (!Number.isSafeInteger(value) || value < 0) { throw new Error('Invalid companion clock.'); }
	return value;
}

function timestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
}

function intent(value: unknown): string {
	if (typeof value !== 'string') { return ''; }
	return Array.from(value.replace(/\s+/g, ' ').trim())
		.filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
		.slice(0, 160).join('');
}

function idleFocus(minutes: number): FocusState {
	return {
		phase: 'focus', status: 'idle', durationMs: minutes * MINUTE_MS, remainingMs: minutes * MINUTE_MS,
		startedAt: null, deadlineAt: null, notice: null,
	};
}

export function defaultCompanionState(legacyMessageIndex = 0): CompanionState {
	const quote = ENCOURAGEMENT_CARDS[integer(legacyMessageIndex, 0, ENCOURAGEMENT_CARDS.length - 1, 0)];
	return {
		version: 1, revision: 0,
		settings: { focusMinutes: 25, breakMinutes: 5, intent: '' },
		focus: idleFocus(25),
		learning: { mode: 'mix', cardId: feedDeck('mix')[0].id, encouragementId: quote.id, revealed: false },
	};
}

export function hasNewerCompanionSchema(value: unknown): boolean {
	const version = object(value).version;
	return typeof version === 'number' && Number.isSafeInteger(version) && version > COMPANION_STATE_VERSION;
}

/** Project untrusted saved JSON into the small canonical schema; do not read a clock here. */
export function restoreCompanionState(value: unknown, legacyMessageIndex = 0): CompanionState {
	const defaults = defaultCompanionState(legacyMessageIndex);
	const raw = object(value);
	if (raw.version !== 1) { return defaults; }
	const settings = object(raw.settings);
	const focusMinutes = integer(settings.focusMinutes, 1, FOCUS_MINUTES_LIMIT, 25);
	const breakMinutes = integer(settings.breakMinutes, 1, BREAK_MINUTES_LIMIT, 5);
	const focus = object(raw.focus);
	const phase: FocusPhase = focus.phase === 'break' ? 'break' : 'focus';
	const durationMs = integer(focus.durationMs, MINUTE_MS, (phase === 'break' ? BREAK_MINUTES_LIMIT : FOCUS_MINUTES_LIMIT) * MINUTE_MS,
		(phase === 'break' ? breakMinutes : focusMinutes) * MINUTE_MS);
	const remainingMs = integer(focus.remainingMs, 0, durationMs, durationMs);
	const notice: FocusNotice = focus.notice === 'elapsed-away' || focus.notice === 'clock-changed' ? focus.notice : null;
	let restoredFocus = idleFocus(focusMinutes);
	if (focus.status === 'running' && timestamp(focus.startedAt) && timestamp(focus.deadlineAt)
		&& remainingMs > 0 && focus.deadlineAt === focus.startedAt + remainingMs) {
		restoredFocus = { phase, status: 'running', durationMs, remainingMs, startedAt: focus.startedAt, deadlineAt: focus.deadlineAt, notice };
	} else if (focus.status === 'paused' && remainingMs > 0) {
		restoredFocus = { phase, status: 'paused', durationMs, remainingMs, startedAt: null, deadlineAt: null, notice };
	} else if (focus.status === 'finished' || focus.status === 'paused' && remainingMs === 0) {
		restoredFocus = { phase, status: 'finished', durationMs, remainingMs: 0, startedAt: null, deadlineAt: null, notice };
	}
	const learning = object(raw.learning);
	const mode = isFeedMode(learning.mode) ? learning.mode : 'mix';
	const card = feedDeck(mode).find(entry => entry.id === learning.cardId) ?? feedDeck(mode)[0];
	const quote = ENCOURAGEMENT_CARDS.find(entry => entry.id === learning.encouragementId) ?? learningCard(defaults.learning.encouragementId)!;
	return {
		version: 1, revision: integer(raw.revision, 0, 2147483646, 0),
		settings: { focusMinutes, breakMinutes, intent: intent(settings.intent) },
		focus: restoredFocus,
		learning: { mode, cardId: card.id, encouragementId: quote.id, revealed: card.id === learning.cardId && card.kind === 'trivia' && learning.revealed === true },
	};
}

function revised(state: CompanionState, changes: Partial<Pick<CompanionState, 'settings' | 'focus' | 'learning'>>): CompanionState {
	return { ...state, ...changes, revision: (state.revision + 1) % 2147483647 };
}

export function remainingFocusMs(state: CompanionState, now: number): number {
	clockValue(now);
	const focus = state.focus;
	return focus.status === 'running'
		? Math.max(0, Math.min(focus.remainingMs, focus.deadlineAt! - now))
		: focus.remainingMs;
}

/**
 * Finish at most one timer. A backwards observed wall clock pauses at the last
 * known remainder. An expired timer never auto-starts another session or records work.
 */
export function reconcileCompanion(state: CompanionState, now: number, lastObservedAt?: number, recovered = false): CompanionState {
	clockValue(now);
	if (state.focus.status !== 'running') { return state; }
	const previous = lastObservedAt === undefined ? state.focus.startedAt! : clockValue(lastObservedAt);
	if (now < previous || now < state.focus.startedAt!) {
		const remainingMs = remainingFocusMs(state, Math.max(previous, state.focus.startedAt!));
		return revised(state, { focus: {
			...state.focus, status: remainingMs > 0 ? 'paused' : 'finished', remainingMs,
			startedAt: null, deadlineAt: null, notice: 'clock-changed',
		} });
	}
	if (now >= state.focus.deadlineAt!) {
		return revised(state, { focus: {
			...state.focus, status: 'finished', remainingMs: 0, startedAt: null, deadlineAt: null,
			notice: recovered ? 'elapsed-away' : null,
		} });
	}
	return state;
}

function validMinutes(value: unknown, maximum: number): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= maximum;
}

export function parseCompanionAction(value: unknown): CompanionAction | undefined {
	const action = object(value);
	switch (action.type) {
		case 'focus-configure':
		case 'focus-start':
			if (!validMinutes(action.focusMinutes, FOCUS_MINUTES_LIMIT) || !validMinutes(action.breakMinutes, BREAK_MINUTES_LIMIT)
				|| typeof action.intent !== 'string' || action.intent.length > 1000) { return undefined; }
			if (action.type === 'focus-start') {
				if (action.phase !== 'focus' && action.phase !== 'break') { return undefined; }
				return { type: action.type, phase: action.phase, focusMinutes: action.focusMinutes, breakMinutes: action.breakMinutes, intent: intent(action.intent) };
			}
			return { type: action.type, focusMinutes: action.focusMinutes, breakMinutes: action.breakMinutes, intent: intent(action.intent) };
		case 'focus-pause':
		case 'focus-resume':
		case 'focus-stop':
		case 'feed-next':
			return { type: action.type };
		case 'feed-mode':
			return isFeedMode(action.mode) ? { type: action.type, mode: action.mode } : undefined;
		case 'feed-reveal':
			return typeof action.cardId === 'string' && action.cardId.length <= 100 && typeof action.revealed === 'boolean'
				? { type: action.type, cardId: action.cardId, revealed: action.revealed } : undefined;
		default:
			return undefined;
	}
}

export function applyCompanionAction(state: CompanionState, action: CompanionAction, now: number, lastObservedAt?: number): CompanionResult {
	const validated = parseCompanionAction(action);
	if (!validated) { throw new Error('Invalid companion action.'); }
	action = validated;
	let next = reconcileCompanion(state, now, lastObservedAt);
	const focus = next.focus;
	switch (action.type) {
		case 'focus-configure':
		case 'focus-start': {
			if (focus.status === 'running' || focus.status === 'paused') {
				return { state: next, message: 'Stop the current timer before starting or changing a session.' };
			}
			const settings = { focusMinutes: action.focusMinutes, breakMinutes: action.breakMinutes, intent: intent(action.intent) };
			if (action.type === 'focus-configure') {
				next = revised(next, { settings, focus: idleFocus(settings.focusMinutes) });
			} else {
				const durationMs = (action.phase === 'break' ? settings.breakMinutes : settings.focusMinutes) * MINUTE_MS;
				next = revised(next, { settings, focus: {
					phase: action.phase, status: 'running', durationMs, remainingMs: durationMs,
					startedAt: now, deadlineAt: now + durationMs, notice: null,
				} });
			}
			break;
		}
		case 'focus-pause':
			if (focus.status === 'running') {
				next = revised(next, { focus: {
					...focus, status: 'paused', remainingMs: remainingFocusMs(next, now),
					startedAt: null, deadlineAt: null, notice: null,
				} });
			}
			break;
		case 'focus-resume':
			if (focus.status === 'paused' && focus.remainingMs > 0) {
				next = revised(next, { focus: { ...focus, status: 'running', startedAt: now, deadlineAt: now + focus.remainingMs, notice: null } });
			}
			break;
		case 'focus-stop':
			next = revised(next, { focus: idleFocus(next.settings.focusMinutes) });
			break;
		case 'feed-mode': {
			const deck = feedDeck(action.mode);
			const selected = action.mode === 'encouragement'
				? deck.find(card => card.id === next.learning.encouragementId)
				: deck.find(card => card.id === next.learning.cardId);
			next = revised(next, { learning: { ...next.learning, mode: action.mode, cardId: (selected ?? deck[0]).id, revealed: false } });
			break;
		}
		case 'feed-next': {
			const deck = feedDeck(next.learning.mode);
			const index = deck.findIndex(card => card.id === next.learning.cardId);
			const selected = deck[(Math.max(0, index) + 1) % deck.length];
			next = revised(next, { learning: {
				...next.learning, cardId: selected.id, revealed: false,
				encouragementId: selected.kind === 'encouragement' ? selected.id : next.learning.encouragementId,
			} });
			break;
		}
		case 'feed-reveal':
			if (action.cardId === next.learning.cardId && currentLearningCard(next).kind === 'trivia'
				&& action.revealed !== next.learning.revealed) {
				next = revised(next, { learning: { ...next.learning, revealed: action.revealed } });
			}
			break;
	}
	return { state: next };
}

export function currentLearningCard(state: CompanionState): LearningCard {
	return learningCard(state.learning.cardId) ?? feedDeck(state.learning.mode)[0];
}

export function companionSnapshot(state: CompanionState, now: number): CompanionSnapshot {
	const remainingMs = remainingFocusMs(state, now);
	return {
		state: structuredClone(state), now, remainingMs,
		progress: state.focus.status === 'idle' ? 0 : Math.max(0, Math.min(1, 1 - remainingMs / state.focus.durationMs)),
	};
}

export function formatFocusTime(milliseconds: number): string {
	const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
	const minutes = Math.floor(seconds / 60);
	return minutes >= 60
		? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
		: `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function matchesCompanionState(expected: CompanionState, actual: unknown): boolean {
	return JSON.stringify(expected) === JSON.stringify(actual);
}
