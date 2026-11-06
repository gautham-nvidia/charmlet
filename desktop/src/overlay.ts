import { restoreDesktopView, type DesktopView } from './desktop-view';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const api = acquireVsCodeApi();
function element<T extends HTMLElement = HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) { throw new Error(`Missing desktop element: ${id}`); }
	return node as T;
}
const body = document.body;
const stage = element('stage');
const charm = element('charm');
const header = element('desktop-header');
const tools = element<HTMLButtonElement>('desktop-tools');
const move = element<HTMLButtonElement>('desktop-move');
const nav = element('primary-nav');
const settingsMenu = element('settings-menu');
const messageCheckbox = element<HTMLInputElement>('show-messages');
const frame = document.createElement('div');
frame.id = 'desktop-frame';
frame.append(header);
for (const child of [...element('app').children]) {
	if (child !== stage) { frame.append(child); }
}
element('app').append(frame);
const interactive = '#desktop-header, #charm, #anchor, #restore, #message-card, #care-cue, #primary-nav, #settings, #companion-tools, #charm-picker, #settings-menu, #photo-editor';
let view = restoreDesktopView(undefined);
let ignored: boolean | undefined;
let charmHeld = false;
let moving = false;
let expanded = false;
let hadPanel = false;
let keyboard = false;
let revision = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let pointer: { x: number; y: number } | undefined;

const messages = document.createElement('button');
messages.id = 'desktop-messages';
messages.type = 'button';
messages.textContent = 'Messages';
messages.setAttribute('aria-controls', 'companion-tools');
messages.setAttribute('aria-expanded', 'false');
nav.insertBefore(messages, element('settings-toggle'));

const desktopOptions = document.createElement('div');
desktopOptions.className = 'desktop-options';
desktopOptions.innerHTML = `<p class="desktop-options-label">Your desktop</p>
	<button id="desktop-background" type="button" role="menuitem" aria-pressed="false">Background <span>Off</span></button>
	<button id="desktop-pin-toolbar" type="button" role="menuitem" aria-pressed="false">Keep toolbar visible <span>Off</span></button>
	<button id="desktop-pin-messages" type="button" role="menuitem" aria-pressed="false">Keep messages visible <span>Off</span></button>
	<button id="desktop-reset-position" type="button" role="menuitem">Reset window position</button>
	<p id="desktop-feedback" role="status" hidden></p>`;
settingsMenu.append(desktopOptions, element('app-version').closest('footer')!);
messageCheckbox.closest('label')!.classList.add('desktop-shared-message-choice');

function showToolbar() {
	if (hideTimer) { clearTimeout(hideTimer); hideTimer = undefined; }
	body.dataset.desktopReveal = 'true';
}
function hideToolbarLater() {
	if (hideTimer) { return; }
	hideTimer = setTimeout(() => {
		hideTimer = undefined;
		if (!expanded && !view.toolbarPinned && !moving && !charmHeld && !header.contains(document.activeElement)) {
			body.dataset.desktopReveal = 'false';
			refreshHitTest();
		}
	}, 1200);
}
function setIgnored(value: boolean) {
	if (ignored === value) { return; }
	ignored = value;
	api.postMessage({ type: 'desktop-hit-test', ignore: value });
}
function ensureMessages() {
	// Reuse the shared message preference only after an explicit desktop choice.
	if (!messageCheckbox.checked) { messageCheckbox.click(); }
}
function setExpanded(value: boolean) {
	if (value === expanded) { return; }
	if (!value) {
		for (const id of ['picker-close', 'menu-close', 'settings-close', 'companion-close', 'photo-close']) {
			const close = element<HTMLButtonElement>(id);
			if (close.getClientRects().length) { close.click(); }
		}
	}
	expanded = value;
	body.dataset.desktopTools = String(value);
	tools.setAttribute('aria-expanded', String(value));
	tools.setAttribute('aria-label', value ? 'Hide controls' : 'Show controls');
	tools.title = value ? 'Hide controls' : 'Show controls';
	if (value) { showToolbar(); }
	else {
		if (keyboard) { tools.focus(); }
		else { (document.activeElement as HTMLElement | null)?.blur(); }
		hideToolbarLater();
	}
	requestAnimationFrame(refreshHitTest);
}
function renderView() {
	body.dataset.desktopBackground = String(view.background);
	body.dataset.desktopPinnedMessages = String(view.messagesPinned);
	body.dataset.desktopPinnedToolbar = String(view.toolbarPinned);
	for (const [id, enabled] of [
		['desktop-background', view.background], ['desktop-pin-toolbar', view.toolbarPinned],
		['desktop-pin-messages', view.messagesPinned],
	] as const) {
		const button = element<HTMLButtonElement>(id);
		button.setAttribute('aria-pressed', String(enabled));
		button.querySelector('span')!.textContent = enabled ? 'On' : 'Off';
	}
	if (view.toolbarPinned) { setExpanded(true); showToolbar(); }
	requestAnimationFrame(refreshHitTest);
}
function saveView(key: keyof DesktopView) {
	view = { ...view, [key]: !view[key] };
	if (view.messagesPinned) { ensureMessages(); }
	renderView();
	body.dataset.desktopSaved = 'false';
	element('desktop-feedback').hidden = true;
	api.postMessage({ type: 'desktop-view-save', value: view, revision: ++revision });
}
function syncPanels() {
	const open = ['charm-picker', 'settings-menu', 'settings', 'companion-tools', 'photo-editor'].some(id => !element(id).hidden);
	const messagePanel = !element('companion-tools').hidden && !element('learn-panel').hidden;
	body.dataset.desktopPanel = String(open);
	body.dataset.desktopMessagePanel = String(messagePanel);
	messages.setAttribute('aria-expanded', String(messagePanel));
	if (messagePanel) { ensureMessages(); }
	if (open !== hadPanel) { api.postMessage({ type: 'desktop-tools', expanded: open }); }
	if (open) { setExpanded(true); showToolbar(); }
	else if (hadPanel && !view.toolbarPinned) { setExpanded(false); }
	hadPanel = open;
	requestAnimationFrame(refreshHitTest);
}
function endMove() {
	if (!moving) { return; }
	moving = false;
	move.classList.remove('moving');
	api.postMessage({ type: 'desktop-move-end' });
}
function updateHitTest(event: MouseEvent) {
	pointer = { x: event.clientX, y: event.clientY };
	refreshHitTest();
}
function refreshHitTest() {
	if (charmHeld || moving) { setIgnored(false); return; }
	const target = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null;
	const active = target instanceof Element && target.closest(interactive) !== null;
	if (active) { showToolbar(); }
	else if (body.dataset.desktopReveal === 'true') { hideToolbarLater(); }
	setIgnored(!active);
}

tools.addEventListener('click', () => setExpanded(!expanded));
element('desktop-hide').addEventListener('click', () => api.postMessage({ type: 'desktop-hide' }));
messages.addEventListener('click', () => {
	ensureMessages();
	if (!element('companion-tools').hidden && !element('learn-panel').hidden) { element('companion-close').click(); }
	else { element('menu-messages').click(); }
});
element('desktop-background').addEventListener('click', () => saveView('background'));
element('desktop-pin-toolbar').addEventListener('click', () => saveView('toolbarPinned'));
element('desktop-pin-messages').addEventListener('click', () => saveView('messagesPinned'));
element('desktop-reset-position').addEventListener('click', () => api.postMessage({ type: 'desktop-reset-position' }));
move.addEventListener('pointerdown', event => {
	if (event.button !== 0) { return; }
	event.preventDefault();
	move.setPointerCapture(event.pointerId);
	moving = true;
	move.classList.add('moving');
	setIgnored(false);
	api.postMessage({ type: 'desktop-move-start' });
});
move.addEventListener('pointermove', () => { if (moving) { api.postMessage({ type: 'desktop-move-drag' }); } });
move.addEventListener('lostpointercapture', endMove);
move.addEventListener('keydown', event => {
	const directions: Record<string, readonly [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
	const direction = directions[event.key];
	if (!direction) { return; }
	event.preventDefault();
	const step = event.shiftKey ? 20 : 2;
	api.postMessage({ type: 'desktop-move-step', dx: direction[0] * step, dy: direction[1] * step });
});
window.addEventListener('mousemove', updateHitTest, true);
window.addEventListener('mouseleave', () => {
	pointer = undefined;
	if (!charmHeld && !moving) { setIgnored(true); hideToolbarLater(); }
});
charm.addEventListener('pointerdown', event => { if (event.button === 0) { charmHeld = true; setIgnored(false); } });
for (const event of ['pointerup', 'pointercancel'] as const) {
	window.addEventListener(event, () => { charmHeld = false; endMove(); requestAnimationFrame(refreshHitTest); }, true);
}
charm.addEventListener('lostpointercapture', () => { charmHeld = false; requestAnimationFrame(refreshHitTest); });
window.addEventListener('blur', () => { charmHeld = false; endMove(); pointer = undefined; setIgnored(true); hideToolbarLater(); });
document.addEventListener('focusin', () => { if (header.contains(document.activeElement)) { showToolbar(); } });
document.addEventListener('pointerdown', event => {
	keyboard = false;
	const target = event.target instanceof Element ? event.target.closest('button, input, select, summary, a') : null;
	if (target && target !== charm) { api.postMessage({ type: 'desktop-focus' }); }
}, true);
document.addEventListener('keydown', event => {
	keyboard = true;
	if (event.key === 'Escape' && !hadPanel) { setExpanded(false); }
}, true);
document.addEventListener('contextmenu', event => {
	if (!(event.target instanceof Element) || !event.target.closest('#charm, #anchor')) { return; }
	event.preventDefault();
	api.postMessage({ type: 'desktop-focus' });
	setExpanded(true);
	element('charms-toggle').focus();
});
window.addEventListener('message', event => {
	if (event.source !== window || !event.data || typeof event.data !== 'object') { return; }
	const message = event.data;
	if (message.type === 'desktop-placement' && message.anchor && message.frame) {
		body.dataset.desktopAnchorX = String(message.anchor.x);
		body.dataset.desktopAnchorY = String(message.anchor.y);
		frame.style.left = `${message.frame.x}px`;
		frame.style.top = `${message.frame.y}px`;
		frame.style.width = `${message.frame.width}px`;
		frame.style.height = `${message.frame.height}px`;
		requestAnimationFrame(refreshHitTest);
	} else if (message.type === 'desktop-hit-state' && typeof message.ignore === 'boolean') {
		ignored = message.ignore;
	} else if (message.type === 'desktop-view') {
		view = restoreDesktopView(message.value);
		renderView();
		body.dataset.desktopReady = 'true';
		body.dataset.desktopSaved = 'true';
	} else if (message.type === 'desktop-view-saved' && message.revision === revision) {
		body.dataset.desktopSaved = String(!message.error);
		if (message.error) {
			const feedback = element('desktop-feedback');
			feedback.textContent = message.error;
			feedback.hidden = false;
		}
	} else if (message.type === 'desktop-tools-open') {
		setExpanded(true);
		element('charms-toggle').focus();
	} else if (message.type === 'companion-open' || (message.type === 'state' && message.companionTab)) {
		setExpanded(true);
	}
});
const panels = new MutationObserver(syncPanels);
for (const id of ['charm-picker', 'settings-menu', 'settings', 'companion-tools', 'learn-panel', 'photo-editor']) {
	panels.observe(element(id), { attributes: true, attributeFilter: ['hidden'] });
}
setIgnored(true);
