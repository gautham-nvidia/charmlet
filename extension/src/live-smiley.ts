import { createCanvasSmiley, createWebGLSmiley, type SmileyRenderer } from './smiley-renderer';

export function createLiveSmiley(charm: HTMLElement, image: HTMLImageElement) {
	let canvas: HTMLCanvasElement | undefined;
	let renderer: SmileyRenderer | undefined;
	let selected = false;
	let lastVisible = false;
	let active = false;
	let reduced = false;
	let disposed = false;
	let frame: number | undefined;
	let wake: number | undefined;
	let happyTimer: number | undefined;
	let happyUntil = 0;
	let lastPointerAt = 0;
	let frames = 0;
	let lastPressed = false;
	let gazeX = 0, gazeY = 0, targetX = 0, targetY = 0;
	const stop = () => {
		if (frame !== undefined) { cancelAnimationFrame(frame); frame = undefined; }
		if (wake !== undefined) { clearTimeout(wake); wake = undefined; }
	};
	function makeCanvas() {
		const element = document.createElement('canvas');
		element.id = 'live-smiley'; element.width = 216; element.height = 252;
		element.setAttribute('aria-hidden', 'true');
		charm.append(element);
		return element;
	}
	function useCanvasFallback() {
		renderer?.dispose(); canvas?.remove();
		canvas = makeCanvas();
		renderer = createCanvasSmiley(canvas);
		syncSurface();
		paint();
	}
	function initialize() {
		if (canvas || disposed) { return; }
		canvas = makeCanvas();
		renderer = createWebGLSmiley(canvas);
		if (!renderer) { useCanvasFallback(); }
		else {
			canvas.addEventListener('webglcontextlost', event => {
				event.preventDefault();
				useCanvasFallback();
			}, { once: true });
		}
	}
	function syncSurface() {
		if (!canvas) { return; }
		canvas.hidden = !active || !renderer;
		canvas.style.transformOrigin = image.style.transformOrigin;
		canvas.dataset.renderer = renderer?.kind ?? 'static';
		canvas.dataset.motion = active && !reduced ? 'live' : 'still';
		image.style.opacity = selected && renderer ? '0' : '';
	}
	function paint() {
		if (!active || !renderer || !canvas || document.hidden || disposed) { return; }
		const now = performance.now();
		if (now - lastPointerAt > 1500) { resetGaze(); }
		gazeX = reduced ? 0 : gazeX + (targetX - gazeX) * .24;
		gazeY = reduced ? 0 : gazeY + (targetY - gazeY) * .24;
		const blink = reduced ? 0 : Math.max(0, 1 - Math.abs(now / 1000 % 5.6 - 3.2) * 9);
		const pressed = charm.classList.contains('dragging') || charm.dataset.keyboardHeld === 'true';
		lastPressed = pressed;
		renderer.draw({ gazeX, gazeY, blink, pressed, happy: now < happyUntil && !pressed });
		canvas.dataset.frames = String(++frames);
		canvas.dataset.expression = pressed ? 'squish' : now < happyUntil ? 'happy' : blink > .5 ? 'blink' : 'smile';
		canvas.dataset.gazeX = gazeX.toFixed(3); canvas.dataset.gazeY = gazeY.toFixed(3);
	}
	function tick() {
		frame = undefined;
		paint();
		if (active && !reduced && !disposed) {
			wake = window.setTimeout(() => { wake = undefined; frame = requestAnimationFrame(tick); }, 25);
		}
	}
	const pointer = (event: PointerEvent) => {
		if (!active || reduced) { return; }
		lastPointerAt = performance.now();
		const bounds = charm.getBoundingClientRect();
		const x = event.clientX - bounds.x - bounds.width / 2, y = event.clientY - bounds.y - bounds.height / 2;
		const proximity = Math.max(0, 1 - Math.hypot(x, y) / 230);
		targetX = Math.max(-1, Math.min(1, x / 70)) * proximity;
		targetY = -Math.max(-1, Math.min(1, y / 70)) * proximity;
	};
	const resetGaze = () => { targetX = 0; targetY = 0; };
	window.addEventListener('pointermove', pointer, { passive: true });
	window.addEventListener('blur', resetGaze);
	document.addEventListener('pointerleave', resetGaze);
	const press = new MutationObserver(() => {
		const pressed = charm.classList.contains('dragging') || charm.dataset.keyboardHeld === 'true';
		if (active && pressed !== lastPressed) { paint(); }
	});
	press.observe(charm, { attributes: true, attributeFilter: ['class', 'data-keyboard-held'] });
	function update(enabled: boolean, visible: boolean, reducedMotion: boolean) {
		const nextActive = enabled && visible && !document.hidden;
		const changed = active !== nextActive || reduced !== reducedMotion;
		selected = enabled; lastVisible = visible; active = nextActive; reduced = reducedMotion;
		if (enabled) { initialize(); }
		if (!active || reduced) { resetGaze(); gazeX = 0; gazeY = 0; }
		if (!active) {
			happyUntil = 0;
			if (happyTimer !== undefined) { clearTimeout(happyTimer); happyTimer = undefined; }
		}
		syncSurface();
		if (!changed) { return; }
		stop(); paint();
		if (active && !reduced) { frame = requestAnimationFrame(tick); }
	}
	window.addEventListener('pagehide', event => {
		update(selected, lastVisible, reduced);
		active = false; stop();
		if (event.persisted) { return; }
		disposed = true; press.disconnect(); renderer?.dispose();
		if (happyTimer !== undefined) { clearTimeout(happyTimer); }
		window.removeEventListener('pointermove', pointer);
		window.removeEventListener('blur', resetGaze);
		document.removeEventListener('pointerleave', resetGaze);
	});
	window.addEventListener('pageshow', event => {
		if (event.persisted && !disposed) { update(selected, lastVisible, reduced); }
	});
	return {
		update,
		celebrate() {
			if (!active) { return; }
			happyUntil = performance.now() + 1600;
			paint();
			if (happyTimer !== undefined) { clearTimeout(happyTimer); }
			happyTimer = window.setTimeout(() => { happyTimer = undefined; paint(); }, 1650);
		},
	};
}
