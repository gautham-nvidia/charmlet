import { createFidgetRenderer } from './fidget-renderer';
import { fidgetKind, nearestBubble, stepSpinner, type FidgetKind } from './interactive-motion';

export function createFidgetView(charm: HTMLElement, image: HTMLImageElement) {
	let canvas: HTMLCanvasElement | undefined;
	let draw: ReturnType<typeof createFidgetRenderer>;
	let kind: FidgetKind | undefined;
	let active = false, reduced = false, held = false;
	let angle = 0, velocity = 0, rock = 0, lastTime = 0, frames = 0, nextBubble = 0;
	let bubbles = Array<boolean>(6).fill(false);
	let frame: number | undefined;
	let pointer: { id: number; x: number; y: number; at: number; distance: number; direction: number } | undefined;
	const status = document.createElement('span');
	status.className = 'fidget-status';
	status.setAttribute('role', 'status');
	charm.append(status);

	function stop() {
		if (frame !== undefined) { cancelAnimationFrame(frame); frame = undefined; }
		if (canvas) { canvas.dataset.running = 'false'; }
		lastTime = 0;
	}
	function paint() {
		if (!active || !kind || !canvas || !draw) { return; }
		draw({ kind, angle, rock: reduced ? 0 : rock, pressed: held, bubbles });
		canvas.dataset.frames = String(++frames);
		canvas.dataset.kind = kind;
		canvas.dataset.angle = angle.toFixed(4);
		canvas.dataset.velocity = velocity.toFixed(3);
		canvas.dataset.rock = (reduced ? 0 : rock).toFixed(4);
		canvas.dataset.bubbles = bubbles.map(value => value ? '1' : '0').join('');
		canvas.dataset.held = String(held);
		canvas.dataset.running = String(frame !== undefined);
	}
	function tick(now: number) {
		frame = undefined;
		if (!active || reduced) { stop(); return; }
		const elapsed = lastTime ? now - lastTime : 1000 / 60;
		lastTime = now;
		if (kind === 'spinner') { ({ angle, velocity } = stepSpinner(angle, velocity, elapsed)); }
		if (kind === 'stone' && !held) {
			rock *= Math.exp(-Math.min(100, elapsed) / 45);
			if (Math.abs(rock) < .002) { rock = 0; }
		}
		if (velocity || (!held && rock)) { frame = requestAnimationFrame(tick); }
		else { lastTime = 0; }
		paint();
	}
	function start() {
		if (active && !reduced && frame === undefined && (velocity || (!held && rock))) {
			frame = requestAnimationFrame(tick);
		}
	}
	function pop(index: number) {
		bubbles[index] = !bubbles[index];
		nextBubble = (index + 1) % bubbles.length;
		status.textContent = `Bubble ${index + 1} ${bubbles[index] ? 'pressed in' : 'popped out'}.`;
	}
	function press(event?: PointerEvent) {
		held = true; stop(); velocity = 0;
		if (kind === 'bubbles') {
			const bounds = charm.getBoundingClientRect();
			const index = event ? nearestBubble((event.clientX - bounds.left) * 72 / Math.max(1, bounds.width),
				(event.clientY - bounds.top) * 84 / Math.max(1, bounds.height)) : nextBubble;
			pop(index);
		}
		if (kind === 'stone') { rock = reduced ? 0 : .05; status.textContent = 'Holding the worry stone.'; }
		paint();
	}
	function release() {
		if (!held) { return; }
		held = false;
		if (kind === 'spinner') {
			const distance = pointer?.distance ?? 0;
			const elapsed = pointer ? Math.max(50, performance.now() - pointer.at) : 100;
			const direction = pointer?.direction ?? 1;
			if (reduced) { angle = (angle + direction * Math.PI / 3) % (Math.PI * 2); }
			else { velocity = direction * Math.min(34, 16 + distance / elapsed * 12); }
			status.textContent = reduced ? 'Spinner turned. Motion is reduced.' : 'Spinner spinning.';
		}
		if (kind === 'stone') { status.textContent = 'Worry stone released.'; }
		pointer = undefined; start(); paint();
	}
	function cancel() {
		pointer = undefined; held = false; velocity = 0; rock = 0;
		charm.dataset.keyboardHeld = 'false';
		stop(); paint();
	}
	charm.addEventListener('pointerdown', event => {
		if (!active || event.button !== 0 || pointer) { return; }
		pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), distance: 0, direction: 1 };
		press(event);
	});
	charm.addEventListener('pointermove', event => {
		if (!active || !pointer || pointer.id !== event.pointerId) { return; }
		const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
		pointer.distance = Math.hypot(dx, dy);
		pointer.direction = dx < -3 ? -1 : 1;
		if (kind === 'stone') { rock = reduced ? 0 : Math.sin((dx + dy) * .1) * .12; paint(); }
	});
	charm.addEventListener('pointerup', event => { if (pointer?.id === event.pointerId) { release(); } });
	for (const type of ['pointercancel', 'lostpointercapture']) {
		charm.addEventListener(type, () => { if (pointer) { cancel(); } });
	}
	charm.addEventListener('keydown', event => {
		if (!active || ![' ', 'Enter'].includes(event.key)) { return; }
		event.preventDefault();
		if (!event.repeat && !held) { charm.dataset.keyboardHeld = 'true'; press(); }
	});
	charm.addEventListener('keyup', event => {
		if (!active || ![' ', 'Enter'].includes(event.key)) { return; }
		event.preventDefault(); charm.dataset.keyboardHeld = 'false'; release();
	});
	charm.addEventListener('click', event => {
		if (active && event.detail === 0) { press(); release(); }
	});
	charm.addEventListener('blur', () => { if (held && !pointer) { cancel(); } });
	window.addEventListener('blur', cancel);
	window.addEventListener('pagehide', cancel);
	window.addEventListener('pointermove', event => {
		if (pointer?.id === event.pointerId && event.buttons === 0) { cancel(); }
	}, true);

	return {
		update(id: string, visible: boolean, reducedMotion: boolean) {
			const next = fidgetKind(id);
			const nextActive = Boolean(next && visible && !document.hidden);
			const changed = next !== kind || nextActive !== active || reduced !== reducedMotion;
			if (next !== kind) { bubbles = Array<boolean>(6).fill(false); nextBubble = 0; angle = 0; status.textContent = ''; }
			kind = next; active = nextActive; reduced = reducedMotion;
			if (kind && !canvas) {
				canvas = document.createElement('canvas');
				canvas.id = 'live-fidget'; canvas.width = 216; canvas.height = 252;
				canvas.setAttribute('aria-hidden', 'true'); charm.append(canvas);
				draw = createFidgetRenderer(canvas);
			}
			if (canvas) {
				canvas.hidden = !active || !draw;
				canvas.style.transformOrigin = image.style.transformOrigin;
				canvas.dataset.motion = reduced ? 'still' : 'live';
			}
			charm.dataset.fidgetRendered = String(Boolean(kind && draw));
			if (changed) { cancel(); }
		},
	};
}
