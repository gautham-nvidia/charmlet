import type { CharmDefinition } from './charm-catalog';
import { FLOWERS, type GardenState } from './garden-core';

export function gardenCharms(garden: GardenState): readonly CharmDefinition[] {
	return garden.collection.flatMap(owned => {
		const flower = FLOWERS.find(candidate => candidate.id === owned.id);
		return flower ? [{
			id: `garden:${flower.id}`, name: flower.name, file: `garden-${flower.id}.svg`,
			description: `An original ${flower.name.toLowerCase()} from your eleven-watering garden.`,
			accent: flower.accent, group: 'Grown by you',
		}] : [];
	});
}
