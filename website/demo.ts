import { Pendulum, type Point } from '../extension/src/pendulum';
import { getLayout } from '../extension/src/charm-state';

interface DemoCharm { id: string; name: string; preview: string; }

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
let scale = 1;
let frameId: number | undefined;
let previousTime = 0;
let accumulatedTime = 0;
let frames = 0;
let visible = true;
let intersecting = true;
let drag: { id: number; startX: number; startY: number; moved: boolean } | undefined;

function canAnimate() {
	return visible && intersecting && !reducedMotion.matches;
}

function render() {
	const { anchorX, anchorY, cordLength, attachmentOffset } = pendulum.layout;
	const { x, y } = pendulum.position;
	const angle = pendulum.angle;
	const hookX = x + Math.sin(angle) * attachmentOffset;
	const hookY = y - Math.cos(angle) * attachmentOffset;
	charm.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
	anchor.style.left = `${anchorX}px`;
	anchor.style.top = `${anchorY}px`;
	thread.setAttribute('d', `M ${anchorX} ${anchorY} Q ${anchorX + (hookX - anchorX) * 0.45} ${(anchorY + hookY) / 2} ${hookX} ${hookY}`);
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
	if (frameId === undefined && pendulum.moving && canAnimate()) {
		stage.dataset.running = 'true';
		frameId = requestAnimationFrame(tick);
	}
}

function resize() {
	clearPointer();
	const { width, height } = stage.getBoundingClientRect();
	const layout = getLayout(width, height, 126, 100, 'hanging');
	scale = Math.max(0.01, Math.min(1, width / layout.minimumWidth, height / layout.minimumHeight));
	pendulum.resize(width / scale, height / scale, 126, 100, 'hanging');
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

function nudge() {
	if (reducedMotion.matches) {
		hint.textContent = 'Reduced motion is active. Dragging still follows your pointer.';
		return;
	}
	pendulum.nudge(-1);
	hint.textContent = 'A little swing. Drag the charm to stretch the cord.';
	start();
}

charm.addEventListener('pointerdown', event => {
	if (event.button !== 0 || drag) { return; }
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
	if (!moved && !reducedMotion.matches) { nudge(); }
});
charm.addEventListener('pointercancel', () => resetPose('The demo reset safely after an interrupted drag.'));
charm.addEventListener('lostpointercapture', () => { if (drag) { resetPose('The demo reset safely after losing the pointer.'); } });
charm.addEventListener('click', event => { if (event.detail === 0) { nudge(); } });
window.addEventListener('blur', () => resetPose('The demo reset when the window lost focus.'));
nudgeButton.addEventListener('click', nudge);
resetButton.addEventListener('click', () => resetPose('Demo reset.'));
document.addEventListener('visibilitychange', () => {
	visible = !document.hidden;
	if (!visible) { resetPose('The demo paused while this page was hidden.'); }
});
reducedMotion.addEventListener('change', () => resetPose(reducedMotion.matches
	? 'Reduced motion is active. Dragging still follows your pointer.' : 'Drag the charm, then let it settle.'));
new IntersectionObserver(entries => {
	intersecting = entries[0]?.isIntersecting === true;
	if (!intersecting) { resetPose('The demo reset while it was offscreen.'); }
}).observe(stage);
new ResizeObserver(resize).observe(stage);

export function setCharm(selected: DemoCharm) {
	if (!selected || typeof selected.id !== 'string' || typeof selected.name !== 'string' || typeof selected.preview !== 'string') { return; }
	const preview = new URL(selected.preview, document.baseURI);
	const assets = new URL('./assets/', document.baseURI);
	if (preview.origin !== location.origin || !preview.pathname.startsWith(assets.pathname)) { return; }
	image.src = preview.href;
	image.alt = `${selected.name} charm`;
	name.textContent = selected.name;
	charm.setAttribute('aria-label', `Swing ${selected.name} charm`);
	resetPose(`${selected.name} is ready to try.`);
}

resize();
stage.dataset.ready = 'true';
render();
