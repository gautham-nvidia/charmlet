import { createElement, X } from 'lucide';
import {
	CUBE_COLORS, CUBE_COLOR_NAMES, CUBE_FACES, CUBE_FACE_NAMES, DEFAULT_PUZZLES, matchesPuzzles,
	neighboringTiles, puzzleKind, puzzleSolved, shufflePuzzle, slideTile, toggleLight, turnCube,
	type CubeFace, type PuzzleKind, type PuzzleState,
} from './puzzle-core';
import { createFidgetRenderer } from './fidget-renderer';

interface PuzzleViewOptions {
	panel: HTMLElement;
	toggle: HTMLButtonElement;
	getState(): PuzzleState;
	change(state: PuzzleState): void;
	onOpen(): void;
	onChange(): void;
}
export interface PuzzleView {
	update(id: string, ready: boolean): void;
	tap(): void;
	open(): void;
	close(restoreFocus?: boolean): void;
	isOpen(): boolean;
}
const TITLES: Record<PuzzleKind, string> = { cube: 'Twisty Cube', tiles: 'Sliding Tiles', lights: 'Lights Out' };
const HINTS: Record<PuzzleKind, string> = {
	cube: 'Match the colours on every face. Each turn is clockwise as you look at that face.',
	tiles: 'Arrange 1 to 8, with the gap last. Click a neighbouring tile, or use arrow keys to move the gap.',
	lights: 'Turn every light off. Each press flips that light and its neighbours above, below, left and right.',
};
const TILE_STEPS = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: -1, ArrowRight: 1 } as const;

export function createPuzzleView(options: PuzzleViewOptions): PuzzleView {
	const { panel, toggle } = options;
	panel.innerHTML = `<header class="popup-heading"><div><h2 id="puzzle-title">A little puzzle</h2><p>No timer. Take your time.</p></div>
		<button id="puzzle-close" type="button" class="popup-close" aria-label="Close puzzle"></button></header>
		<div class="puzzle-body">
		<p id="puzzle-hint"></p>
		<div id="puzzle-board"></div>
		<div class="puzzle-actions"><button id="puzzle-shuffle" type="button">Shuffle</button><button id="puzzle-undo" type="button">Undo</button>
		<button id="puzzle-reset" type="button">Reset</button></div>
		<p id="puzzle-status" role="status" aria-live="polite"></p>
		</div>`;
	const get = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
	const board = get('puzzle-board'), status = get('puzzle-status');
	const closeButton = get<HTMLButtonElement>('puzzle-close');
	const shuffle = get<HTMLButtonElement>('puzzle-shuffle'), undo = get<HTMLButtonElement>('puzzle-undo');
	closeButton.append(createElement(X, { width: 14, height: 14, 'aria-hidden': 'true' }));
	let kind: PuzzleKind | undefined;
	let ready = false;
	let reverse = false;
	let opener: HTMLElement | undefined;
	let draw: ReturnType<typeof createFidgetRenderer>;
	let renderedState: PuzzleState | undefined;
	const history: Record<PuzzleKind, PuzzleState[]> = { cube: [], tiles: [], lights: [] };

	function change(next: PuzzleState) {
		if (!ready || !kind || matchesPuzzles(options.getState(), next)) { return; }
		history[kind].push(options.getState());
		if (history[kind].length > 60) { history[kind].shift(); }
		options.change(next); render();
	}
	function turn(face: CubeFace) {
		const state = options.getState();
		change({ ...state, cube: turnCube(state.cube, face, reverse ? -1 : 1) });
	}
	function buildBoard() {
		draw = undefined;
		if (!kind) { board.replaceChildren(); return; }
		board.className = `puzzle-${kind}`;
		get('puzzle-title').textContent = TITLES[kind];
		get('puzzle-hint').textContent = HINTS[kind];
		if (kind === 'cube') {
			board.innerHTML = `<canvas class="puzzle-cube-preview" width="216" height="252" aria-hidden="true"></canvas>
				<div class="cube-net">${CUBE_FACES.map((face, index) => `<section class="cube-face" data-face="${face}"><h3>${CUBE_FACE_NAMES[face]}</h3>
				<div class="cube-stickers" role="img">${Array.from({ length: 9 }, (_, cell) => `<span data-sticker="${index * 9 + cell}" aria-hidden="true"></span>`).join('')}</div></section>`).join('')}</div>
				<label class="puzzle-direction"><input id="puzzle-reverse" type="checkbox"> Counterclockwise turns</label>
				<div class="cube-turns">${CUBE_FACES.map(face => `<button type="button" data-turn="${face}">${CUBE_FACE_NAMES[face]}</button>`).join('')}</div>`;
			const direction = get<HTMLInputElement>('puzzle-reverse');
			direction.checked = reverse;
			direction.addEventListener('change', () => { reverse = direction.checked; render(); });
			draw = createFidgetRenderer(board.querySelector('canvas')!);
			for (const button of board.querySelectorAll<HTMLButtonElement>('[data-turn]')) {
				button.addEventListener('click', () => turn(button.dataset.turn as CubeFace));
			}
		} else {
			board.replaceChildren();
			for (let cell = 0; cell < 9; cell++) {
				const button = document.createElement('button');
				button.type = 'button'; button.dataset.cell = String(cell);
				button.addEventListener('click', () => {
					const state = options.getState();
					if (kind === 'tiles') { change({ ...state, tiles: slideTile(state.tiles, cell) }); }
					else if (kind === 'lights') { change({ ...state, lights: toggleLight(state.lights, cell) }); }
				});
				board.append(button);
			}
		}
	}
	function render() {
		if (!kind || panel.hidden) { return; }
		const state = options.getState(), solved = puzzleSolved(kind, state);
		renderedState = state;
		panel.dataset.kind = kind; panel.dataset.solved = String(solved);
		const message = solved ? 'All set. Shuffle when you fancy another puzzle.' : 'One move at a time. Undo is here if you need it.';
		if (status.textContent !== message) { status.textContent = message; }
		shuffle.disabled = !ready; undo.disabled = !ready || history[kind].length === 0;
		get<HTMLButtonElement>('puzzle-reset').disabled = !ready;
		if (kind === 'cube') {
			draw?.({ kind, puzzles: state, angle: 0, rock: 0, pressed: false, bubbles: [] });
			for (const sticker of board.querySelectorAll<HTMLElement>('[data-sticker]')) {
				const color = state.cube[Number(sticker.dataset.sticker)];
				sticker.style.backgroundColor = CUBE_COLORS[color];
				sticker.textContent = CUBE_COLOR_NAMES[color][0];
				sticker.dataset.color = CUBE_COLOR_NAMES[color].toLowerCase();
			}
			for (const face of board.querySelectorAll<HTMLElement>('[data-face]')) {
				const index = CUBE_FACES.indexOf(face.dataset.face as CubeFace);
				face.querySelector('.cube-stickers')!.setAttribute('aria-label',
					`${CUBE_FACE_NAMES[face.dataset.face as CubeFace]} face: ${state.cube.slice(index * 9, index * 9 + 9).map(color => CUBE_COLOR_NAMES[color]).join(', ')}`);
			}
			for (const button of board.querySelectorAll<HTMLButtonElement>('[data-turn]')) {
				button.disabled = !ready;
				button.setAttribute('aria-label', `Turn ${CUBE_FACE_NAMES[button.dataset.turn as CubeFace].toLowerCase()} ${reverse ? 'counterclockwise' : 'clockwise'}`);
			}
		} else {
			const neighbors = neighboringTiles(state.tiles);
			for (const button of board.querySelectorAll<HTMLButtonElement>('[data-cell]')) {
				const cell = Number(button.dataset.cell);
				if (kind === 'tiles') {
					const tile = state.tiles[cell];
					button.textContent = tile ? String(tile) : '';
					button.dataset.empty = String(tile === 0);
					button.setAttribute('aria-label', tile ? `Move tile ${tile}` : 'Empty space. Arrow keys move the gap.');
					// Keep the focused square reachable after it becomes the gap.
					button.setAttribute('aria-disabled', String(!ready || !neighbors.includes(cell)));
				} else {
					const on = Boolean(state.lights & (1 << cell));
					button.textContent = on ? 'On' : 'Off';
					button.setAttribute('aria-pressed', String(on));
					button.setAttribute('aria-label', `Light row ${Math.floor(cell / 3) + 1}, column ${cell % 3 + 1}`);
					button.disabled = !ready;
				}
			}
		}
	}
	function close(restoreFocus = true) {
		if (panel.hidden) { return; }
		if (panel instanceof HTMLDialogElement && panel.open) { panel.close(); }
		panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
		options.onChange();
		if (restoreFocus) { (opener?.isConnected && !opener.hidden ? opener : toggle).focus({ preventScroll: true }); }
	}
	function open() {
		if (!kind || !ready) { return; }
		opener = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
		options.onOpen(); panel.hidden = false;
		if (panel instanceof HTMLDialogElement && !panel.open) { panel.showModal(); }
		toggle.setAttribute('aria-expanded', 'true');
		render(); shuffle.focus({ preventScroll: true }); options.onChange();
	}
	toggle.addEventListener('click', () => panel.hidden ? open() : close());
	closeButton.addEventListener('click', () => close());
	panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
	shuffle.addEventListener('click', () => { if (kind) { change(shufflePuzzle(kind, options.getState())); } });
	get('puzzle-reset').addEventListener('click', () => {
		if (kind) { change({ ...options.getState(), [kind]: DEFAULT_PUZZLES[kind] }); }
	});
	undo.addEventListener('click', () => {
		if (!kind || !ready) { return; }
		const previous = history[kind].pop();
		if (previous) { options.change({ ...options.getState(), [kind]: previous[kind] }); render(); }
	});
	document.addEventListener('keydown', event => {
		if (panel.hidden) { return; }
		if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
		if (event.key === 'Tab') {
			const controls = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')];
			const first = controls[0], last = controls.at(-1);
			if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
				event.preventDefault(); last?.focus();
			} else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
				event.preventDefault(); first?.focus();
			}
		}
		if (kind === 'tiles' && board.contains(document.activeElement) && Object.hasOwn(TILE_STEPS, event.key)) {
			event.preventDefault();
			const state = options.getState();
			const step = TILE_STEPS[event.key as keyof typeof TILE_STEPS];
			change({ ...state, tiles: slideTile(state.tiles, state.tiles.indexOf(0) + step) });
		}
	}, true);
	return {
		open, close, isOpen: () => !panel.hidden,
		update(id, enabled) {
			const next = puzzleKind(id);
			const changed = kind !== next || ready !== enabled;
			if (kind !== next) { close(false); kind = next; buildBoard(); }
			ready = enabled; toggle.hidden = !kind; toggle.disabled = !ready;
			toggle.closest('nav')?.classList.toggle('has-puzzle', Boolean(kind));
			if (changed || renderedState !== options.getState()) { render(); }
		},
		tap() {
			if (!kind || !ready || !panel.hidden) { return; }
			const state = options.getState();
			if (kind === 'cube') { change({ ...state, cube: turnCube(state.cube, 'F') }); }
			else if (kind === 'tiles') { change({ ...state, tiles: slideTile(state.tiles, neighboringTiles(state.tiles)[0]) }); }
			else { change({ ...state, lights: toggleLight(state.lights, 4) }); }
		},
	};
}
