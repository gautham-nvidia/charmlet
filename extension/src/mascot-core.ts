import type { CompanionSnapshot, CompanionState } from './companion-core';
import { ENCOURAGEMENT_CARDS } from './learning-cards';

export const MASCOT_CHARM = 'live:cali';
export const MASCOT_INTERVAL_MS = 3 * 60000;
export interface MascotSettings {
	enabled: boolean;
	focusNudges: boolean;
	name: string;
}
export interface MascotCue { text: string; celebrate: boolean; }

export function mascotName(value: unknown): string {
	if (typeof value !== 'string') { return ''; }
	return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 32).join('');
}

export function restoreMascotSettings(value: unknown): MascotSettings {
	const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
	return { enabled: raw.enabled !== false, focusNudges: raw.focusNudges !== false, name: mascotName(raw.name) };
}

function personal(state: CompanionState, text: string): string {
	return state.mascot.name ? `${state.mascot.name}: ${text}` : text;
}

/** Encouragement uses only the person's chosen name, intention and local timer. */
export function mascotEncouragement(state: CompanionState, sequence = 0): string {
	if (state.mascot.focusNudges && state.focus.status === 'running' && state.focus.phase === 'focus') {
		const step = Array.from(state.settings.intent).slice(0, 65).join('');
		return personal(state, step ? `One step at a time. You've got this: ${step}` : 'Stay with one small step. You are making progress.');
	}
	if (state.mascot.focusNudges && state.focus.status === 'idle' && sequence % 3 === 0) {
		return personal(state, 'Ready for one small step? Pick your next intention in Focus. I am cheering for you.');
	}
	const index = Math.abs(Math.trunc(sequence)) % ENCOURAGEMENT_CARDS.length;
	return personal(state, ENCOURAGEMENT_CARDS[index].text);
}

/** Only new, observed events produce a cheer; restored history never replays. */
export function mascotTransition(previous: CompanionSnapshot | undefined, current: CompanionSnapshot): MascotCue | undefined {
	if (!previous || current.error || current.now < previous.now) { return undefined; }
	const before = previous.state, state = current.state;
	if (state.wins.lastId > before.wins.lastId && state.wins.total > before.wins.total) {
		const finished = before.focus.status === 'running' && state.focus.status === 'finished' && state.focus.notice === null;
		return { text: personal(state, finished ? 'Focus complete. Well done! Take a breath and enjoy that progress.'
			: 'That small win counts. Be proud of your progress!'), celebrate: state.wins.celebrate };
	}
	if (!state.mascot.focusNudges) { return undefined; }
	if (before.focus.status !== 'running' && state.focus.status === 'running') {
		return { text: personal(state, state.focus.phase === 'focus'
			? 'You have started. One small step is enough for now. I am with you.'
			: 'A little rest is part of good work. Enjoy your break.'), celebrate: false };
	}
	if (state.focus.status === 'running' && state.focus.phase === 'focus'
		&& before.focus.startedAt === state.focus.startedAt && previous.progress < .5 && current.progress >= .5) {
		return { text: personal(state, 'Halfway there. Keep your attention on the next small step. You can do this.'), celebrate: false };
	}
	return undefined;
}
