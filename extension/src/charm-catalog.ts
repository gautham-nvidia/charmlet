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
export const ORIGINAL_CHARMS: readonly CharmDefinition[] = builtinCharms;
export const TRIAL_CHARMS: readonly CharmDefinition[] = trialCharms;
export const CHARMS: readonly CharmDefinition[] = [
	...builtinCharms.filter(charm => charm.id === 'terminal'),
	...TRIAL_CHARMS,
	...builtinCharms.filter(charm => charm.id !== 'terminal').map(charm => ({
		...charm, name: `Original ${charm.name}`, group: 'Originals',
	})),
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
	return charms.find(charm => charm.id === id) ?? CHARMS[0];
}

const SOFT_CHARM_KEYS = new Set([
	'stress-ball', 'squishy-star',
	'smiley-happy', 'smiley-determined', 'smiley-calm', 'smiley-wink',
	'emoji-heart', 'emoji-thumbs-up', 'emoji-rocket',
]);

export function isSoftCharm(id: string): boolean {
	const key = id.split(':').at(-1)?.replace(/^new-/, '');
	return key !== undefined && SOFT_CHARM_KEYS.has(key);
}
