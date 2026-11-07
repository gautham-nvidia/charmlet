import { CALI_WEEK, caliOutfitAt } from './cali-wardrobe';
import type { SmileyPose } from './smiley-renderer';

export type ArtCharacter = 'cali' | 'redwood' | 'yosemite' | 'tahoe' | 'gull' | 'seal'
	| 'golden-gate' | 'santa-cruz' | 'whale' | 'dolphin' | 'condor' | 'eagle';
export const ART_CHARACTERS: readonly ArtCharacter[] = ['cali', 'redwood', 'yosemite', 'tahoe', 'gull',
	'seal', 'golden-gate', 'santa-cruz', 'whale', 'dolphin', 'condor', 'eagle'];
export function isArtCharacter(value: string | undefined): value is ArtCharacter {
	return ART_CHARACTERS.includes(value as ArtCharacter);
}
export type ArtPoint = readonly [number, number];
export interface ArtBounds { x: number; y: number; width: number; height: number; }
export interface ArtEye { x: number; y: number; rx: number; ry: number; }
export interface ArtPart {
	id: string;
	file: string;
	polygon: readonly ArtPoint[];
	role: 'body' | 'head' | 'figure' | 'arm' | 'hand' | 'thumb' | 'wave' | 'wing';
	pivot: ArtPoint;
	side?: -1 | 1;
	eyes?: readonly ArtEye[];
	volume?: { x: number; y: number; rx: number; ry: number; depth: number };
}
export interface ArtDefinition {
	character: ArtCharacter;
	bounds: ArtBounds;
	anchor: ArtPoint;
	attachmentX?: number;
	outfit?: string;
	parts: readonly ArtPart[];
}
export interface ArtPose extends SmileyPose {
	now?: number;
	reactionProgress?: number;
	reducedMotion?: boolean;
}
const CALI_MASTER = CALI_WEEK[2].file;
const CALI_EYES: readonly ArtEye[] = [{ x: 481, y: 151, rx: 14, ry: 10 }, { x: 558, y: 154, rx: 14, ry: 10 }];
const mirror = (point: ArtPoint): ArtPoint => [1024 - point[0], point[1]];
const armOutline: readonly ArtPoint[] = [[365,293],[403,350],[343,491],[302,614],[287,651],
	[190,645],[194,582],[215,524],[222,528],[262,413],[310,334]];
const handOutline: readonly ArtPoint[] = [[190,616],[287,614],[302,719],[270,780],[179,762]];

export function caliArt(now: number): ArtDefinition {
	const outfit = caliOutfitAt(now), file = outfit.file;
	const parts: ArtPart[] = [];
	for (const side of [-1, 1] as const) {
		const transform = side === -1 ? (value: ArtPoint) => value : mirror;
		parts.push({ id: `arm${side}`, file, polygon: armOutline.map(transform), role: 'arm',
			pivot: transform([366,352]), side });
		parts.push({ id: `hand${side}`, file, polygon: handOutline.map(transform), role: 'hand',
			pivot: transform([240,635]), side });
	}
	parts.push({ id: 'legs', file, polygon: [[340,670],[687,670],[716,990],[336,990]],
		role: 'body', pivot: [512,700] });
	parts.push({ id: 'torso', file, polygon: [[357,245],[664,245],[693,442],[687,713],[337,713],[329,454]],
		role: 'body', pivot: [512,470] });
	parts.push({ id: 'head', file: CALI_MASTER, polygon: [[382,65],[654,65],[654,248],[640,292],
		[601,329],[550,358],[473,357],[415,331],[381,287],[369,236]],
		role: 'head', pivot: [512,309], eyes: CALI_EYES });
	for (const side of [-1, 1] as const) {
		parts.push({ id: `thumb${side}`, file: 'live-art-cali-thumbs.png', role: 'thumb',
			polygon: [[759,276],[867,276],[871,419],[854,449],[797,460],[765,434]], pivot: [815,438], side });
		parts.push({ id: `wave${side}`, file: 'live-art-cali-cheer.png', role: 'wave',
			polygon: [[778,227],[924,227],[920,343],[892,379],[840,386],[788,365]],
			pivot: [835,372], side });
	}
	return { character: 'cali', bounds: { x: 193, y: 71, width: 647, height: 905 },
		anchor: [512,101], outfit: outfit.id, parts };
}

export function artBounds(points: readonly ArtPoint[]): ArtBounds {
	const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
	const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
	return { x, y, width: Math.ceil(Math.max(...xs)) - x, height: Math.ceil(Math.max(...ys)) - y };
}

export function artReaction(pose: ArtPose): number {
	if ((!pose.happy && !pose.greeting) || pose.pressed) { return 0; }
	if (pose.reducedMotion) { return 1; }
	const progress = Math.max(0, Math.min(1, pose.reactionProgress ?? .5));
	const ramp = progress < .2 ? progress / .2 : progress > .8 ? (1 - progress) / .2 : 1;
	return ramp * ramp * (3 - 2 * ramp);
}

function rotate(point: ArtPoint, pivot: ArtPoint, angle: number): ArtPoint {
	const x = point[0] - pivot[0], y = point[1] - pivot[1], c = Math.cos(angle), s = Math.sin(angle);
	return [pivot[0] + x * c - y * s, pivot[1] + x * s + y * c];
}
function smooth(value: number) {
	const bounded = Math.max(0, Math.min(1, value));
	return bounded * bounded * (3 - 2 * bounded);
}
function armPose(side: -1 | 1, pose: ArtPose) {
	const amount = side === 1 || pose.happy ? artReaction(pose) : 0;
	const wave = pose.greeting && !pose.reducedMotion ? Math.sin((pose.reactionProgress ?? .5) * Math.PI * 5) * amount : 0;
	return { amount, upper: -side * amount * .12, lower: -side * (amount * 1.95 + wave * .08),
		shoulder: (side === -1 ? [366,352] : [658,352]) as ArtPoint,
		elbow: (side === -1 ? [278,503] : [746,503]) as ArtPoint,
		wrist: (side === -1 ? [240,635] : [784,635]) as ArtPoint };
}
export function partOpacity(part: ArtPart, pose: ArtPose): number {
	const amount = part.side ? armPose(part.side, pose).amount : artReaction(pose);
	if (part.role === 'hand') { return 1 - amount; }
	if (part.role === 'thumb') { return pose.happy && part.side === 1 ? amount : 0; }
	if (part.role === 'wave') { return pose.greeting || pose.happy && part.side === -1 ? amount : 0; }
	return 1;
}

/** Source pixels stay registered across outfits; skin weights bend fabric across the elbow. */
export function artPoint(part: ArtPart, source: ArtPoint, pose: ArtPose): ArtPoint {
	const amount = artReaction(pose);
	if (part.role === 'head' || part.role === 'figure') {
		const [cx, cy] = part.pivot, dx = source[0] - cx, dy = source[1] - cy;
		const volume = part.volume ?? { x: 512, y: 215, rx: 160, ry: 160, depth: 78 };
		const radius = Math.hypot((source[0] - volume.x) / volume.rx, (source[1] - volume.y) / volume.ry);
		const depth = Math.sqrt(Math.max(0, 1 - radius * radius)) * volume.depth;
		const yaw = pose.reducedMotion ? 0 : pose.gazeX * .10;
		const pitch = pose.reducedMotion ? 0 : pose.gazeY * .05;
		const projected: ArtPoint = [cx + dx * Math.cos(yaw) + depth * Math.sin(yaw),
			cy + dy * Math.cos(pitch) - depth * Math.sin(pitch)];
		const greeting = part.role === 'figure'
			? Math.sin((pose.reactionProgress ?? .5) * Math.PI * 3) * amount * .025 + pose.gazeX * .012
			: amount * .025;
		const tilt = pose.reducedMotion ? 0 : pose.pressed ? -.05 : greeting;
		return rotate(projected, part.pivot, tilt);
	}
	if (part.side && ['arm','hand','thumb','wave'].includes(part.role)) {
		const arm = armPose(part.side, pose);
		if (part.role === 'thumb' || part.role === 'wave') {
			const wrist = rotate(rotate(arm.wrist, arm.elbow, arm.lower), arm.shoulder, arm.upper);
			const flip = part.side === -1 ? -1 : 1;
			const point: ArtPoint = [wrist[0] + (source[0] - part.pivot[0]) * flip,
				wrist[1] + source[1] - part.pivot[1]];
			const greetingTilt = pose.greeting && !pose.reducedMotion
				? Math.sin((pose.reactionProgress ?? .5) * Math.PI * 5) * .09 : 0;
			return rotate(point, wrist, greetingTilt);
		}
		const lower = rotate(source, arm.elbow, arm.lower);
		const weight = part.role === 'hand' ? 1 : smooth((source[1] - 450) / 120);
		return rotate([source[0] + (lower[0] - source[0]) * weight,
			source[1] + (lower[1] - source[1]) * weight], arm.shoulder, arm.upper);
	}
	if (part.role === 'wing' && !pose.reducedMotion) {
		return rotate(source, part.pivot, (part.side ?? 1) * amount * .18);
	}
	return source;
}

export function artToStage(definition: Pick<ArtDefinition, 'bounds'>, point: ArtPoint): ArtPoint {
	const bounds = definition.bounds;
	const scale = Math.min(62 / bounds.width, 69 / bounds.height);
	return [36 + (point[0] - bounds.x - bounds.width / 2) * scale, 13 + (point[1] - bounds.y) * scale];
}
