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
			const count = kind === 'confetti' ? 18 : 10;
			for (let index = 0; index < count; index++) {
				const particle = document.createElement('i');
				const angle = index * Math.PI * 2 / count;
				const distance = 52 + index % 3 * 12;
				particle.style.setProperty('--win-x', `${Math.cos(angle) * distance}px`);
				particle.style.setProperty('--win-y', `${Math.sin(angle) * distance}px`);
				particle.style.setProperty('--win-delay', `${index % 3 * 80}ms`);
				particle.style.backgroundColor = ['#f5d58f', '#b4e6d2', '#f3bba7'][index % 3];
				burst.append(particle);
			}
			charm.append(burst);
			timer = window.setTimeout(clear, 2200);
		},
	};
}
