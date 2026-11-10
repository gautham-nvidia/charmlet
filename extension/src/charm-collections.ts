import type { CharmDefinition } from './charm-catalog';

export const COLLECTION_ORDER: readonly string[] = [
	'Terminal', 'Live 3D', 'Stress Busters', 'Music', 'Music Icons', 'California', 'Pets & Wildlife',
	'Tech & Lab', 'Nature & Places', 'Space & Stars', 'Zodiac', 'Gemstones',
	'Culture & Traditions', 'Sports', 'Celebrations', 'Flowers', 'Grown by you',
];
const GROUP_COLLECTIONS: Readonly<Record<string, string>> = {
	'Live Companions': 'Live 3D',
	Animals: 'Pets & Wildlife',
	AI: 'Tech & Lab',
	Coding: 'Tech & Lab',
	'Compute & Silicon': 'Tech & Lab',
	'Test Bench': 'Tech & Lab',
	Cities: 'Nature & Places',
	'National Parks': 'Nature & Places',
	'Trees & Forests': 'Nature & Places',
	'Solar System': 'Space & Stars',
	'Stars & Galaxies': 'Space & Stars',
	'Local Culture': 'Culture & Traditions',
	'Sacred Traditions': 'Culture & Traditions',
	'Luck & Little Joys': 'Culture & Traditions',
	Seasonal: 'Celebrations',
	'Garden Flowers': 'Flowers',
};
const CALIFORNIA_ARTWORK = new Set([
	'extra-foggy-bay', 'extra-bridge-lights', 'extra-city-tram', 'extra-campus-path',
	'extra-coffee-street', 'extra-mountain-sun', 'extra-granite-dome', 'extra-redwood-grove',
	'new-palace-fine-arts', 'new-coastal-cypress', 'new-salesforce-tower', 'new-cupertino-loop',
]);
type CollectionCharm = Pick<CharmDefinition, 'id' | 'group' | 'artworkKey'>;

/** Keep saved IDs and imported metadata intact while presenting coherent themed packs. */
export function charmCollection(charm: CollectionCharm): string {
	if (charm.id === 'terminal') { return 'Terminal'; }
	if (charm.id.startsWith('live:')) { return 'Live 3D'; }
	if (CALIFORNIA_ARTWORK.has(charm.artworkKey ?? charm.id.replace(/^trial:/, ''))) { return 'California'; }
	return Object.hasOwn(GROUP_COLLECTIONS, charm.group) ? GROUP_COLLECTIONS[charm.group] : charm.group;
}

export function orderByCollection<T extends CollectionCharm>(charms: readonly T[]): T[] {
	const order = new Map(COLLECTION_ORDER.map((name, index) => [name, index]));
	for (const charm of charms) {
		const name = charmCollection(charm);
		if (!order.has(name)) { order.set(name, order.size); }
	}
	// Stable sorting retains the curated order within a pack and the user's import order.
	return [...charms].sort((a, b) => order.get(charmCollection(a))! - order.get(charmCollection(b))!);
}
