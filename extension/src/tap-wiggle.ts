/** Rotate the artwork at its hook without replacing a squish or the cord's physics. */
export function createTapWiggle(charm: HTMLElement) {
	let enabled = false;
	let animations: Animation[] = [];
	function stop() {
		for (const animation of animations) { animation.cancel(); }
		animations = [];
		charm.dataset.tapMotion = 'idle';
	}
	window.addEventListener('blur', stop);
	window.addEventListener('pagehide', stop);
	document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); } });
	return {
		stop,
		update(allowed: boolean) {
			enabled = allowed;
			if (!enabled && animations.length) { stop(); }
		},
		play() {
			stop();
			if (!enabled || document.hidden) { return; }
			for (const surface of charm.querySelectorAll<HTMLElement>('img, canvas')) {
				if (surface.hidden) { continue; }
				const animation = surface.animate([
					{ rotate: '0deg' }, { rotate: '-5deg', offset: .2 },
					{ rotate: '4deg', offset: .48 }, { rotate: '-2deg', offset: .74 }, { rotate: '0deg' },
				], { duration: 480, easing: 'ease-out' });
				animations.push(animation);
				animation.onfinish = () => {
					animations = animations.filter(current => current !== animation);
					if (!animations.length) { charm.dataset.tapMotion = 'idle'; }
				};
			}
			if (animations.length) { charm.dataset.tapMotion = 'playing'; }
		},
	};
}
