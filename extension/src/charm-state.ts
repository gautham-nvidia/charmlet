export interface CharmState {
	version: 1;
	cordLength: number;
	hidden: boolean;
	reducedMotion: boolean;
}

export const DEFAULT_STATE: Readonly<CharmState> = Object.freeze({
	version: 1,
	cordLength: 126,
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
		cordLength: typeof candidate.cordLength === 'number' && Number.isFinite(candidate.cordLength)
			? clamp(candidate.cordLength, 48, 320)
			: DEFAULT_STATE.cordLength,
		hidden: typeof candidate.hidden === 'boolean' ? candidate.hidden : DEFAULT_STATE.hidden,
		reducedMotion: typeof candidate.reducedMotion === 'boolean'
			? candidate.reducedMotion
			: DEFAULT_STATE.reducedMotion,
	};
}

export function getLayout(width: number, height: number, cordLength: number) {
	const safeWidth = Math.max(96, width);
	const safeHeight = Math.max(144, height);
	const maximumCord = Math.max(48, Math.min(320, safeHeight - 96));
	return {
		width: safeWidth,
		height: safeHeight,
		anchorX: Math.max(48, safeWidth - 68),
		anchorY: 12,
		cordLength: clamp(cordLength, 48, maximumCord),
		maximumCord,
	};
}