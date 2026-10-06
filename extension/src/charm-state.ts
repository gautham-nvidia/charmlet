import { getCharm, type CharmId } from './charm-catalog';

export interface CharmState {
	version: 1;
	charmId: CharmId;
	cordLength: number;
	size: number;
	hidden: boolean;
	reducedMotion: boolean;
}

export const DEFAULT_STATE: Readonly<CharmState> = Object.freeze({
	version: 1,
	charmId: 'terminal',
	cordLength: 126,
	size: 100,
	hidden: false,
	reducedMotion: false,
});

export function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function restoreState(value: unknown): CharmState {
	if (!value || typeof value !== 'object') {
		return { ...DEFAULT_STATE };
	}
	const candidate = value as Record<string, unknown>;
	return {
		version: 1,
		charmId: getCharm(candidate.charmId).id,
		cordLength: typeof candidate.cordLength === 'number' && Number.isFinite(candidate.cordLength)
			? Math.max(48, candidate.cordLength)
			: DEFAULT_STATE.cordLength,
		size: typeof candidate.size === 'number' && Number.isFinite(candidate.size)
			? clamp(candidate.size, 60, 140)
			: DEFAULT_STATE.size,
		hidden: typeof candidate.hidden === 'boolean' ? candidate.hidden : DEFAULT_STATE.hidden,
		reducedMotion: typeof candidate.reducedMotion === 'boolean'
			? candidate.reducedMotion
			: DEFAULT_STATE.reducedMotion,
	};
}

export function resetState(state: CharmState): CharmState {
	return { ...DEFAULT_STATE, charmId: state.charmId, reducedMotion: state.reducedMotion };
}

export function getLayout(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size) {
	const factor = clamp(size, 60, 140) / 100;
	const minimumWidth = Math.max(96, 96 * factor);
	const minimumHeight = Math.max(144, 60 + 84 * factor);
	const safeWidth = Math.max(minimumWidth, width);
	const safeHeight = Math.max(minimumHeight, height);
	const maximumCord = Math.max(48, safeHeight - 12 - 74 * factor - 10);
	return {
		width: safeWidth,
		height: safeHeight,
		minimumWidth,
		minimumHeight,
		charmWidth: 72 * factor,
		charmHeight: 84 * factor,
		bodyRadius: 34 * factor,
		attachmentOffset: 32 * factor,
		anchorX: safeWidth / 2,
		anchorY: 12,
		cordLength: clamp(cordLength, 48, maximumCord),
		maximumCord,
	};
}