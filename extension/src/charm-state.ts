import { CHARMS, getCharm, RETIRED_CHARMS, type CharmDefinition, type CharmId } from './charm-catalog';
import { MESSAGES } from './messages';
import { DEFAULT_ATTACHMENT, type CharmAttachment } from './charm-attachment';
import { restoreCordChoices, type CordChoices } from './cord-design';

export type LayoutMode = 'hanging' | 'orbit';

export interface CharmState {
	version: 1;
	charmId: CharmId;
	layoutMode: LayoutMode;
	showMessages: boolean;
	rotateMessages: boolean;
	messageIndex: number;
	cordLength: number;
	cordChoices: CordChoices;
	size: number;
	hidden: boolean;
	reducedMotion: boolean;
	festiveEnabled: boolean;
	charmPinned: boolean;
}

export const DEFAULT_STATE: Readonly<CharmState> = Object.freeze({
	version: 1,
	charmId: 'terminal',
	layoutMode: 'hanging',
	showMessages: true,
	rotateMessages: true,
	messageIndex: 0,
	cordLength: 126,
	cordChoices: Object.freeze({}),
	size: 100,
	hidden: false,
	reducedMotion: false,
	festiveEnabled: true,
	charmPinned: false,
});

export function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function restoreState(value: unknown, charms: readonly CharmDefinition[] = CHARMS): CharmState {
	if (!value || typeof value !== 'object') {
		return { ...DEFAULT_STATE };
	}
	const candidate = value as Record<string, unknown>;
	const selected = getCharm(candidate.charmId, charms);
	return {
		version: 1,
		charmId: selected.id,
		layoutMode: candidate.layoutMode === 'orbit' ? 'orbit' : 'hanging',
		showMessages: typeof candidate.showMessages === 'boolean' ? candidate.showMessages : DEFAULT_STATE.showMessages,
		rotateMessages: typeof candidate.rotateMessages === 'boolean' ? candidate.rotateMessages : DEFAULT_STATE.rotateMessages,
		messageIndex: typeof candidate.messageIndex === 'number' && Number.isInteger(candidate.messageIndex)
			&& candidate.messageIndex >= 0 && candidate.messageIndex < MESSAGES.length ? candidate.messageIndex : 0,
		cordLength: typeof candidate.cordLength === 'number' && Number.isFinite(candidate.cordLength)
			? Math.max(48, candidate.cordLength)
			: DEFAULT_STATE.cordLength,
		cordChoices: restoreCordChoices(candidate.cordChoices, charms),
		size: typeof candidate.size === 'number' && Number.isFinite(candidate.size)
			? clamp(candidate.size, 60, 140)
			: DEFAULT_STATE.size,
		hidden: typeof candidate.hidden === 'boolean' ? candidate.hidden : DEFAULT_STATE.hidden,
		reducedMotion: typeof candidate.reducedMotion === 'boolean'
			? candidate.reducedMotion
			: DEFAULT_STATE.reducedMotion,
		festiveEnabled: typeof candidate.festiveEnabled === 'boolean' ? candidate.festiveEnabled : DEFAULT_STATE.festiveEnabled,
		// Older profiles have no pin setting. Treat their saved choice as pinned.
		charmPinned: typeof candidate.charmPinned === 'boolean' ? candidate.charmPinned
			: typeof candidate.charmId === 'string' && (selected.id === candidate.charmId
				|| Object.hasOwn(RETIRED_CHARMS, candidate.charmId)
				|| (candidate.charmId.startsWith('trial:') && selected.artworkKey === candidate.charmId.slice(6))),
	};
}

export function matchesSavedState(expected: CharmState, actual: unknown): boolean {
	if (!actual || typeof actual !== 'object' || Array.isArray(actual)) { return false; }
	const stored = actual as Record<string, unknown>;
	const choices = stored.cordChoices;
	if (!choices || typeof choices !== 'object' || Array.isArray(choices)
		|| Object.keys(choices).length !== Object.keys(expected.cordChoices).length
		|| !Object.entries(expected.cordChoices).every(([id, style]) => Object.hasOwn(choices, id)
			&& (choices as Record<string, unknown>)[id] === style)) { return false; }
	return Object.entries(expected).every(([key, value]) => key === 'cordChoices' || Object.is(stored[key], value));
}

export function resetState(state: CharmState): CharmState {
	return {
		...DEFAULT_STATE,
		charmId: state.charmId,
		reducedMotion: state.reducedMotion,
		layoutMode: state.layoutMode,
		showMessages: state.showMessages,
		rotateMessages: state.rotateMessages,
		messageIndex: state.messageIndex,
		festiveEnabled: state.festiveEnabled,
		charmPinned: state.charmPinned,
		cordChoices: state.cordChoices,
	};
}

export function getLayout(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size, mode: LayoutMode = DEFAULT_STATE.layoutMode, attachment: CharmAttachment = DEFAULT_ATTACHMENT) {
	const factor = clamp(size, 60, 140) / 100;
	const charmWidth = 72 * factor;
	const charmHeight = 84 * factor;
	const attachmentX = (attachment.x * 72 - 36) * factor;
	const attachmentOffset = (42 - attachment.y * 84) * factor;
	const visualRadius = Math.hypot(charmWidth, charmHeight) / 2;
	const edgePadding = 8;
	const minimumDragCord = Math.max(16, 16 * factor);
	const orbitRadius = attachmentOffset + minimumDragCord;
	const anchorY = mode === 'orbit' ? visualRadius + orbitRadius + edgePadding : 12;
	const minimumWidth = mode === 'orbit' ? Math.max(144, 2 * anchorY) : Math.max(144, 2 * (visualRadius + edgePadding) + 40);
	const pullAllowance = 32;
	const minimumCord = Math.max(48, visualRadius + edgePadding - anchorY - attachmentOffset);
	const minimumHeight = anchorY + minimumCord + attachmentOffset + visualRadius + edgePadding + pullAllowance;
	const safeWidth = Math.max(minimumWidth, width);
	const safeHeight = Math.max(minimumHeight, height);
	const maximumDragCord = Math.max(minimumCord + pullAllowance, safeHeight - anchorY - attachmentOffset - visualRadius - edgePadding);
	const maximumCord = Math.max(minimumCord, maximumDragCord - pullAllowance);
	return {
		width: safeWidth, height: safeHeight, minimumWidth, minimumHeight,
		charmWidth, charmHeight, bodyRadius: 34 * factor, attachmentOffset, attachmentX,
		visualRadius, edgePadding, minimumDragCord, orbitRadius, mode, pullAllowance,
		maximumDragCord, anchorX: safeWidth / 2, anchorY,
		cordLength: clamp(cordLength, minimumCord, maximumCord), minimumCord, maximumCord,
	};
}