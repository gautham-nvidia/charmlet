import { artToStage, type ArtBounds, type ArtCharacter, type ArtDefinition, type ArtEye, type ArtPoint } from './live-art-core';

interface CaliforniaCompanion {
	character: Exclude<ArtCharacter, 'cali'>;
	name: string;
	description: string;
	accent: string;
	bounds: ArtBounds;
	anchor: ArtPoint;
	eyes: readonly ArtEye[];
}

/** Source coordinates refer to the registered 1024px artwork, before its bundled 512px export. */
export const CALIFORNIA_COMPANIONS: readonly CaliforniaCompanion[] = [
	{ character: 'redwood', name: 'Coast Redwood', accent: '#a8794d',
		description: 'A complete coast redwood with textured bark, evergreen needles and a gentle woodland face.',
		bounds: { x: 310, y: 44, width: 389, height: 914 }, anchor: [510,46],
		eyes: [{ x: 500, y: 642, rx: 10, ry: 8 }, { x: 535, y: 643, rx: 10, ry: 8 }] },
	{ character: 'yosemite', name: 'Yosemite', accent: '#b6b4a1',
		description: 'A granite Half Dome companion with pines, a little waterfall and a calm, encouraging face.',
		bounds: { x: 124, y: 140, width: 788, height: 765 }, anchor: [517,141],
		eyes: [{ x: 620, y: 665, rx: 20, ry: 15 }, { x: 773, y: 659, rx: 20, ry: 15 }] },
	{ character: 'tahoe', name: 'Lake Tahoe', accent: '#54c5d8',
		description: 'Snowy Sierra peaks, dark pines and a clear turquoise lake, with quiet live glances.',
		bounds: { x: 188, y: 216, width: 613, height: 631 }, anchor: [511,219],
		eyes: [{ x: 555, y: 639, rx: 15, ry: 12 }, { x: 658, y: 626, rx: 15, ry: 12 }] },
	{ character: 'gull', name: 'Western Gull', accent: '#d5dce1',
		description: 'A bright coastal gull with layered feathers, a rust neckerchief and an inquisitive gaze.',
		bounds: { x: 95, y: 137, width: 788, height: 801 }, anchor: [539,139],
		eyes: [{ x: 501, y: 214, rx: 14, ry: 13 }, { x: 600, y: 181, rx: 9, ry: 13 }] },
	{ character: 'seal', name: 'Harbor Seal', accent: '#a6bec4',
		description: 'A whiskered harbor seal with a spotted coat, soft eyes and gentle greetings.',
		bounds: { x: 78, y: 168, width: 870, height: 770 }, anchor: [698,173],
		eyes: [{ x: 676, y: 260, rx: 26, ry: 22 }, { x: 801, y: 254, rx: 26, ry: 22 }] },
	{ character: 'golden-gate', name: 'Golden Gate', accent: '#e87e55',
		description: 'An International Orange bridge tower above coastal fog, with a gentle live sway.',
		bounds: { x: 241, y: 106, width: 571, height: 796 }, anchor: [549,109], eyes: [] },
	{ character: 'santa-cruz', name: 'Santa Cruz Otter', accent: '#bf936c',
		description: 'A sea otter with detailed coastal fur, a turquoise bandana and a relaxed Santa Cruz spirit.',
		bounds: { x: 120, y: 105, width: 746, height: 837 }, anchor: [512,106],
		eyes: [{ x: 446, y: 202, rx: 20, ry: 17 }, { x: 567, y: 174, rx: 20, ry: 17 }] },
	{ character: 'whale', name: 'Pacific Gray Whale', accent: '#81b9d0',
		description: 'A textured gray whale with a raised fluke, barnacles and a friendly little glance.',
		bounds: { x: 72, y: 115, width: 860, height: 743 }, anchor: [899,116],
		eyes: [{ x: 468, y: 614, rx: 20, ry: 15 }] },
	{ character: 'dolphin', name: 'Pacific Dolphin', accent: '#91ccdb',
		description: 'A sleek coastal dolphin with a curved silhouette and quick, playful glances.',
		bounds: { x: 140, y: 93, width: 780, height: 861 }, anchor: [530,94],
		eyes: [{ x: 561, y: 219, rx: 15, ry: 10 }] },
	{ character: 'condor', name: 'California Condor', accent: '#ca997b',
		description: 'A California condor with layered dark feathers, a natural bare head and an attentive gaze.',
		bounds: { x: 194, y: 87, width: 635, height: 879 }, anchor: [582,88],
		eyes: [{ x: 602, y: 140, rx: 18, ry: 15 }] },
	{ character: 'eagle', name: 'Golden Eagle', accent: '#c59b63',
		description: 'A golden eagle with a warm feathered crown, a strong beak and watchful eyes.',
		bounds: { x: 159, y: 84, width: 709, height: 871 }, anchor: [656,87],
		eyes: [{ x: 655, y: 141, rx: 13, ry: 10 }, { x: 745, y: 159, rx: 12, ry: 10 }] },
];

export function regionalArt(character: ArtCharacter): ArtDefinition | undefined {
	const companion = CALIFORNIA_COMPANIONS.find(value => value.character === character);
	if (!companion) { return undefined; }
	const { bounds, anchor, eyes } = companion;
	return {
		character, bounds, anchor, attachmentX: artToStage(companion, anchor)[0],
		parts: [{
			id: 'figure', file: `live-art-${character}.png`, role: 'figure', pivot: anchor, eyes,
			polygon: [[bounds.x-3,bounds.y-3],[bounds.x+bounds.width+3,bounds.y-3],
				[bounds.x+bounds.width+3,bounds.y+bounds.height+3],[bounds.x-3,bounds.y+bounds.height+3]],
			volume: { x: bounds.x+bounds.width/2, y: bounds.y+bounds.height/2,
				rx: bounds.width/2, ry: bounds.height/2, depth: Math.min(bounds.width,bounds.height)*.12 },
		}],
	};
}
