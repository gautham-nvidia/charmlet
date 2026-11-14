import type { CompanionSnapshot } from './companion-core';
import { MASCOT_CHARM, MASCOT_INTERVAL_MS, mascotEncouragement, mascotTransition, type MascotCue } from './mascot-core';

interface MascotViewOptions {
	charm: HTMLElement;
	stage: HTMLElement;
	canShow(): boolean;
	reducedMotion(): boolean;
	cheer(): void;
	celebrate(): void;
}

/** A passive bubble never takes focus or catches clicks on the desktop beneath it. */
export function createMascotView(options: MascotViewOptions) {
	const bubble = document.createElement('div');
	bubble.id = 'mascot-bubble'; bubble.className = 'mascot-bubble'; bubble.hidden = true;
	bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite'); bubble.setAttribute('aria-atomic', 'true');
	const badge = document.createElement('span'); badge.className = 'mascot-badge'; badge.textContent = 'Cali';
	badge.setAttribute('aria-hidden', 'true');
	const words = document.createElement('p'); words.id = 'mascot-words';
	bubble.append(badge, words); options.stage.append(bubble);
	let snapshot: CompanionSnapshot | undefined;
	let active = false, sequence = 0;
	let wake: number | undefined;
	let nextAt = 0, hideAt = 0;
	let pending: { cue: MascotCue; expires: number } | undefined;

	function hide() { bubble.hidden = true; hideAt = 0; }
	function stop() { if (wake !== undefined) { window.clearTimeout(wake); wake = undefined; } }
	function position() {
		if (bubble.hidden) { return; }
		const bounds = options.stage.getBoundingClientRect(), charm = options.charm.getBoundingClientRect();
		const width = Math.min(230, Math.max(80, bounds.width - 16));
		bubble.style.width = `${width}px`;
		const preferred = charm.right + 10 + width < bounds.right ? charm.right - bounds.left + 10
			: charm.left - bounds.left - width - 10 >= 8 ? charm.left - bounds.left - width - 10
				: charm.left - bounds.left + charm.width / 2 - width / 2;
		bubble.style.left = `${Math.max(8, Math.min(bounds.width - width - 8, preferred))}px`;
		const beside = preferred > charm.right - bounds.left || preferred + width < charm.left - bounds.left;
		const below = charm.bottom - bounds.top + 8;
		const above = charm.top - bounds.top - bubble.offsetHeight - 8;
		if (!beside && below + bubble.offsetHeight > bounds.height - 8 && above < 8) {
			hide(); return;
		}
		const top = beside ? charm.top - bounds.top : below + bubble.offsetHeight <= bounds.height - 8 ? below : above;
		bubble.style.top = `${Math.max(8, Math.min(Math.max(8, bounds.height - bubble.offsetHeight - 8), top))}px`;
	}
	function flush() {
		if (!active || !snapshot?.state.mascot.enabled || document.hidden || !options.canShow()) { hide(); return; }
		if (!pending) { position(); return; }
		if (pending.expires < performance.now()) { pending = undefined; return; }
		words.textContent = pending.cue.text; pending = undefined;
		bubble.dataset.still = String(options.reducedMotion());
		bubble.hidden = false; hideAt = performance.now() + 9000;
		options.cheer(); position();
	}
	function schedule() {
		stop();
		if (!active || !snapshot?.state.mascot.enabled || document.hidden) { return; }
		const now = performance.now();
		wake = window.setTimeout(() => {
			wake = undefined;
			const time = performance.now();
			if (hideAt && time >= hideAt) { hide(); }
			if (time >= nextAt) {
				pending = { cue: { text: mascotEncouragement(snapshot!.state, ++sequence), celebrate: false }, expires: time + 15000 };
				nextAt = time + MASCOT_INTERVAL_MS;
			}
			flush(); schedule();
		}, Math.max(50, Math.min(hideAt || Infinity, nextAt || now + MASCOT_INTERVAL_MS) - now));
	}
	function encourage() {
		if (!active || !snapshot?.state.mascot.enabled || document.hidden) { return; }
		const now = performance.now();
		pending = { cue: { text: mascotEncouragement(snapshot.state, ++sequence), celebrate: false }, expires: now + 15000 };
		nextAt = now + MASCOT_INTERVAL_MS; flush(); schedule();
	}
	function refresh() {
		bubble.dataset.still = String(options.reducedMotion());
		flush();
	}
	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !bubble.hidden) { pending = undefined; hide(); schedule(); }
	});
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) { hide(); stop(); pending = undefined; }
		else { nextAt = performance.now() + MASCOT_INTERVAL_MS; refresh(); schedule(); }
	});
	window.addEventListener('pagehide', () => { active = false; pending = undefined; hide(); stop(); });
	return {
		position, refresh, encourage,
		surface(id: string, visible: boolean) {
			const next = id === MASCOT_CHARM && visible;
			if (next !== active) {
				active = next; hide(); pending = undefined;
				if (active && snapshot) {
					pending = { cue: { text: mascotEncouragement(snapshot.state, sequence), celebrate: false }, expires: Infinity };
					nextAt = performance.now() + MASCOT_INTERVAL_MS;
				}
				schedule();
			}
			refresh();
		},
		receive(current: CompanionSnapshot) {
			const before = snapshot;
			const cue = mascotTransition(before, current);
			snapshot = current;
			if (active && !document.hidden) {
				if (cue?.celebrate) { options.celebrate(); }
				if (cue) { pending = { cue, expires: performance.now() + 15000 }; }
				else if (!before || !before.state.mascot.enabled && current.state.mascot.enabled) {
					pending = { cue: { text: mascotEncouragement(current.state, sequence), celebrate: false }, expires: Infinity };
				}
			}
			if (!current.state.mascot.enabled) { pending = undefined; hide(); }
			if (!nextAt) { nextAt = performance.now() + MASCOT_INTERVAL_MS; }
			refresh(); schedule();
		},
	};
}
