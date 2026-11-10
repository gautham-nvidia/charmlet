import { Pendulum, type Point } from '../extension/src/pendulum';
import { getLayout } from '../extension/src/charm-state';
import { DEFAULT_ATTACHMENT, type CharmAttachment } from '../extension/src/charm-attachment';
import { isSoftCharm } from '../extension/src/charm-catalog';
import { createLiveSmiley } from '../extension/src/live-smiley';
import { createFidgetView } from '../extension/src/fidget-view';
import { fidgetAction } from '../extension/src/interactive-motion';
import { createTapWiggle } from '../extension/src/tap-wiggle';
import { createCordView } from '../extension/src/cord-view';
import { cordForCharm, type CordStyle } from '../extension/src/cord-design';
import { DEFAULT_PUZZLES, puzzleKind, type PuzzleState } from '../extension/src/puzzle-core';
import { createPuzzleView } from '../extension/src/puzzle-view';

interface DemoCharm { id: string; name: string; preview: string; group?: string; attachment?: CharmAttachment; }

function required<Kind extends Element>(id: string): Kind {
	const value = document.getElementById(id);
	if (!value) { throw new Error(`Missing demo element: ${id}`); }
	return value as unknown as Kind;
}

const stage = required<HTMLDivElement>('demo-stage');
const rig = required<HTMLDivElement>('demo-rig');
const thread = required<SVGPathElement>('demo-thread');
const anchor = required<HTMLSpanElement>('demo-anchor');
const charm = required<HTMLButtonElement>('demo-charm');
const image = required<HTMLImageElement>('demo-image');
const name = required<HTMLSpanElement>('demo-name');
const hint = required<HTMLParagraphElement>('demo-hint');
const nudgeButton = required<HTMLButtonElement>('demo-nudge');
const resetButton = required<HTMLButtonElement>('demo-reset');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pendulum = new Pendulum(280, 320, 126, 100, 'hanging');
const liveSmiley = createLiveSmiley(charm, image, file => new URL(`assets/default/${file}`, document.baseURI).href);
const fidgetUI = createFidgetView(charm, image, {
	rotate: held => { if (held) { tapWiggle.stop(); stop(); } else { start(); } },
	tap: () => tap(),
});
const tapWiggle = createTapWiggle(charm);
const cordView = createCordView(thread.ownerSVGElement!, thread);
let selectedId = '';
let cordStyle: CordStyle = 'thread';
let scale = 1;
let frameId: number | undefined;
let previousTime = 0;
let accumulatedTime = 0;
let frames = 0;
let visible = true;
let intersecting = true;
let drag: { id: number; startX: number; startY: number; moved: boolean } | undefined;
let attachment: CharmAttachment = DEFAULT_ATTACHMENT;
let keyboardHeld = false;
let puzzles: PuzzleState = DEFAULT_PUZZLES;
const puzzleUI = createPuzzleView({
	panel: required<HTMLElement>('puzzle-editor'), toggle: required<HTMLButtonElement>('demo-puzzle'),
	getState: () => puzzles,
	change: next => { puzzles = next; render(); },
	onOpen: () => resetPose(), onChange: () => render(),
});

function canAnimate() {
	return visible && intersecting && !reducedMotion.matches && !puzzleUI.isOpen();
}

function render() {
	tapWiggle.update(canAnimate());
	const { anchorX, anchorY, cordLength, attachmentOffset, attachmentX } = pendulum.layout;
	const { x, y } = pendulum.position;
	const angle = pendulum.angle;
	const hookX = x + Math.cos(angle) * attachmentX + Math.sin(angle) * attachmentOffset;
	const hookY = y + Math.sin(angle) * attachmentX - Math.cos(angle) * attachmentOffset;
	charm.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
	anchor.style.left = `${anchorX}px`;
	anchor.style.top = `${anchorY}px`;
	cordView.render(cordStyle, { x: anchorX, y: anchorY }, { x: hookX, y: hookY });
	liveSmiley.update(selectedId, visible && intersecting, reducedMotion.matches);
	fidgetUI.update(selectedId, visible && intersecting, reducedMotion.matches, puzzles);
	puzzleUI.update(selectedId, true);
	stage.dataset.frames = String(frames);
	stage.dataset.cord = String(Math.round(cordLength));
	stage.dataset.dragging = String(drag !== undefined);
}

function stop() {
	if (frameId !== undefined) { cancelAnimationFrame(frameId); }
	frameId = undefined;
	previousTime = 0;
	accumulatedTime = 0;
	stage.dataset.running = 'false';
}

function tick(time: number) {
	if (!canAnimate()) { stop(); return; }
	accumulatedTime += previousTime ? Math.min(50, time - previousTime) : 1000 / 60;
	previousTime = time;
	while (accumulatedTime >= 1000 / 60) {
		pendulum.step();
		accumulatedTime -= 1000 / 60;
	}
	frames++;
	render();
	if (pendulum.moving) { frameId = requestAnimationFrame(tick); } else { stop(); }
}

function start() {
	if (charm.dataset.rotorHeld === 'true') { return; }
	if (frameId === undefined && pendulum.moving && canAnimate()) {
		stage.dataset.running = 'true';
		frameId = requestAnimationFrame(tick);
	}
}

function resize() {
	clearPointer();
	const { width, height } = stage.getBoundingClientRect();
	const layout = getLayout(width, height, 126, 100, 'hanging', attachment);
	scale = Math.max(0.01, Math.min(1, width / layout.minimumWidth, height / layout.minimumHeight));
	pendulum.resize(width / scale, height / scale, 126, 100, 'hanging', attachment);
	rig.style.width = `${pendulum.layout.width}px`;
	rig.style.height = `${pendulum.layout.height}px`;
	rig.style.transform = `scale(${scale})`;
	rig.style.setProperty('--demo-charm-width', `${pendulum.layout.charmWidth}px`);
	rig.style.setProperty('--demo-charm-height', `${pendulum.layout.charmHeight}px`);
	stop();
	render();
}

function point(event: PointerEvent): Point {
	const bounds = stage.getBoundingClientRect();
	return { x: (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / scale };
}

function clearPointer() {
	tapWiggle.stop();
	keyboardHeld = false;
	charm.dataset.keyboardHeld = 'false';
	const pointerId = drag?.id;
	drag = undefined;
	charm.classList.remove('dragging');
	stage.dataset.dragging = 'false';
	if (pointerId !== undefined && charm.hasPointerCapture(pointerId)) { charm.releasePointerCapture(pointerId); }
	pendulum.release();
}

function resetPose(message = 'Drag the charm, then let it settle.') {
	clearPointer();
	pendulum.returnToLength(126, true);
	pendulum.settle();
	stop();
	render();
	hint.textContent = message;
}

function releaseDrag() {
	pendulum.returnToLength(126, reducedMotion.matches);
	hint.textContent = 'Drag the charm, then let it settle.';
	if (reducedMotion.matches) { pendulum.settle(); stop(); render(); } else { start(); }
}

function nudge(strength = 1) {
	if (reducedMotion.matches) {
		hint.textContent = 'Reduced motion is active. Dragging still follows your pointer.';
		return;
	}
	pendulum.nudge(-strength);
	hint.textContent = 'A little swing. Drag the charm to stretch the cord.';
	start();
}

function tap() {
	nudge(.45);
	liveSmiley.playful();
	puzzleUI.tap();
	tapWiggle.play();
}

charm.addEventListener('pointerdown', event => {
	if (event.defaultPrevented || event.button !== 0 || drag) { return; }
	tapWiggle.stop();
	drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
	pendulum.grab(point(event));
	charm.setPointerCapture(event.pointerId);
	charm.classList.add('dragging');
	hint.textContent = 'Pull gently, then release.';
	render();
});
charm.addEventListener('pointermove', event => {
	if (!drag || drag.id !== event.pointerId) { return; }
	if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) { drag.moved = true; }
	pendulum.drag(point(event), reducedMotion.matches);
	if (!reducedMotion.matches) { start(); }
	render();
});
charm.addEventListener('pointerup', event => {
	if (!drag || drag.id !== event.pointerId) { return; }
	const moved = drag.moved;
	clearPointer();
	releaseDrag();
	if (!moved) { tap(); }
});
charm.addEventListener('pointercancel', () => resetPose('The demo reset safely after an interrupted drag.'));
charm.addEventListener('lostpointercapture', () => { if (drag) { resetPose('The demo reset safely after losing the pointer.'); } });
charm.addEventListener('click', event => { if (event.detail === 0) { tap(); } });
charm.addEventListener('keydown', event => {
	if (event.key === ' ' || event.key === 'Enter') {
		event.preventDefault();
		tapWiggle.stop();
		keyboardHeld = true;
		charm.dataset.keyboardHeld = 'true';
	}
});
charm.addEventListener('keyup', event => {
	if ((event.key === ' ' || event.key === 'Enter') && keyboardHeld) {
		event.preventDefault();
		keyboardHeld = false;
		charm.dataset.keyboardHeld = 'false';
		tap();
	}
});
charm.addEventListener('blur', () => { keyboardHeld = false; charm.dataset.keyboardHeld = 'false'; });
window.addEventListener('blur', () => resetPose());
nudgeButton.addEventListener('click', () => nudge());
resetButton.addEventListener('click', () => resetPose('Demo reset.'));
document.addEventListener('visibilitychange', () => {
	visible = !document.hidden;
	if (!visible) { resetPose(); }
	else { render(); }
});
reducedMotion.addEventListener('change', () => resetPose(reducedMotion.matches
	? 'Reduced motion is active. Dragging still follows your pointer.' : 'Drag the charm, then let it settle.'));
new IntersectionObserver(entries => {
	// A quick catalogue-to-demo scroll can queue both exit and entry together.
	intersecting = entries[entries.length - 1]?.isIntersecting === true;
	if (!intersecting) { resetPose(); }
	else { render(); }
}).observe(stage);
new ResizeObserver(resize).observe(stage);

export function setCharm(selected: DemoCharm) {
	if (!selected || typeof selected.id !== 'string' || typeof selected.name !== 'string' || typeof selected.preview !== 'string') { return; }
	const preview = new URL(selected.preview, document.baseURI);
	const assets = new URL('./assets/', document.baseURI);
	if (preview.origin !== location.origin || !preview.pathname.startsWith(assets.pathname)) { return; }
	image.src = preview.href;
	selectedId = selected.id;
	cordStyle = cordForCharm({ id: selected.id, name: selected.name, group: selected.group ?? '', file: '', description: '', accent: '' });
	attachment = selected.attachment ?? DEFAULT_ATTACHMENT;
	image.style.transformOrigin = `${attachment.x * 100}% ${attachment.y * 100}%`;
	charm.dataset.soft = String(isSoftCharm(selected.id));
	image.alt = `${selected.name} charm`;
	name.textContent = selected.name;
	charm.setAttribute('aria-label', `${fidgetAction(selected.id) ?? 'Swing'} ${selected.name} charm`);
	charm.title = selected.name;
	resize();
	resetPose(puzzleKind(selected.id) ? `${selected.name}: tap for a move, or open Play puzzle for the full board.` : `${selected.name} is ready to try.`);
}

resize();
stage.dataset.ready = 'true';
render();
