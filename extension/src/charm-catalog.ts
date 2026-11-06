import builtinCharms from './builtin-charms.json';
import trialCharms from './trial-charms.json';
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
	id: 'live:smiley', name: 'Sunny - Live Smiley', file: 'live-smiley.svg', group: 'Stress Busters', accent: '#f3cd48',
	description: 'A little yellow face that looks your way, blinks and reacts. Hold to squish; release to bounce. Reduced Motion keeps it still.',
	attachment: { x: .5, y: 2.5 / 84 },
}];
export const CHARMS: readonly CharmDefinition[] = [
	...ORIGINAL_CHARMS,
	...TRIAL_CHARMS,
	...LIVE_CHARMS,
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
	'emoji-heart', 'emoji-thumbs-up', 'emoji-rocket', 'smiley',
]);

export function isSoftCharm(id: string): boolean {
	const key = id.split(':').at(-1)?.replace(/^new-/, '');
	return key !== undefined && SOFT_CHARM_KEYS.has(key);
}
