import { isSoftCharm, RETIRED_CHARMS, type CharmDefinition } from './charm-catalog';

export const CORD_STYLES = {
	thread: 'Simple thread',
	soft: 'Soft cord',
	braid: 'Braided cord',
	leather: 'Leather cord',
	ribbon: 'Satin ribbon',
	'silver-chain': 'Silver chain',
	'gold-chain': 'Gold chain',
	'ball-chain': 'Ball chain',
} as const;
export type CordStyle = keyof typeof CORD_STYLES;
export type CordChoices = Readonly<Record<string, CordStyle>>;
const CALIFORNIA_CORDS: Readonly<Record<string, CordStyle>> = {
	'live:cali': 'braid', 'live:redwood': 'leather', 'live:yosemite': 'leather', 'live:tahoe': 'silver-chain',
	'live:gull': 'soft', 'live:seal': 'soft', 'live:golden-gate': 'ball-chain', 'live:santa-cruz': 'braid',
	'live:whale': 'soft', 'live:dolphin': 'soft', 'live:condor': 'leather', 'live:eagle': 'leather',
};

export function isCordStyle(value: unknown): value is CordStyle {
	return typeof value === 'string' && Object.hasOwn(CORD_STYLES, value);
}

export function restoreCordChoices(value: unknown, charms: readonly CharmDefinition[]): CordChoices {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return {}; }
	const raw = value as Record<string, unknown>;
	const entries: Array<[string, CordStyle]> = [];
	for (const charm of charms) {
		if (entries.length >= 512) { break; }
		const artworkId = charm.artworkKey ? `trial:${charm.artworkKey}` : charm.id;
		const retired = Object.entries(RETIRED_CHARMS).filter(([, current]) => current === artworkId).map(([id]) => id);
		const key = [charm.id, artworkId, ...retired].find(id => Object.hasOwn(raw, id) && isCordStyle(raw[id]));
		if (key) { entries.push([charm.id, raw[key] as CordStyle]); }
	}
	return Object.fromEntries(entries);
}

export function cordForCharm(charm: CharmDefinition, choices: CordChoices = {}): CordStyle {
	if (Object.hasOwn(choices, charm.id) && isCordStyle(choices[charm.id])) { return choices[charm.id]; }
	if (Object.hasOwn(CALIFORNIA_CORDS, charm.id)) { return CALIFORNIA_CORDS[charm.id]; }
	if (isSoftCharm(charm.id) || charm.group === 'Stress Busters') { return 'soft'; }
	switch (charm.group) {
		case 'Live Companions':
			return 'silver-chain';
		case 'Gemstones':
		case 'Personal Keepsakes':
		case 'My Photos':
			return 'gold-chain';
		case 'Sacred Traditions':
		case 'Local Culture':
		case 'Luck & Little Joys':
			return 'braid';
		case 'Compute & Silicon':
		case 'Test Bench':
		case 'AI':
			return 'ball-chain';
		case 'Garden Flowers':
		case 'Grown by you':
		case 'Seasonal':
		case 'Celebrations':
			return 'ribbon';
		case 'Music':
			return /acoustic|ukulele|violin/.test(charm.id) ? 'leather' : 'silver-chain';
		case 'California':
			return /granite|mountain|cypress/.test(charm.id) ? 'leather' : 'silver-chain';
		case 'Solar System':
		case 'Stars & Galaxies':
		case 'Zodiac':
			return 'silver-chain';
		case 'Animals':
		case 'Trees & Forests':
		case 'National Parks':
		case 'Sports':
			return 'leather';
		default:
			return 'thread';
	}
}

export interface CordPoint { x: number; y: number; }
const number = (value: number) => value.toFixed(2);

function cordControl(anchor: CordPoint, hook: CordPoint, bend: number): CordPoint {
	const dx = hook.x - anchor.x, dy = hook.y - anchor.y;
	const distance = Math.hypot(dx, dy) || 1;
	const limit = Math.min(64, distance * .3);
	const offset = Number.isFinite(bend) ? Math.max(-limit, Math.min(limit, bend)) : 0;
	return { x: anchor.x + dx * .45 - dy / distance * offset, y: (anchor.y + hook.y) / 2 + dx / distance * offset };
}

export function cordPath(anchor: CordPoint, hook: CordPoint, bend = 0): string {
	const control = cordControl(anchor, hook, bend);
	return `M ${anchor.x} ${anchor.y} Q ${control.x} ${control.y} ${hook.x} ${hook.y}`;
}

/** Bounded link geometry follows the same quadratic curve as the attachment path. */
export function chainLinks(anchor: CordPoint, hook: CordPoint, balls = false, bend = 0): string {
	const dx = hook.x - anchor.x, dy = hook.y - anchor.y;
	const distance = Math.hypot(dx, dy);
	if (!Number.isFinite(distance) || distance < 8) { return ''; }
	const count = Math.min(180, Math.floor(distance / (balls ? 6 : 5)));
	const { x: controlX, y: controlY } = cordControl(anchor, hook, bend);
	const paths: string[] = [];
	for (let index = 1; index < count; index++) {
		const t = index / count, u = 1 - t;
		const x = u * u * anchor.x + 2 * u * t * controlX + t * t * hook.x;
		const y = u * u * anchor.y + 2 * u * t * controlY + t * t * hook.y;
		const tx = u * (controlX - anchor.x) + t * (hook.x - controlX);
		const ty = u * (controlY - anchor.y) + t * (hook.y - controlY);
		const length = Math.hypot(tx, ty) || 1;
		const radius = balls ? 1.6 : index % 2 ? 1.65 : .8;
		const nx = -ty / length * radius, ny = tx / length * radius;
		const rotation = Math.atan2(ty, tx) * 180 / Math.PI - 90;
		const a = `${number(x + nx)} ${number(y + ny)}`, b = `${number(x - nx)} ${number(y - ny)}`;
		const arc = `${radius} ${balls ? radius : 2.8} ${number(rotation)} 0 1`;
		paths.push(`M ${a} A ${arc} ${b} A ${arc} ${a}`);
	}
	return paths.join(' ');
}
