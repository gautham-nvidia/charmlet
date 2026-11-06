import { chainLinks, cordPath, type CordPoint, type CordStyle } from './cord-design';

const SVG = 'http://www.w3.org/2000/svg';
const profiles: Record<CordStyle, { base: string; light: string; width: number; dash?: string }> = {
	thread: { base: '#8e6e57', light: '#e7c8a2', width: 1.8 },
	soft: { base: '#285d60', light: '#a7ded2', width: 3.4 },
	braid: { base: '#85272c', light: '#f2b789', width: 4, dash: '2 3' },
	leather: { base: '#503927', light: '#bd8f5d', width: 3.8, dash: '1 7' },
	ribbon: { base: '#9e4a6d', light: '#f5c5d6', width: 5 },
	'silver-chain': { base: '#4e5c66', light: '#e5eef3', width: 1 },
	'gold-chain': { base: '#7d5623', light: '#f5d985', width: 1 },
	'ball-chain': { base: '#52636a', light: '#deeceb', width: .9 },
};

export function createCordView(svg: SVGElement, thread: SVGPathElement) {
	const path = (id: string) => {
		const node = document.createElementNS(SVG, 'path');
		node.id = id;
		node.setAttribute('fill', 'none');
		node.setAttribute('stroke-linecap', 'round');
		node.setAttribute('stroke-linejoin', 'round');
		svg.append(node);
		return node;
	};
	const shadow = path('cord-shadow');
	svg.insertBefore(shadow, thread);
	const highlight = path('cord-highlight');
	const links = path('cord-links');
	const shine = path('cord-shine');
	let previous = '';
	return {
		render(style: CordStyle, anchor: CordPoint, hook: CordPoint) {
			const curve = cordPath(anchor, hook);
			const key = `${style}:${curve}`;
			if (key === previous) { return; }
			previous = key;
			svg.dataset.style = style;
			const profile = profiles[style];
			const metal = style.endsWith('chain');
			for (const node of [shadow, thread, highlight]) { node.setAttribute('d', curve); }
			shadow.setAttribute('stroke', '#101c2460');
			shadow.setAttribute('stroke-width', String(profile.width + 1.2));
			thread.style.stroke = profile.base;
			thread.style.strokeWidth = String(profile.width);
			highlight.setAttribute('stroke', profile.light);
			highlight.setAttribute('stroke-width', String(metal ? .45 : style === 'ribbon' ? 2.6 : profile.width * .38));
			highlight.setAttribute('stroke-dasharray', profile.dash ?? 'none');
			const geometry = metal ? chainLinks(anchor, hook, style === 'ball-chain') : '';
			links.setAttribute('d', geometry);
			links.setAttribute('stroke', profile.base);
			links.setAttribute('stroke-width', '1.8');
			links.setAttribute('fill', style === 'ball-chain' ? profile.light : 'none');
			shine.setAttribute('d', geometry);
			shine.setAttribute('stroke', profile.light);
			shine.setAttribute('stroke-width', '.7');
		},
	};
}
