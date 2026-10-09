declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const api = acquireVsCodeApi();
const stage = document.getElementById('stage')!;
const charm = document.getElementById('charm')!;
const hide = document.getElementById('desktop-hide')!;
const interactive = '#desktop-header, #charm, #restore, #message-card, .tools, #settings, #companion-tools, .readout';
let ignored: boolean | undefined;
let charmHeld = false;

function setIgnored(value: boolean) {
	if (ignored === value) { return; }
	ignored = value;
	api.postMessage({ type: 'desktop-hit-test', ignore: value });
}

function updateHitTest(event: MouseEvent) {
	if (charmHeld) { setIgnored(false); return; }
	const target = document.elementFromPoint(event.clientX, event.clientY);
	setIgnored(!(target instanceof Element && target.closest(interactive)));
}

window.addEventListener('mousemove', updateHitTest, true);
window.addEventListener('mouseleave', () => { if (!charmHeld) { setIgnored(true); } });
charm.addEventListener('pointerdown', () => { charmHeld = true; setIgnored(false); });
for (const event of ['pointerup', 'pointercancel'] as const) {
	window.addEventListener(event, () => { charmHeld = false; }, true);
}
window.addEventListener('blur', () => { charmHeld = false; setIgnored(true); });
document.addEventListener('pointerdown', event => {
	const target = event.target instanceof Element ? event.target.closest('button, input, select, summary, a, #desktop-header') : null;
	if (target && target !== charm) { api.postMessage({ type: 'desktop-focus' }); }
}, true);
hide.addEventListener('click', () => api.postMessage({ type: 'desktop-hide' }));
new MutationObserver(() => { if (stage.dataset.running === 'false' && !charm.matches(':active')) { charmHeld = false; } })
	.observe(stage, { attributes: true, attributeFilter: ['data-running'] });
setIgnored(true);
