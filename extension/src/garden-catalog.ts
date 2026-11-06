import { TRIAL_CHARMS, type CharmDefinition } from './charm-catalog';
import { FLOWERS, type FlowerId, type GardenStage, type GardenState } from './garden-core';

export const GARDEN_STAGE_FILES: Readonly<Record<Exclude<GardenStage, 'bloom'>, string>> = {
	seed: 'garden-seed-r1.png', sprout: 'garden-sprout-r1.png',
	leaves: 'garden-leaves-r2.png', bud: 'garden-bud-r2.png',
};

export function gardenArtwork(id: FlowerId): CharmDefinition {
	const artwork = TRIAL_CHARMS.find(charm => charm.artworkKey === `flower-${id}`);
	if (!artwork) { throw new Error(`Missing garden artwork: ${id}`); }
	return artwork;
}

export function gardenCharms(garden: GardenState): readonly CharmDefinition[] {
	return garden.collection.flatMap(owned => {
		const flower = FLOWERS.find(candidate => candidate.id === owned.id);
		return flower ? [{
			...gardenArtwork(flower.id),
			id: `garden:${flower.id}`, name: flower.name,
			description: `A ${flower.name.toLowerCase()} grown in your eleven-watering garden.`,
			accent: flower.accent, group: 'Grown by you',
		}] : [];
	});
}
