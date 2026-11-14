import builtinCharms from './builtin-charms.json';
import trialCharms from './trial-charms.json';
import { CALIFORNIA_COMPANIONS } from './california-companions';
import { artToStage } from './live-art-core';
import { orderByCollection } from './charm-collections';
import type { CharmAttachment } from './charm-attachment';
export interface CharmDefinition {
	id: string;
	name: string;
	file: string;
	description: string;
	accent: string;
	group: string;
	source?: string;
	attachment?: CharmAttachment;
	artworkKey?: string;
	artworkHash?: string;
}
export const ORIGINAL_CHARMS: readonly CharmDefinition[] = builtinCharms.filter(charm => charm.id === 'terminal');
export const RETIRED_CHARMS: Readonly<Record<string, string>> = Object.freeze({
	chip: 'trial:starter-chip',
	wafer: 'trial:starter-wafer',
	circuit: 'trial:starter-circuit',
	transistor: 'trial:starter-transistor',
	'memory-stack': 'trial:starter-memory-stack',
	'evil-eye': 'trial:starter-evil-eye',
	drishti: 'trial:starter-drishti',
	hamsa: 'trial:starter-hamsa',
	'lemon-chilies': 'trial:starter-lemon-chilies',
	'trial:new-soldering-iron': 'terminal',
	'trial:new-digital-caliper': 'terminal',
	'trial:extra-alpine-lake': 'trial:new-us-san-francisco-skyline',
	'trial:extra-night-sky': 'trial:new-us-austin-skyline',
	'trial:new-ringed-planet': 'trial:new-us-seattle-skyline',
});
export const TRIAL_CHARMS: readonly CharmDefinition[] = trialCharms.filter(charm => !Object.hasOwn(RETIRED_CHARMS, charm.id));
export const LIVE_CHARMS: readonly CharmDefinition[] = [{
	id: 'live:cali', name: 'Cali - Live Mascot', file: 'live-cali.png', group: 'Live Companions', accent: '#dcaa65',
	description: 'A California grizzly with a coder wardrobe, a new outfit each day and a relaxed Friday look. Live glances, waves and thumbs-up; click for encouragement. Focus prompts and celebrations are optional.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:smiley', name: 'Sunny - Live Smiley', file: 'live-smiley.svg', group: 'Live Companions', accent: '#f3cd48',
	description: 'A sunny 3D stress ball with quick glances, blinks and a playful wink. Hold to squish; release to bounce.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:cloud', name: 'Nimbus - Live Cloud', file: 'live-cloud.png', group: 'Live Companions', accent: '#a6ddef',
	description: 'A textured cloud with its own tiny cloud-fold face. Tap for sunrise, rain and a gentle lightning bolt; hold for a little shower.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:robot', name: 'Byte - Live Robot', file: 'live-robot.png', group: 'Live Companions', accent: '#78d8c1',
	description: 'A brushed-metal coding robot with articulated arms and a binary display. Tap for flowing bits, a compile check and a terminal prompt.',
	attachment: { x: .5, y: 2.5 / 84 },
}, ...CALIFORNIA_COMPANIONS.map(companion => ({
	id: `live:${companion.character}`, name: `${companion.name} - Live Companion`,
	file: `live-${companion.character}.png`, group: 'Live Companions', accent: companion.accent,
	description: companion.description,
	attachment: { x: artToStage(companion, companion.anchor)[0] / 72, y: 2.5 / 84 },
}))];
export const FIDGET_CHARMS: readonly CharmDefinition[] = [{
	id: 'fidget:spinner', name: 'Fidget Spinner', file: 'fidget-spinner.svg', group: 'Stress Busters', accent: '#51bfc4',
	description: 'Drag the rotor to turn it, then release to coast. Pull the centre to stretch the cord. Space spins; Shift+Space reverses.',
	attachment: { x: .5, y: 2.5 / 84 },
}, ...([
	['orbit', 'Orbit Spinner', '#aaa2e6', 'A violet orbital ring with three coloured satellites.'],
	['pinwheel', 'Pinwheel Spinner', '#ed829c', 'Five folded, colourful blades with a satin sheen.'],
	['bar', 'Bar Spinner', '#d2b071', 'A balanced brass bar with two polished bearings.'],
] as const).map(([design, name, accent, description]) => ({
	id: `fidget:spinner-${design}`, name, accent, file: `fidget-spinner-${design}.svg`, group: 'Stress Busters',
	description: `${description} Drag the rotor to turn; release to coast. Pull the centre for the cord. Space spins; Shift+Space reverses.`,
	attachment: { x: .5, y: 2.5 / 84 },
})), {
	id: 'fidget:bubbles', name: 'Bubble Pop', file: 'fidget-bubbles.svg', group: 'Stress Busters', accent: '#e7a7ae',
	description: 'Six soft reusable bubbles. Tap a bubble to pop it or press it back out. Space presses the next bubble. Always silent.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'fidget:stone', name: 'Worry Stone', file: 'fidget-stone.svg', group: 'Stress Busters', accent: '#89bba5',
	description: 'A smooth jade-coloured thumb stone. Hold and rub to gently rock it; release to settle. Space holds it still in your hand.',
	attachment: { x: .5, y: 2.5 / 84 },
}, ...([
	['cube', 'Twisty Cube', '#55ad8a', 'A working three-by-three colour cube. Tap to turn the front face; open Play for all six sides, shuffle and undo.'],
	['tiles', 'Sliding Tiles', '#d7b889', 'A little number puzzle. Tap to slide a tile; open Play to arrange one through eight with the gap at the end.'],
	['lights', 'Lights Out', '#e1a952', 'Switch off all nine lights. Each press flips that light and its neighbours. Tap the charm for the centre switch; open Play to solve.'],
] as const).map(([kind, name, accent, description]) => ({
	id: `fidget:${kind}`, name, accent, description, file: `fidget-${kind}.svg`, group: 'Stress Busters',
	attachment: { x: .5, y: 2.5 / 84 },
}))];
export const CHARMS: readonly CharmDefinition[] = orderByCollection([
	...ORIGINAL_CHARMS,
	...LIVE_CHARMS,
	...FIDGET_CHARMS,
	...TRIAL_CHARMS,
]);

/** An identical imported review image keeps its saved ID without adding a second trial tile. */
export function buildCatalogue(custom: readonly CharmDefinition[]): CharmDefinition[] {
	const imported = new Set(custom.flatMap(charm => charm.artworkKey && charm.artworkHash
		? [`${charm.artworkKey}:${charm.artworkHash}`] : []));
	return orderByCollection([
		...CHARMS.filter(charm => !charm.artworkKey || !charm.artworkHash
			|| !imported.has(`${charm.artworkKey}:${charm.artworkHash}`)),
		...custom.map(charm => {
			const current = TRIAL_CHARMS.find(trial => trial.artworkKey === charm.artworkKey);
			return current && current.artworkHash !== charm.artworkHash
				? { ...charm, name: `${charm.name} (Imported)` } : charm;
		}),
	]);
}
export type CharmId = string;
export function getCharm(id: unknown, charms: readonly CharmDefinition[] = CHARMS): CharmDefinition {
	const direct = charms.find(charm => charm.id === id);
	if (direct) { return direct; }
	const replacement = typeof id === 'string' && Object.hasOwn(RETIRED_CHARMS, id) ? RETIRED_CHARMS[id] : id;
	const artworkKey = typeof replacement === 'string' && replacement.startsWith('trial:') ? replacement.slice(6) : undefined;
	return charms.find(charm => charm.id === replacement)
		?? (artworkKey ? charms.find(charm => charm.artworkKey === artworkKey) : undefined)
		?? CHARMS[0];
}

const SOFT_CHARM_KEYS = new Set([
	'stress-ball', 'squishy-star',
	'smiley-happy', 'smiley-determined', 'smiley-calm', 'smiley-wink',
	'emoji-heart', 'emoji-thumbs-up', 'emoji-rocket', 'smiley', 'cloud',
]);

export function isSoftCharm(id: string): boolean {
	const key = id.split(':').at(-1)?.replace(/^new-/, '');
	return key !== undefined && SOFT_CHARM_KEYS.has(key);
}
