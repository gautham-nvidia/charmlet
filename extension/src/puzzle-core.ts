export type PuzzleKind = 'cube' | 'tiles' | 'lights';
export const CUBE_FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type CubeFace = typeof CUBE_FACES[number];
export const CUBE_FACE_NAMES: Readonly<Record<CubeFace, string>> = {
	U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back',
};
export const CUBE_COLORS = ['#eeeae0', '#dd605c', '#55ad8a', '#edcb65', '#e79b59', '#6299d0'] as const;
export const CUBE_COLOR_NAMES = ['White', 'Red', 'Green', 'Yellow', 'Orange', 'Blue'] as const;
export interface PuzzleState {
	readonly cube: readonly number[];
	readonly tiles: readonly number[];
	readonly lights: number;
}
export const DEFAULT_PUZZLES: PuzzleState = Object.freeze({
	cube: Object.freeze(Array.from({ length: 54 }, (_, index) => Math.floor(index / 9))),
	tiles: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 0]),
	lights: 0,
});

export function puzzleKind(id: string): PuzzleKind | undefined {
	switch (id) {
		case 'fidget:cube': return 'cube';
		case 'fidget:tiles': return 'tiles';
		case 'fidget:lights': return 'lights';
		default: return undefined;
	}
}

type Vector = readonly [number, number, number];
const FACE_AXES: Readonly<Record<CubeFace, { axis: 0 | 1 | 2; sign: number; normal: Vector }>> = {
	U: { axis: 1, sign: 1, normal: [0, 1, 0] }, R: { axis: 0, sign: 1, normal: [1, 0, 0] },
	F: { axis: 2, sign: 1, normal: [0, 0, 1] }, D: { axis: 1, sign: -1, normal: [0, -1, 0] },
	L: { axis: 0, sign: -1, normal: [-1, 0, 0] }, B: { axis: 2, sign: -1, normal: [0, 0, -1] },
};
function stickerPosition(face: CubeFace, row: number, column: number): Vector {
	switch (face) {
		case 'U': return [column - 1, 1, row - 1];
		case 'R': return [1, 1 - row, 1 - column];
		case 'F': return [column - 1, 1 - row, 1];
		case 'D': return [column - 1, -1, 1 - row];
		case 'L': return [-1, 1 - row, column - 1];
		case 'B': return [1 - column, 1 - row, -1];
	}
}
const STICKERS = CUBE_FACES.flatMap(face => Array.from({ length: 9 }, (_, index) => ({
	position: stickerPosition(face, Math.floor(index / 3), index % 3), normal: FACE_AXES[face].normal,
})));
const stickerKey = (position: Vector, normal: Vector) => [...position, ...normal].join(',');
const STICKER_INDEX = new Map(STICKERS.map((sticker, index) => [stickerKey(sticker.position, sticker.normal), index]));

function rotateVector(vector: Vector, axis: number, sign: number): Vector {
	const rotated: [number, number, number] = [...vector];
	const first = (axis + 1) % 3, second = (axis + 2) % 3;
	rotated[first] = -sign * vector[second];
	rotated[second] = sign * vector[first];
	return rotated;
}

/** Rotate a whole physical layer: positions and sticker normals move together. */
export function turnCube(cube: readonly number[], face: CubeFace, direction: 1 | -1 = 1): readonly number[] {
	const result = [...cube], { axis, sign } = FACE_AXES[face];
	for (const [index, sticker] of STICKERS.entries()) {
		if (sticker.position[axis] !== sign) { continue; }
		const position = rotateVector(sticker.position, axis, -sign * direction);
		const normal = rotateVector(sticker.normal, axis, -sign * direction);
		const destination = STICKER_INDEX.get(stickerKey(position, normal));
		if (destination === undefined) { throw new Error('Cube rotation left its physical lattice.'); }
		result[destination] = cube[index];
	}
	return result;
}

export function neighboringTiles(tiles: readonly number[]): number[] {
	const blank = tiles.indexOf(0);
	return [blank - 3, blank + 3, blank - 1, blank + 1].filter(index => index >= 0 && index < 9
		&& Math.abs(Math.floor(index / 3) - Math.floor(blank / 3)) + Math.abs(index % 3 - blank % 3) === 1);
}
export function slideTile(tiles: readonly number[], index: number): readonly number[] {
	if (!neighboringTiles(tiles).includes(index)) { return tiles; }
	const result = [...tiles], blank = tiles.indexOf(0);
	[result[index], result[blank]] = [result[blank], result[index]];
	return result;
}
export function toggleLight(lights: number, index: number): number {
	if (!Number.isInteger(index) || index < 0 || index > 8) { return lights; }
	for (let cell = 0; cell < 9; cell++) {
		if (Math.abs(Math.floor(cell / 3) - Math.floor(index / 3)) + Math.abs(cell % 3 - index % 3) <= 1) {
			lights ^= 1 << cell;
		}
	}
	return lights;
}
function slideParity(tiles: readonly number[]): number {
	let inversions = 0;
	for (let left = 0; left < 9; left++) {
		for (let right = left + 1; right < 9; right++) {
			if (tiles[left] && tiles[right] && tiles[left] > tiles[right]) { inversions++; }
		}
	}
	return inversions % 2;
}
export function restorePuzzles(value: unknown): PuzzleState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return DEFAULT_PUZZLES; }
	const candidate = value as Record<string, unknown>;
	const cube = candidate.cube;
	const validCube = Array.isArray(cube) && cube.length === 54
		&& cube.every(color => Number.isInteger(color) && color >= 0 && color < 6)
		&& CUBE_FACES.every((_, color) => cube[color * 9 + 4] === color && cube.filter(value => value === color).length === 9);
	const tiles = candidate.tiles;
	const validTiles = Array.isArray(tiles) && tiles.length === 9
		&& [...tiles].every(tile => Number.isInteger(tile) && tile >= 0 && tile <= 8)
		&& new Set(tiles).size === 9 && slideParity(tiles) === 0;
	return {
		cube: validCube ? [...cube] : DEFAULT_PUZZLES.cube,
		tiles: validTiles ? [...tiles] : DEFAULT_PUZZLES.tiles,
		lights: typeof candidate.lights === 'number' && Number.isInteger(candidate.lights)
			&& candidate.lights >= 0 && candidate.lights < 512 ? candidate.lights : 0,
	};
}
export function matchesPuzzles(expected: PuzzleState, value: unknown): boolean {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return false; }
	const actual = value as Record<string, unknown>;
	return Object.keys(actual).length === 3 && actual.lights === expected.lights
		&& [expected.cube, expected.tiles].every((board, index) => {
			const saved = actual[index === 0 ? 'cube' : 'tiles'];
			return Array.isArray(saved) && saved.length === board.length && board.every((value, cell) => value === saved[cell]);
		});
}
export function puzzleSolved(kind: PuzzleKind, state: PuzzleState): boolean {
	if (kind === 'lights') { return state.lights === 0; }
	if (kind === 'tiles') { return state.tiles.every((tile, index) => tile === DEFAULT_PUZZLES.tiles[index]); }
	return state.cube.every((color, index) => color === state.cube[Math.floor(index / 9) * 9 + 4]);
}
function pick(length: number, random: () => number): number {
	const choice = random();
	if (!Number.isFinite(choice) || choice < 0 || choice >= 1) { throw new RangeError('A puzzle random choice must be between zero and one.'); }
	return Math.floor(choice * length);
}
export function shufflePuzzle(kind: PuzzleKind, state: PuzzleState, random = Math.random): PuzzleState {
	if (kind === 'cube') {
		let cube = DEFAULT_PUZZLES.cube, previous: CubeFace | undefined;
		for (let turn = 0; turn < 24; turn++) {
			const faces = CUBE_FACES.filter(face => face !== previous);
			const face = faces[pick(faces.length, random)];
			cube = turnCube(cube, face, pick(2, random) ? 1 : -1);
			previous = face;
		}
		const shuffled = { ...state, cube };
		return puzzleSolved(kind, shuffled) ? { ...state, cube: turnCube(cube, 'F') } : shuffled;
	}
	if (kind === 'tiles') {
		let tiles = DEFAULT_PUZZLES.tiles, previous = -1;
		for (let step = 0; step < 80; step++) {
			const choices = neighboringTiles(tiles).filter(index => index !== previous);
			const blank = tiles.indexOf(0);
			tiles = slideTile(tiles, choices[pick(choices.length, random)]);
			previous = blank;
		}
		const shuffled = { ...state, tiles };
		return puzzleSolved(kind, shuffled) ? { ...state, tiles: slideTile(tiles, neighboringTiles(tiles)[0]) } : shuffled;
	}
	const presses = 1 + pick(511, random);
	let lights = 0;
	for (let cell = 0; cell < 9; cell++) { if (presses & (1 << cell)) { lights = toggleLight(lights, cell); } }
	return { ...state, lights: lights || toggleLight(0, 4) };
}
