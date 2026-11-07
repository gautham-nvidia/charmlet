import builtinCharms from './builtin-charms.json';
import trialCharms from './trial-charms.json';
import { CALIFORNIA_COMPANIONS } from './california-companions';
import { artToStage } from './live-art-core';
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
});
export const TRIAL_CHARMS: readonly CharmDefinition[] = trialCharms;
export const LIVE_CHARMS: readonly CharmDefinition[] = [{
	id: 'live:cali', name: 'Cali - Live Mascot', file: 'live-cali.png', group: 'Live Companions', accent: '#dcaa65',
	description: 'A California grizzly with a coder wardrobe, a new outfit each day and a relaxed Friday look. Live glances, waves and thumbs-up; click for encouragement. Focus prompts and celebrations are optional.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:smiley', name: 'Sunny - Live Smiley', file: 'live-smiley.svg', group: 'Live Companions', accent: '#f3cd48',
	description: 'A sunny 3D stress ball with quick glances, blinks and a playful wink. Hold to squish; release to bounce.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:cloud', name: 'Nimbus - Live Cloud', file: 'live-cloud.svg', group: 'Live Companions', accent: '#a6ddef',
	description: 'A soft little 3D cloud. It looks your way, brightens when greeted and puffs its cheeks when squeezed.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'live:robot', name: 'Byte - Live Robot', file: 'live-robot.svg', group: 'Live Companions', accent: '#78d8c1',
	description: 'A rounded metal robot with lively mint eyes. Tap for a wink; record a win for a happy reaction.',
	attachment: { x: .5, y: 2.5 / 84 },
}, ...CALIFORNIA_COMPANIONS.map(companion => ({
	id: `live:${companion.character}`, name: `${companion.name} - Live Companion`,
	file: `live-${companion.character}.png`, group: 'Live Companions', accent: companion.accent,
	description: companion.description,
	attachment: { x: artToStage(companion, companion.anchor)[0] / 72, y: 2.5 / 84 },
}))];
export const FIDGET_CHARMS: readonly CharmDefinition[] = [{
	id: 'fidget:spinner', name: 'Fidget Spinner', file: 'fidget-spinner.svg', group: 'Stress Busters', accent: '#51bfc4',
	description: 'Tap or flick the three-lobed spinner; its rotor spins and slows to a stop. Space spins it too. Silent, with no scores.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'fidget:bubbles', name: 'Bubble Pop', file: 'fidget-bubbles.svg', group: 'Stress Busters', accent: '#e7a7ae',
	description: 'Six soft reusable bubbles. Tap a bubble to pop it or press it back out. Space presses the next bubble. Always silent.',
	attachment: { x: .5, y: 2.5 / 84 },
}, {
	id: 'fidget:stone', name: 'Worry Stone', file: 'fidget-stone.svg', group: 'Stress Busters', accent: '#89bba5',
	description: 'A smooth jade-coloured thumb stone. Hold and rub to gently rock it; release to settle. Space holds it still in your hand.',
	attachment: { x: .5, y: 2.5 / 84 },
}];
export const CHARMS: readonly CharmDefinition[] = [
	...ORIGINAL_CHARMS,
	...TRIAL_CHARMS,
	...LIVE_CHARMS,
	...FIDGET_CHARMS,
];

/** An identical imported review image keeps its saved ID without adding a second trial tile. */
export function buildCatalogue(custom: readonly CharmDefinition[]): CharmDefinition[] {
	const imported = new Set(custom.flatMap(charm => charm.artworkKey && charm.artworkHash
		? [`${charm.artworkKey}:${charm.artworkHash}`] : []));
	return [
		...CHARMS.filter(charm => !charm.artworkKey || !charm.artworkHash
			|| !imported.has(`${charm.artworkKey}:${charm.artworkHash}`)),
		...custom.map(charm => {
			const current = TRIAL_CHARMS.find(trial => trial.artworkKey === charm.artworkKey);
			return current && current.artworkHash !== charm.artworkHash
				? { ...charm, name: `${charm.name} (Imported)` } : charm;
		}),
	];
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
