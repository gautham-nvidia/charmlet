import { createElement, ArrowDown, Eye, EyeOff, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide';
import { resetState, clamp, getLayout, restoreState, type CharmState } from './charm-state';
import { CHARMS, getCharm } from './charm-catalog';
import { Pendulum, type Point } from './pendulum';

declare function acquireVsCodeApi(): {
	getState(): unknown;
	setState(state: CharmState): void;
	postMessage(message: unknown): void;
};

function element<Kind extends HTMLElement>(id: string) {
	const result = document.getElementById(id);
	if (!result) {
		throw new Error(`Missing charm element: ${id}`);
	}
	return result as Kind;
}

const api = acquireVsCodeApi();
const stage = element<HTMLDivElement>('stage');
const rig = element<HTMLDivElement>('rig');
const hanging = element<HTMLDivElement>('hanging');
const charm = element<HTMLButtonElement>('charm');
const anchor = element<HTMLSpanElement>('anchor');
const restore = element<HTMLButtonElement>('restore');
const toggle = element<HTMLButtonElement>('toggle');
const motion = element<HTMLButtonElement>('motion');
const reset = element<HTMLButtonElement>('reset');
const settingsToggle = element<HTMLButtonElement>('settings-toggle');
const settings = element<HTMLDivElement>('settings');
const sizeInput = element<HTMLInputElement>('size');
const cordInput = element<HTMLInputElement>('cord-length');
const sizeValue = element<HTMLOutputElement>('size-value');
const cordValue = element<HTMLOutputElement>('cord-value');
const phase = element<HTMLSpanElement>('phase');
const lengthOutput = element<HTMLOutputElement>('length');
const thread = document.getElementById('thread')!;
const charmImage = element<HTMLImageElement>('charm-image');
const charmName = element<HTMLSpanElement>('charm-name');
const charmSwatch = element<HTMLSpanElement>('charm-swatch');
const charmSelect = element<HTMLSelectElement>('charm-select');
const charmDescription = element<HTMLParagraphElement>('charm-description');
const mediaRoot = new URL('.', charmImage.src);
let state = restoreState(api.getState());
let visible = true;
let ready = false;
let scale = 1;
let frameId: number | undefined;
let previousTime = 0;
let accumulatedTime = 0;
let transition: Animation | undefined;
let frames = 0;
let drag: { id: number; start: Point; cordLength: number; moved: boolean } | undefined;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pendulum = new Pendulum(280, 320, state.cordLength, state.size);

function reducedMotion() {
	return state.reducedMotion || systemMotion.matches || document.body.classList.contains('vscode-reduce-motion');
}

function save() {
	api.setState(state);
	api.postMessage({ type: 'save', state });
}

function applyCharm() {
	const selected = getCharm(state.charmId);
	const source = new URL(selected.file, mediaRoot).toString();
	if (charmImage.src !== source) {
		charmImage.src = source;
	}
	charmName.textContent = selected.name;
	charmSwatch.style.backgroundColor = selected.accent;
	charmDescription.textContent = selected.description;
	charmSelect.value = selected.id;
	charm.setAttribute('aria-label', `Nudge ${selected.name.toLowerCase()} charm`);
	charm.title = `Nudge ${selected.name} charm`;
	stage.dataset.charm = selected.id;
}

function controls() {
	toggle.replaceChildren(createElement(state.hidden ? Eye : EyeOff, { width: 16, height: 16 }));
	toggle.title = state.hidden ? 'Restore charm' : 'Hide charm';
	toggle.setAttribute('aria-label', toggle.title);
	motion.replaceChildren(createElement(reducedMotion() ? Play : Pause, { width: 16, height: 16 }));
	motion.setAttribute('aria-checked', String(!reducedMotion()));
	motion.disabled = systemMotion.matches || document.body.classList.contains('vscode-reduce-motion');
	motion.title = motion.disabled ? 'Motion disabled by system preference' : 'Motion';
	restore.hidden = !state.hidden;
	if (state.hidden && hanging.contains(document.activeElement)) {
		restore.focus({ preventScroll: true });
	}
	hanging.inert = state.hidden;
}

function render() {
	const { anchorX, anchorY, cordLength, attachmentOffset } = pendulum.layout;
	const { x: positionX, y: positionY } = pendulum.position;
	const angle = pendulum.angle;
	const hookX = positionX + Math.sin(angle) * attachmentOffset;
	const hookY = positionY - Math.cos(angle) * attachmentOffset;
	charm.style.transform = `translate(${positionX}px, ${positionY}px) rotate(${angle}rad)`;
	anchor.style.left = `${anchorX}px`;
	anchor.style.top = `${anchorY}px`;
	restore.style.left = `${anchorX - 15}px`;
	thread.setAttribute('d', `M ${anchorX} ${anchorY} Q ${anchorX + (hookX - anchorX) * 0.45} ${(anchorY + hookY) / 2} ${hookX} ${hookY}`);
	lengthOutput.value = `${Math.round(cordLength)} px`;
	sizeInput.value = String(state.size);
	sizeValue.value = `${state.size}%`;
	cordInput.max = String(Math.floor(pendulum.layout.maximumCord / 2) * 2);
	cordInput.value = String(cordLength);
	cordValue.value = lengthOutput.value;
	sizeInput.setAttribute('aria-valuetext', sizeValue.value);
	cordInput.setAttribute('aria-valuetext', cordValue.value);
	const status = state.hidden ? 'Retracted' : drag ? 'Held' : pendulum.moving && !reducedMotion() ? 'Swinging' : 'Parked';
	if (phase.textContent !== status) {
		phase.textContent = status;
	}
	stage.dataset.frames = String(frames);
	stage.dataset.hidden = String(state.hidden);
	stage.dataset.cord = String(Math.round(cordLength));
	stage.dataset.size = String(state.size);
	charm.dataset.positionX = positionX.toFixed(2);
	charm.dataset.positionY = positionY.toFixed(2);
}

function stop() {
	if (frameId !== undefined) {
		cancelAnimationFrame(frameId);
	}
	frameId = undefined;
	previousTime = 0;
	accumulatedTime = 0;
	stage.dataset.running = 'false';
}

function tick(time: number) {
	if (!visible || document.hidden || state.hidden || reducedMotion()) {
		stop();
		return;
	}
	accumulatedTime += previousTime ? Math.min(50, time - previousTime) : 1000 / 60;
	previousTime = time;
	while (accumulatedTime >= 1000 / 60) {
		pendulum.step();
		accumulatedTime -= 1000 / 60;
	}
	frames++;
	render();
	if (pendulum.moving) {
		frameId = requestAnimationFrame(tick);
	} else {
		stop();
	}
}

function start() {
	if (frameId === undefined && pendulum.moving && ready && visible && !document.hidden && !state.hidden && !reducedMotion()) {
		stage.dataset.running = 'true';
		frameId = requestAnimationFrame(tick);
	}
}

function nudge(direction = -1) {
	if (state.hidden || reducedMotion()) {
		return;
	}
	pendulum.nudge(direction);
	start();
}

function showState(drop = false) {
	transition?.cancel();
	transition = undefined;
	const restoreFocus = !state.hidden && document.activeElement === restore;
	const canAnimate = visible && !document.hidden && !reducedMotion();
	controls();
	if (state.hidden) {
		stop();
		pendulum.settle();
		if (!hanging.hidden && canAnimate) {
			transition = hanging.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { duration: 200, easing: 'ease-in' });
			void transition.finished.then(() => { hanging.hidden = state.hidden; }).catch(() => {});
		} else {
			hanging.hidden = true;
		}
	} else {
		hanging.hidden = false;
		if (restoreFocus) {
			charm.focus({ preventScroll: true });
		}
		if (!canAnimate) {
			stop();
			pendulum.settle();
		} else if (drop) {
			transition = hanging.animate([{ transform: 'translateY(-110%)' }, { transform: 'translateY(0)' }], {
				duration: 480, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.12)',
			});
			nudge(-0.45);
		} else {
			start();
		}
	}
	render();
}

function cancelDrag() {
	if (!drag) {
		return;
	}
	const cancelled = drag;
	drag = undefined;
	pendulum.release();
	pendulum.setLength(state.cordLength);
	pendulum.settle();
	charm.classList.remove('dragging');
	if (charm.hasPointerCapture(cancelled.id)) {
		charm.releasePointerCapture(cancelled.id);
	}
	stop();
	render();
}

function resize() {
	cancelDrag();
	const { width, height } = stage.getBoundingClientRect();
	const layout = getLayout(width, height, state.cordLength, state.size);
	scale = Math.max(0.01, Math.min(1, width / layout.minimumWidth, height / layout.minimumHeight));
	pendulum.resize(width / scale, height / scale, state.cordLength, state.size);
	rig.style.width = `${pendulum.layout.width}px`;
	rig.style.height = `${pendulum.layout.height}px`;
	rig.style.transform = `scale(${scale})`;
	rig.style.setProperty('--charm-width', `${pendulum.layout.charmWidth}px`);
	rig.style.setProperty('--charm-height', `${pendulum.layout.charmHeight}px`);
	stop();
	render();
}

function point(event: PointerEvent): Point {
	const bounds = stage.getBoundingClientRect();
	return { x: (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / scale };
}

charm.addEventListener('pointerdown', event => {
	if (event.button !== 0 || drag || state.hidden) {
		return;
	}
	transition?.cancel();
	const startPoint = point(event);
	drag = { id: event.pointerId, start: startPoint, cordLength: pendulum.layout.cordLength, moved: false };
	pendulum.grab(startPoint);
	charm.setPointerCapture(event.pointerId);
	charm.classList.add('dragging');
	render();
});

charm.addEventListener('pointermove', event => {
	if (!drag || drag.id !== event.pointerId) {
		return;
	}
	const current = point(event);
	const deltaX = current.x - drag.start.x;
	const deltaY = current.y - drag.start.y;
	if (!drag.moved && Math.hypot(deltaX, deltaY) > 6) {
		drag.moved = true;
	}
	if (drag.moved) {
		if (Math.abs(deltaY) > Math.abs(deltaX)) {
			pendulum.setLength(drag.cordLength + deltaY);
		}
		pendulum.drag(current, reducedMotion());
		if (!reducedMotion()) {
			start();
		}
		render();
	}
});

charm.addEventListener('pointerup', event => {
	if (!drag || drag.id !== event.pointerId) {
		return;
	}
	const completed = drag;
	drag = undefined;
	pendulum.release();
	charm.classList.remove('dragging');
	charm.releasePointerCapture(event.pointerId);
	const end = point(event);
	const deltaY = end.y - completed.start.y;
	const deltaX = end.x - completed.start.x;
	if (completed.moved && deltaY < -60 && -deltaY > Math.abs(deltaX)) {
		state.hidden = true;
		showState();
	} else {
		pendulum.returnToLength(state.cordLength, reducedMotion());
		if (!completed.moved) {
			nudge(completed.start.x < pendulum.position.x ? 1 : -1);
		}
		if (reducedMotion()) {
			stop();
		} else {
			start();
		}
	}
	save();
	render();
});

charm.addEventListener('pointercancel', cancelDrag);
charm.addEventListener('lostpointercapture', cancelDrag);
window.addEventListener('blur', cancelDrag);
charm.addEventListener('click', event => { if (event.detail === 0) { nudge(); } });
charm.addEventListener('keydown', event => {
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
		event.preventDefault();
		nudge(event.key === 'ArrowLeft' ? -1 : 1);
	} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		cancelDrag();
		state.cordLength = clamp(pendulum.layout.cordLength + (event.key === 'ArrowDown' ? 20 : -20), 48, pendulum.layout.maximumCord);
		pendulum.setLength(state.cordLength);
		showState();
		save();
	} else if (event.key === 'Escape') {
		cancelDrag();
		state.hidden = true;
		showState();
		save();
		toggle.focus();
	}
});

function toggleHidden() {
	cancelDrag();
	state.hidden = !state.hidden;
	if (!state.hidden) {
		resize();
	}
	showState(!state.hidden);
	save();
}

toggle.addEventListener('click', toggleHidden);
restore.addEventListener('click', toggleHidden);
reset.addEventListener('click', () => {
	cancelDrag();
	state = resetState(state);
	applyCharm();
	resize();
	showState(true);
	save();
});
motion.addEventListener('click', () => {
	cancelDrag();
	state.reducedMotion = !state.reducedMotion;
	showState();
	save();
});

settingsToggle.addEventListener('click', () => {
	cancelDrag();
	settings.hidden = !settings.hidden;
	settingsToggle.setAttribute('aria-expanded', String(!settings.hidden));
	resize();
});
settings.addEventListener('keydown', event => {
	if (event.key === 'Escape') {
		event.stopPropagation();
		settings.hidden = true;
		settingsToggle.setAttribute('aria-expanded', 'false');
		settingsToggle.focus();
		resize();
	}
});
charmSelect.addEventListener('change', () => {
	cancelDrag();
	state.charmId = getCharm(charmSelect.value).id;
	applyCharm();
	resize();
	save();
});
sizeInput.addEventListener('input', () => {
	state.size = Number(sizeInput.value);
	resize();
	save();
});
cordInput.addEventListener('input', () => {
	state.cordLength = Number(cordInput.value);
	resize();
	save();
});

function synchronizeVisibility() {
	cancelDrag();
	transition?.cancel();
	pendulum.settle();
	stop();
	hanging.hidden = state.hidden;
	render();
}

function updateMotionPreference() {
	cancelDrag();
	showState();
}

window.addEventListener('message', event => {
	const message: unknown = event.data;
	if (!message || typeof message !== 'object' || !('type' in message)) {
		return;
	}
	if (message.type === 'state' && 'state' in message) {
		cancelDrag();
		state = restoreState(message.state);
		applyCharm();
		if ('visible' in message) {
			visible = message.visible === true;
		}
		api.setState(state);
		ready = true;
		stage.dataset.ready = 'true';
		resize();
		showState('drop' in message && message.drop === true);
	} else if (message.type === 'visibility' && 'visible' in message) {
		visible = message.visible === true;
		synchronizeVisibility();
	}
});

document.addEventListener('visibilitychange', synchronizeVisibility);
systemMotion.addEventListener('change', updateMotionPreference);
new MutationObserver(updateMotionPreference).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new ResizeObserver(resize).observe(stage);
reset.replaceChildren(createElement(RotateCcw, { width: 15, height: 15 }));
restore.replaceChildren(createElement(ArrowDown, { width: 14, height: 14 }));
settingsToggle.replaceChildren(createElement(SlidersHorizontal, { width: 15, height: 15 }));
for (const entry of CHARMS) {
	const option = document.createElement('option');
	option.value = entry.id;
	option.textContent = entry.name;
	charmSelect.append(option);
}
applyCharm();
controls();
resize();
api.postMessage({ type: 'ready' });