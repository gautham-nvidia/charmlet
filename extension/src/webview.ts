import { createElement, ArrowDown, ArrowRight, Eye, EyeOff, Orbit, Pause, Play, RotateCcw, SlidersHorizontal, Timer } from 'lucide';
import { resetState, clamp, getLayout, restoreState, type CharmState } from './charm-state';
import { CHARMS, getCharm, type CharmDefinition } from './charm-catalog';
import { createCompanionView } from './companion-view';
import { MessageRotation } from './message-rotation';
import { Pendulum, type Point } from './pendulum';

declare function acquireVsCodeApi(): {
	getState(): unknown;
	setState(state: CharmState): void;
	postMessage(message: unknown): void;
};

function element<Kind extends Element>(id: string) {
	const result = document.getElementById(id);
	if (!result) {
		throw new Error(`Missing charm element: ${id}`);
	}
	return result as unknown as Kind;
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
const companionToggle = element<HTMLButtonElement>('companion-toggle');
const layoutMode = element<HTMLButtonElement>('layout-mode');
const settings = element<HTMLDivElement>('settings');
const sizeInput = element<HTMLInputElement>('size');
const cordInput = element<HTMLInputElement>('cord-length');
const sizeValue = element<HTMLOutputElement>('size-value');
const cordValue = element<HTMLOutputElement>('cord-value');
const phase = element<HTMLSpanElement>('phase');
const lengthOutput = element<HTMLOutputElement>('length');
const thread = document.getElementById('thread')!;
const focusRing = element<SVGElement>('focus-ring');
const charmImage = element<HTMLImageElement>('charm-image');
const charmName = element<HTMLSpanElement>('charm-name');
const charmSwatch = element<HTMLSpanElement>('charm-swatch');
const charmSelect = element<HTMLSelectElement>('charm-select');
const charmDescription = element<HTMLParagraphElement>('charm-description');
const showMessages = element<HTMLInputElement>('show-messages');
const rotateMessages = element<HTMLInputElement>('rotate-messages');
const messageCard = element<HTMLDivElement>('message-card');
const nextMessage = element<HTMLButtonElement>('next-message');
const importPack = element<HTMLButtonElement>('import-pack');
const removePack = element<HTMLButtonElement>('remove-pack');
const mediaRoot = new URL('.', charmImage.src);
let charms: readonly CharmDefinition[] = CHARMS;
let state = restoreState(api.getState(), charms);
let saveRevision = 0;
let visible = true;
let ready = false;
let scale = 1;
let frameId: number | undefined;
let previousTime = 0;
let accumulatedTime = 0;
let transition: Animation | undefined;
let frames = 0;
let drag: { id: number; start: Point; screenStart: Point; moved: boolean; lastAngle: number; angularTravel: number; maxSideways: number; orbitalGesture: boolean; hideDistance: number; orbitSideDistance: number } | undefined;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pendulum = new Pendulum(280, 320, state.cordLength, state.size, state.layoutMode);
const companionUI = createCompanionView({
	send: (action, requestId) => api.postMessage({ type: 'companion-action', action, requestId }),
	openSource: cardId => api.postMessage({ type: 'learning-source', cardId }),
	image: file => new URL(file, mediaRoot).toString(),
	hangFlower: (flowerId, requestId) => api.postMessage({ type: 'garden-hang', flowerId, requestId }),
	onOpen: () => {
		settings.hidden = true;
		settingsToggle.setAttribute('aria-expanded', 'false');
	},
	onLayout: () => {
		resize();
		scheduleMessages();
	},
	onActivity: scheduleMessages,
});

function reducedMotion() {
	return state.reducedMotion || systemMotion.matches || document.body.classList.contains('vscode-reduce-motion');
}

function save() {
	const revision = ++saveRevision;
	stage.dataset.persisted = 'false';
	api.setState(state);
	api.postMessage({ type: 'save', state, revision });
}

function applyCharm() {
	const selected = getCharm(state.charmId, charms);
	const source = selected.source ?? new URL(selected.file, mediaRoot).toString();
	if (charmImage.src !== source) {
		charmImage.src = source;
	}
	charmName.textContent = selected.name;
	charmSwatch.style.backgroundColor = selected.accent;
	charmDescription.textContent = selected.description;
	charmSelect.value = selected.id;
	charm.setAttribute('aria-label', `Nudge ${selected.name.toLowerCase()} charm`);
	stage.dataset.charm = selected.id;
}

function updateMessage() {
	messageCard.hidden = !state.showMessages;
	showMessages.checked = state.showMessages;
	rotateMessages.checked = state.rotateMessages;
}

function advanceMessage() {
	companionUI.nextCard();
	scheduleMessages();
}

const messageRotation = new MessageRotation(advanceMessage);

function scheduleMessages() {
	const enabled = ready && stage.dataset.companionReady === 'true' && visible && !document.hidden
		&& state.showMessages && state.rotateMessages && settings.hidden && !drag && companionUI.canRotate();
	messageRotation.setEnabled(enabled);
	messageCard.dataset.rotation = enabled ? 'active' : 'paused';
}

function populateCharms() {
	charmSelect.replaceChildren();
	const groups = new Map<string, HTMLOptGroupElement>();
	for (const entry of charms) {
		let group = groups.get(entry.group);
		if (!group) {
			group = document.createElement('optgroup');
			group.label = entry.group;
			groups.set(entry.group, group);
			charmSelect.append(group);
		}
		const option = document.createElement('option');
		option.value = entry.id;
		option.textContent = entry.name;
		group.append(option);
	}
}

function controls() {
	const selected = getCharm(state.charmId, charms);
	charm.title = state.layoutMode === 'orbit'
		? `Nudge ${selected.name} charm; drag around the peg for a full loop`
		: `Nudge ${selected.name} charm; pull up to retract. Use Orbit layout for full loops.`;
	toggle.replaceChildren(createElement(state.hidden ? Eye : EyeOff, { width: 16, height: 16 }));
	toggle.title = state.hidden ? 'Restore charm' : 'Hide charm';
	toggle.setAttribute('aria-label', toggle.title);
	motion.replaceChildren(createElement(reducedMotion() ? Play : Pause, { width: 16, height: 16 }));
	motion.setAttribute('aria-checked', String(!reducedMotion()));
	motion.disabled = systemMotion.matches || document.body.classList.contains('vscode-reduce-motion');
	motion.title = motion.disabled ? 'Motion disabled by system preference' : 'Motion';
	layoutMode.setAttribute('aria-pressed', String(state.layoutMode === 'orbit'));
	layoutMode.title = state.layoutMode === 'orbit' ? 'Switch to compact hanging layout' : 'Switch to orbit layout';
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
	focusRing.style.left = `${anchorX}px`;
	focusRing.style.top = `${anchorY}px`;
	restore.style.left = `${anchorX * scale - 15}px`;
	restore.style.top = `${Math.max(4, anchorY * scale - 14)}px`;
	thread.setAttribute('d', `M ${anchorX} ${anchorY} Q ${anchorX + (hookX - anchorX) * 0.45} ${(anchorY + hookY) / 2} ${hookX} ${hookY}`);
	lengthOutput.value = `${Math.round(cordLength)} px`;
	sizeInput.value = String(state.size);
	sizeValue.value = `${state.size}%`;
	cordInput.max = String(Math.max(320, Math.floor(pendulum.layout.maximumCord / 2) * 2, Math.ceil(state.cordLength / 2) * 2));
	cordInput.value = String(state.cordLength);
	cordValue.value = `${Math.round(state.cordLength)} px`;
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
	stage.dataset.layout = state.layoutMode;
	stage.dataset.anchorX = String(anchorX);
	stage.dataset.anchorY = String(anchorY);
	stage.dataset.orbitRadius = String(pendulum.layout.orbitRadius);
	charm.dataset.positionX = positionX.toFixed(2);
	charm.dataset.positionY = positionY.toFixed(2);
	charm.dataset.angle = angle.toFixed(6);
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
	scheduleMessages();
}

function finishDrag() {
	const completed = drag;
	if (!completed) { return undefined; }
	drag = undefined;
	pendulum.release();
	charm.classList.remove('dragging');
	if (charm.hasPointerCapture(completed.id)) { charm.releasePointerCapture(completed.id); }
	scheduleMessages();
	return completed;
}

function cancelDrag() {
	const cancelled = finishDrag();
	if (!cancelled) { return; }
	pendulum.setLength(state.cordLength);
	pendulum.settle();
	stop();
	render();
	scheduleMessages();
}

function resize() {
	cancelDrag();
	const { width, height } = stage.getBoundingClientRect();
	const layout = getLayout(width, height, state.cordLength, state.size, state.layoutMode);
	scale = Math.max(0.01, Math.min(1, width / layout.minimumWidth, height / layout.minimumHeight));
	pendulum.resize(width / scale, height / scale, state.cordLength, state.size, state.layoutMode);
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
	drag = {
		id: event.pointerId, start: startPoint, screenStart: { x: event.clientX, y: event.clientY }, moved: false,
		lastAngle: Math.atan2(startPoint.y - pendulum.layout.anchorY, startPoint.x - pendulum.layout.anchorX),
		angularTravel: 0, maxSideways: 0, orbitalGesture: false,
		hideDistance: clamp((pendulum.layout.cordLength + pendulum.layout.attachmentOffset) * scale * 0.65, 24, 60),
		orbitSideDistance: Math.max(6, pendulum.layout.charmWidth * scale * 0.5),
	};
	pendulum.grab(startPoint);
	charm.setPointerCapture(event.pointerId);
	charm.classList.add('dragging');
	render();
	scheduleMessages();
});

charm.addEventListener('pointermove', event => {
	if (!drag || drag.id !== event.pointerId) {
		return;
	}
	const current = point(event);
	const deltaX = event.clientX - drag.screenStart.x;
	const deltaY = event.clientY - drag.screenStart.y;
	if (!drag.moved && Math.hypot(deltaX, deltaY) > 6) {
		drag.moved = true;
	}
	if (drag.moved) {
		const angle = Math.atan2(current.y - pendulum.layout.anchorY, current.x - pendulum.layout.anchorX);
		const difference = angle - drag.lastAngle;
		drag.angularTravel += Math.atan2(Math.sin(difference), Math.cos(difference));
		drag.lastAngle = angle;
		drag.maxSideways = Math.max(drag.maxSideways, Math.abs(deltaX));
		drag.orbitalGesture ||= state.layoutMode === 'orbit'
			&& Math.abs(drag.angularTravel) > Math.PI / 6
			&& drag.maxSideways > drag.orbitSideDistance;
		const upward = !drag.orbitalGesture && deltaY < -drag.hideDistance && -deltaY > Math.abs(deltaX);
		const leavingTop = event.clientY <= stage.getBoundingClientRect().top + 4;
		if (upward && (state.layoutMode === 'hanging' || leavingTop)) {
			finishDrag();
			state.hidden = true;
			showState();
			save();
			render();
			return;
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
	const completed = finishDrag();
	if (!completed) { return; }
	const deltaY = event.clientY - completed.screenStart.y;
	const deltaX = event.clientX - completed.screenStart.x;
	if (completed.moved && !completed.orbitalGesture && deltaY < -completed.hideDistance && -deltaY > Math.abs(deltaX)) {
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
window.addEventListener('pointermove', event => {
	if (drag && event.pointerId === drag.id && event.buttons === 0) {
		cancelDrag();
	}
}, true);
charm.addEventListener('click', event => { if (event.detail === 0) { nudge(); } });
charm.addEventListener('keydown', event => {
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
		event.preventDefault();
		nudge(event.key === 'ArrowLeft' ? -1 : 1);
	} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		cancelDrag();
		state.cordLength = clamp(state.cordLength + (event.key === 'ArrowDown' ? 20 : -20), 48, Number(cordInput.max));
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
	updateMessage();
	resize();
	showState(true);
	save();
});
layoutMode.addEventListener('click', () => {
	cancelDrag();
	state.layoutMode = state.layoutMode === 'orbit' ? 'hanging' : 'orbit';
	resize();
	showState();
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
	companionUI.close(false);
	settings.hidden = !settings.hidden;
	settingsToggle.setAttribute('aria-expanded', String(!settings.hidden));
	resize();
	scheduleMessages();
});
settings.addEventListener('keydown', event => {
	if (event.key === 'Escape') {
		event.stopPropagation();
		settings.hidden = true;
		settingsToggle.setAttribute('aria-expanded', 'false');
		settingsToggle.focus();
		resize();
		scheduleMessages();
	}
});
charmSelect.addEventListener('change', () => {
	cancelDrag();
	state.charmId = getCharm(charmSelect.value, charms).id;
	applyCharm();
	resize();
	save();
});
showMessages.addEventListener('change', () => {
	state.showMessages = showMessages.checked;
	updateMessage();
	resize();
	save();
	scheduleMessages();
});
rotateMessages.addEventListener('change', () => {
	state.rotateMessages = rotateMessages.checked;
	updateMessage();
	save();
	scheduleMessages();
});
importPack.addEventListener('click', () => api.postMessage({ type: 'command', command: 'charmlet.importPack' }));
removePack.addEventListener('click', () => api.postMessage({ type: 'command', command: 'charmlet.removePack' }));
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
	scheduleMessages();
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
		if ('catalogue' in message && Array.isArray(message.catalogue)) {
			charms = message.catalogue as CharmDefinition[];
			populateCharms();
		}
		state = restoreState(message.state, charms);
		applyCharm();
		updateMessage();
		if ('visible' in message) {
			visible = message.visible === true;
		}
		api.setState(state);
		if ('companion' in message) { companionUI.receive(message.companion); }
		if ('companionTab' in message && (message.companionTab === 'focus' || message.companionTab === 'learn' || message.companionTab === 'garden')) {
			companionUI.open(message.companionTab);
		}
		ready = true;
		stage.dataset.ready = 'true';
		resize();
		showState('drop' in message && message.drop === true);
	} else if (message.type === 'catalogue' && 'catalogue' in message && Array.isArray(message.catalogue) && 'state' in message) {
		cancelDrag();
		charms = message.catalogue as CharmDefinition[];
		populateCharms();
		state = restoreState(message.state, charms);
		api.setState(state);
		applyCharm();
		updateMessage();
		resize();
		showState();
	} else if (message.type === 'companion' && 'snapshot' in message) {
		companionUI.receive(message.snapshot);
		scheduleMessages();
	} else if (message.type === 'companion-result' && 'requestId' in message && Number.isSafeInteger(message.requestId)) {
		companionUI.result(
			Number(message.requestId),
			'error' in message && typeof message.error === 'string' ? message.error : undefined,
			'message' in message && typeof message.message === 'string' ? message.message : undefined,
		);
	} else if (message.type === 'companion-open' && 'tab' in message && (message.tab === 'focus' || message.tab === 'learn' || message.tab === 'garden')) {
		companionUI.open(message.tab);
	} else if (message.type === 'saved' && 'revision' in message && message.revision === saveRevision) {
		stage.dataset.persisted = 'true';
	} else if (message.type === 'save-error' && 'revision' in message && message.revision === saveRevision) {
		stage.dataset.persisted = 'error';
	} else if (message.type === 'visibility' && 'visible' in message) {
		visible = message.visible === true;
		synchronizeVisibility();
	}
});

document.addEventListener('visibilitychange', synchronizeVisibility);
window.addEventListener('pagehide', () => messageRotation.stop());
systemMotion.addEventListener('change', updateMotionPreference);
new MutationObserver(updateMotionPreference).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new ResizeObserver(resize).observe(stage);
reset.replaceChildren(createElement(RotateCcw, { width: 15, height: 15 }));
restore.replaceChildren(createElement(ArrowDown, { width: 14, height: 14 }));
companionToggle.prepend(createElement(Timer, { width: 15, height: 15 }));
settingsToggle.replaceChildren(createElement(SlidersHorizontal, { width: 15, height: 15 }));
layoutMode.replaceChildren(createElement(Orbit, { width: 16, height: 16 }));
nextMessage.replaceChildren(createElement(ArrowRight, { width: 14, height: 14 }));
populateCharms();
applyCharm();
updateMessage();
controls();
resize();
api.postMessage({ type: 'ready' });