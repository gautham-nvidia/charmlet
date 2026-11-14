import { isArtCharacter, type ArtCharacter } from './live-art-core';
import { puzzleKind, type PuzzleKind } from './puzzle-core';

export type LiveCharacter = 'sunny' | 'cloud' | 'robot' | ArtCharacter;
export type FidgetKind = 'spinner' | 'bubbles' | 'stone' | PuzzleKind;
export type SpinnerDesign = 'classic' | 'orbit' | 'pinwheel' | 'bar';

export function spinnerDesign(id: string): SpinnerDesign | undefined {
	switch (id) {
		case 'fidget:spinner': return 'classic';
		case 'fidget:spinner-orbit': return 'orbit';
		case 'fidget:spinner-pinwheel': return 'pinwheel';
		case 'fidget:spinner-bar': return 'bar';
		default: return undefined;
	}
}

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
	if (spinnerDesign(id)) { return 'spinner'; }
	const puzzle = puzzleKind(id);
	if (puzzle) { return puzzle; }
	switch (id) {
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
		case 'cube': return 'Turn';
		case 'tiles': return 'Slide';
		case 'lights': return 'Switch';
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

/** Cross the atan2 seam without reversing a drag; bound speed for a controlled release. */
export function turnSpinner(angle: number, previousPointerAngle: number, pointerAngle: number, elapsedMs: number) {
	const delta = Math.atan2(Math.sin(pointerAngle - previousPointerAngle), Math.cos(pointerAngle - previousPointerAngle));
	return { angle: (angle + delta) % (Math.PI * 2),
		velocity: Math.max(-34, Math.min(34, delta * 1000 / Math.max(8, elapsedMs))) };
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
