import { isArtCharacter, type ArtCharacter } from './live-art-core';

export type LiveCharacter = 'sunny' | 'cloud' | 'robot' | ArtCharacter;
export type FidgetKind = 'spinner' | 'bubbles' | 'stone';

export function liveCharacter(id: string): LiveCharacter | undefined {
	const character = id.startsWith('live:') ? id.slice(5) : undefined;
	if (isArtCharacter(character)) { return character; }
	switch (id) {
		case 'live:smiley': return 'sunny';
		case 'live:cloud': return 'cloud';
		case 'live:robot': return 'robot';
		default: return undefined;
	}
}

export function fidgetKind(id: string): FidgetKind | undefined {
	switch (id) {
		case 'fidget:spinner': return 'spinner';
		case 'fidget:bubbles': return 'bubbles';
		case 'fidget:stone': return 'stone';
		default: return undefined;
	}
}

export function fidgetAction(id: string): string | undefined {
	switch (fidgetKind(id)) {
		case 'spinner': return 'Spin';
		case 'bubbles': return 'Press bubbles on';
		case 'stone': return 'Hold or rub';
		default: return undefined;
	}
}

/** Time-based response reaches 95% of a new gaze in 84ms at any frame rate. */
export function followGaze(current: number, target: number, elapsedMs: number): number {
	const next = target + (current - target) * Math.exp(-Math.max(0, elapsedMs) / 28);
	return Math.abs(next - target) < .002 ? target : next;
}

/** Integrate friction analytically so spinning does not depend on display refresh rate. */
export function stepSpinner(angle: number, velocity: number, elapsedMs: number) {
	const seconds = Math.max(0, Math.min(100, elapsedMs)) / 1000;
	const decay = Math.exp(-1.65 * seconds);
	const nextAngle = (angle + velocity * (1 - decay) / 1.65) % (Math.PI * 2);
	const nextVelocity = velocity * decay;
	return { angle: nextAngle, velocity: Math.abs(nextVelocity) < .08 ? 0 : nextVelocity };
}

export const BUBBLES = [
	{ x: 22, y: 33 }, { x: 50, y: 33 },
	{ x: 22, y: 50 }, { x: 50, y: 50 },
	{ x: 22, y: 67 }, { x: 50, y: 67 },
] as const;

export function nearestBubble(x: number, y: number): number {
	let closest = 0, distance = Infinity;
	for (const [index, bubble] of BUBBLES.entries()) {
		const candidate = Math.hypot(x - bubble.x, y - bubble.y);
		if (candidate < distance) { closest = index; distance = candidate; }
	}
	return closest;
}
