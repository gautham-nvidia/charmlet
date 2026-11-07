import { createCanvasSmiley, createWebGLSmiley, type SmileyRenderer } from './smiley-renderer';
import { followGaze, liveCharacter, type LiveCharacter } from './interactive-motion';
import { createArtLibrary } from './live-art-assets';
import { createCanvasArt, createWebGLArt } from './live-art-renderer';
import { isArtCharacter } from './live-art-core';
import { nextLocalMidnight } from './garden-core';

export function createLiveSmiley(charm: HTMLElement, image: HTMLImageElement, resource: (file: string) => string) {
	let canvas: HTMLCanvasElement | undefined;
	let renderer: SmileyRenderer | undefined;
	let selected = '';
	let character: LiveCharacter | undefined;
	let lastVisible = false;
	let active = false;
	let reduced = false;
	let disposed = false;
	let frame: number | undefined;
	let wake: number | undefined;
	let reaction: 'hello' | 'wink' | 'happy' | undefined;
	let reactionUntil = 0;
	let reactionStartedAt = 0;
	let nextOutfitAt = 0;
	let artEngine = false;
	let lastPointerAt = 0;
	let lastPaintAt = 0;
	let nextBlinkAt = 0;
	let frames = 0;
	let lastPressed = false;
	let gazeX = 0, gazeY = 0, targetX = 0, targetY = 0;
	const art = createArtLibrary(resource, () => { if (!disposed) { refresh(); } });
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
	function clearRenderer() {
		const previousCanvas = canvas, previousRenderer = renderer;
		canvas = undefined; renderer = undefined;
		previousRenderer?.dispose();
		if (previousRenderer?.kind === 'webgl') {
			previousCanvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
		}
		previousCanvas?.remove();
	}
	function useCanvasFallback() {
		clearRenderer();
		canvas = makeCanvas();
		renderer = artEngine ? createCanvasArt(canvas, art) : createCanvasSmiley(canvas);
		syncSurface();
		paint();
	}
	function initialize() {
		if (canvas && artEngine !== isArtCharacter(character)) { clearRenderer(); }
		if (canvas || disposed) { return; }
		artEngine = isArtCharacter(character);
		canvas = makeCanvas();
		renderer = artEngine ? createWebGLArt(canvas, art) : createWebGLSmiley(canvas);
		if (!renderer) { useCanvasFallback(); }
		else {
			const currentCanvas = canvas;
			currentCanvas.addEventListener('webglcontextlost', event => {
				event.preventDefault();
				if (canvas !== currentCanvas || disposed) { return; }
				useCanvasFallback();
			}, { once: true });
		}
	}
	function syncSurface() {
		if (!canvas) { return; }
		const rendered = Boolean(renderer && renderer.ready !== false);
		canvas.hidden = !active || !rendered;
		canvas.style.transformOrigin = image.style.transformOrigin;
		canvas.dataset.renderer = renderer?.kind ?? 'static';
		canvas.dataset.motion = active && !reduced ? 'live' : 'still';
		canvas.dataset.character = character ?? '';
		charm.dataset.liveRendered = String(Boolean(character && rendered));
		canvas.dataset.artError = artEngine ? art.error ?? '' : '';
	}
	function paint() {
		if (!active || !character || !renderer || !canvas || document.hidden || disposed) { return; }
		const now = performance.now();
		if (now - lastPointerAt >= 900) { targetX = 0; targetY = 0; }
		const elapsed = lastPaintAt ? Math.max(8, Math.min(50, now - lastPaintAt)) : 16;
		lastPaintAt = now;
		gazeX = reduced ? 0 : followGaze(gazeX, targetX, elapsed);
		gazeY = reduced ? 0 : followGaze(gazeY, targetY, elapsed);
		if (now >= nextBlinkAt + 180) { nextBlinkAt = now + (character === 'cloud' ? 4200 : 3100); }
		const blink = reduced ? 0 : Math.max(0, 1 - Math.abs(now - nextBlinkAt - 90) / 90);
		const pressed = charm.classList.contains('dragging') || charm.dataset.keyboardHeld === 'true';
		lastPressed = pressed;
		if (now >= reactionUntil) { reaction = undefined; }
		const expression = pressed ? undefined : reaction;
		const localNow = Date.now();
		if (character === 'cali') { nextOutfitAt = nextLocalMidnight(localNow); }
		renderer.draw({ character, gazeX, gazeY, blink, pressed,
			happy: expression === 'happy', wink: expression === 'wink', greeting: expression === 'hello',
			now: localNow, reducedMotion: reduced,
			reactionProgress: (now - reactionStartedAt) / Math.max(1, reactionUntil - reactionStartedAt) });
		syncSurface();
		canvas.dataset.frames = String(++frames);
		canvas.dataset.expression = pressed ? 'squish' : expression ?? (blink > .5 ? 'blink' : 'smile');
		canvas.dataset.gazeX = gazeX.toFixed(3); canvas.dataset.gazeY = gazeY.toFixed(3);
	}
	function schedule() {
		if (!active || disposed || document.hidden) { return; }
		const now = performance.now();
		const moving = gazeX !== targetX || gazeY !== targetY || (now >= nextBlinkAt && now < nextBlinkAt + 180)
			|| artEngine && !lastPressed && (reaction === 'hello' || reaction === 'happy') && now < reactionUntil;
		if (!reduced && moving) {
			frame = requestAnimationFrame(() => { frame = undefined; paint(); schedule(); });
			return;
		}
		// A deadline can pass while drawing. Keep it until a paint consumes it,
		// otherwise a still face or yesterday's outfit can remain until new input.
		const deadlines = [reaction ? reactionUntil : Infinity];
		if (character === 'cali') {
			deadlines.push(now + Math.max(1, nextOutfitAt - Date.now()));
		}
		if (!reduced) {
			deadlines.push(nextBlinkAt);
			if (targetX || targetY) { deadlines.push(lastPointerAt + 900); }
		}
		const next = Math.min(...deadlines);
		if (Number.isFinite(next)) {
			wake = window.setTimeout(() => { wake = undefined; paint(); schedule(); }, Math.max(1, next - now));
		}
	}
	function refresh() { stop(); paint(); schedule(); }
	function react(expression: 'hello' | 'wink' | 'happy', duration: number) {
		if (!active) { return; }
		reaction = expression; reactionStartedAt = performance.now(); reactionUntil = reactionStartedAt + duration;
		refresh();
	}
	const pointer = (event: PointerEvent) => {
		if (!active || reduced) { return; }
		lastPointerAt = performance.now();
		const bounds = charm.getBoundingClientRect();
		const x = event.clientX - bounds.x - bounds.width / 2, y = event.clientY - bounds.y - bounds.height / 2;
		const proximity = Math.max(0, 1 - Math.hypot(x, y) / 230);
		const nextX = Math.max(-1, Math.min(1, x / 70)) * proximity;
		const nextY = -Math.max(-1, Math.min(1, y / 70)) * proximity;
		if (nextX === targetX && nextY === targetY && !nextX && !nextY) { return; }
		targetX = nextX; targetY = nextY;
		refresh();
	};
	const resetGaze = () => {
		if (targetX === 0 && targetY === 0 && gazeX === 0 && gazeY === 0) { return; }
		targetX = 0; targetY = 0; refresh();
	};
	const greet = () => { if (!reduced && !lastPressed) { react('hello', 450); } };
	charm.addEventListener('pointerenter', greet);
	window.addEventListener('pointermove', pointer, { passive: true });
	window.addEventListener('blur', resetGaze);
	document.addEventListener('pointerleave', resetGaze);
	const press = new MutationObserver(() => {
		const pressed = charm.classList.contains('dragging') || charm.dataset.keyboardHeld === 'true';
		if (!active || pressed === lastPressed) { return; }
		if (!pressed && !reduced) { react('wink', 420); }
		else { refresh(); }
	});
	press.observe(charm, { attributes: true, attributeFilter: ['class', 'data-keyboard-held'] });
	function update(id: string, visible: boolean, reducedMotion: boolean) {
		const nextCharacter = liveCharacter(id);
		const nextActive = Boolean(nextCharacter && visible && !document.hidden);
		const changed = active !== nextActive || character !== nextCharacter || reduced !== reducedMotion;
		const settleReaction = !nextActive || character !== nextCharacter || reducedMotion && !reduced;
		selected = id; character = nextCharacter; lastVisible = visible; active = nextActive; reduced = reducedMotion;
		if (character) { initialize(); }
		if (!active || reduced) { targetX = 0; targetY = 0; gazeX = 0; gazeY = 0; }
		// A greeting or wink that began before Reduced Motion was enabled must
		// not leave a delayed redraw behind. Later explicit win reactions still work.
		if (settleReaction) {
			reaction = undefined; reactionUntil = 0;
		}
		syncSurface();
		if (!changed) { return; }
		nextBlinkAt = performance.now() + 2300; lastPaintAt = 0;
		refresh();
	}
	window.addEventListener('pagehide', event => {
		update(selected, lastVisible, reduced);
		active = false; stop();
		if (event.persisted) { return; }
		disposed = true; press.disconnect(); clearRenderer(); art.dispose();
		charm.removeEventListener('pointerenter', greet);
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
			react('happy', 1100);
		},
	};
}
