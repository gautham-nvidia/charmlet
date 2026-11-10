import type { ArtDefinition, ArtPoint } from './live-art-core';

const cloudFile = 'live-art-cloud.png';
const cloudPlane: readonly ArtPoint[] = [[86,180],[931,180],[931,1024],[86,1024]];
export const NIMBUS_ART: ArtDefinition = {
	character: 'cloud', bounds: { x: 86, y: 180, width: 845, height: 656 }, anchor: [554,184],
	parts: [
		{ id: 'sunrise', file: cloudFile, role: 'body', effect: 'weather-back', pivot: [512,500], polygon: cloudPlane },
		{ id: 'cloud', file: cloudFile, role: 'figure', pivot: [512,500],
			polygon: [[80,170],[940,170],[940,845],[80,845]],
			eyes: [{ x: 550, y: 461, rx: 16, ry: 8 }, { x: 667, y: 460, rx: 16, ry: 9 }],
			volume: { x: 512, y: 500, rx: 420, ry: 330, depth: 110 } },
		{ id: 'weather', file: cloudFile, role: 'body', effect: 'weather-front', pivot: [512,500], polygon: cloudPlane },
	],
};
const robotFile = 'live-art-robot.png';
const leftArm: readonly ArtPoint[] = [[185,425],[346,425],[355,562],[328,653],[320,767],[315,900],[185,900]];
export const BYTE_ART: ArtDefinition = {
	character: 'robot', bounds: { x: 176, y: 53, width: 672, height: 920 }, anchor: [512,55],
	parts: [
		{ id: 'left-servo', file: robotFile, role: 'servo', side: -1, pivot: [295,500], polygon: leftArm },
		{ id: 'right-servo', file: robotFile, role: 'servo', side: 1, pivot: [729,500],
			polygon: leftArm.map(([x,y]) => [1024-x,y] as ArtPoint) },
		{ id: 'legs', file: robotFile, role: 'body', pivot: [512,700],
			polygon: [[330,645],[699,645],[708,990],[330,990]] },
		{ id: 'torso', file: robotFile, role: 'body', pivot: [512,500],
			polygon: [[345,369],[676,369],[682,653],[603,680],[600,755],[424,755],[422,684],[344,654]] },
		{ id: 'head', file: robotFile, role: 'head', pivot: [512,370],
			polygon: [[165,45],[859,45],[859,375],[165,375]],
			volume: { x: 512, y: 210, rx: 350, ry: 170, depth: 65 },
			display: { x: 264, y: 151, width: 497, height: 155 } },
	],
};

export function weatherCodeArt(character: string): ArtDefinition | undefined {
	return character === 'cloud' ? NIMBUS_ART : character === 'robot' ? BYTE_ART : undefined;
}
