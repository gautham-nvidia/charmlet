export function createWinCelebration(charm: HTMLElement, reducedMotion: () => boolean) {
	let burst: HTMLElement | undefined;
	let timer: number | undefined;
	const clear = () => {
		if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; }
		burst?.remove();
		burst = undefined;
	};
	return {
		clear,
		show(kind: 'sparkles' | 'confetti' = 'sparkles') {
			clear();
			if (document.hidden) { return; }
			burst = document.createElement('span');
			burst.className = 'win-sparkles';
			burst.dataset.kind = kind;
			burst.dataset.still = String(reducedMotion());
			burst.setAttribute('aria-hidden', 'true');
			const count = kind === 'confetti' ? 28 : 10;
			for (let index = 0; index < count; index++) {
				const particle = document.createElement('i');
				const angle = index * Math.PI * 2 / count;
				const distance = 64 + index % 4 * 14;
				particle.style.setProperty('--win-x', `${Math.cos(angle) * distance}px`);
				particle.style.setProperty('--win-y', `${Math.sin(angle) * distance}px`);
				particle.style.setProperty('--win-delay', `${index % 3 * 80}ms`);
				particle.style.backgroundColor = ['#f5c85f', '#8dd8b6', '#ef9e87', '#8aaee8', '#c5a1df'][index % 5];
				burst.append(particle);
			}
			charm.append(burst);
			timer = window.setTimeout(clear, 2200);
		},
	};
}
