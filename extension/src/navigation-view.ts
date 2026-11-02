import { ChevronDown, createElement, Search, X } from 'lucide';
import type { CharmDefinition } from './charm-catalog';

export type NavigationAction = 'appearance' | 'messages' | 'reminders' | 'close';
interface NavigationOptions {
	image(charm: CharmDefinition): string;
	select(id: string): void;
	action(action: NavigationAction): void;
	onOpen(): void;
	onChange(): void;
}
export interface NavigationView {
	setCatalogue(charms: readonly CharmDefinition[], selected: string): void;
	setReady(ready: boolean): void;
	close(restoreFocus?: boolean): void;
	isOpen(): boolean;
}
function required<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) { throw new Error(`Missing navigation element: ${id}`); }
	return node as T;
}
export function createNavigationView(options: NavigationOptions): NavigationView {
	const charmToggle = required<HTMLButtonElement>('charms-toggle');
	const settingsToggle = required<HTMLButtonElement>('settings-toggle');
	const picker = required<HTMLElement>('charm-picker');
	const menu = required<HTMLElement>('settings-menu');
	const search = required<HTMLInputElement>('charm-search');
	const groups = required<HTMLElement>('charm-groups');
	const grid = required<HTMLElement>('charm-grid');
	const status = required<HTMLElement>('charm-results');
	const empty = required<HTMLElement>('charm-empty');
	let catalogue: readonly CharmDefinition[] = [];
	let selected = '';
	let group = 'All';
	let opener: HTMLButtonElement | undefined;
	let ready = false;
	for (const button of [charmToggle, settingsToggle]) {
		const icon = createElement(ChevronDown, { width: 12, height: 12, 'aria-hidden': 'true' });
		icon.classList.add('nav-chevron');
		button.append(icon);
		button.disabled = true;
	}
	required('charm-search-icon').append(createElement(Search, { width: 14, height: 14, 'aria-hidden': 'true' }));
	for (const id of ['picker-close', 'menu-close']) {
		const button = required<HTMLButtonElement>(id);
		button.append(createElement(X, { width: 14, height: 14, 'aria-hidden': 'true' }));
		button.addEventListener('click', () => close());
	}
	function isOpen() { return !picker.hidden || !menu.hidden; }
	function close(restoreFocus = true) {
		const wasOpen = isOpen();
		picker.hidden = true;
		menu.hidden = true;
		charmToggle.setAttribute('aria-expanded', 'false');
		settingsToggle.setAttribute('aria-expanded', 'false');
		if (wasOpen && restoreFocus) { opener?.focus({ preventScroll: true }); }
		if (wasOpen) { options.onChange(); }
	}
	function render() {
		const focusedGroup = groups.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.group : undefined;
		const names = ['All', ...new Set(catalogue.map(charm => charm.group))];
		if (!names.includes(group)) { group = 'All'; }
		groups.replaceChildren();
		for (const name of names) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = name;
			button.dataset.group = name;
			button.setAttribute('aria-pressed', String(group === name));
			button.addEventListener('click', () => { group = name; render(); });
			groups.append(button);
			if (focusedGroup === name) { button.focus({ preventScroll: true }); }
		}
		const query = search.value.trim().toLowerCase();
		const matches = catalogue.filter(charm => (group === 'All' || group === charm.group)
			&& `${charm.name} ${charm.group} ${charm.description}`.toLowerCase().includes(query));
		grid.replaceChildren();
		for (const charm of matches) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'charm-tile';
			button.dataset.charmId = charm.id;
			button.setAttribute('aria-label', `Select ${charm.name}`);
			button.setAttribute('aria-pressed', String(selected === charm.id));
			button.title = charm.description;
			const image = document.createElement('img');
			image.src = options.image(charm);
			image.alt = '';
			image.width = 54;
			image.height = 63;
			image.loading = 'lazy';
			const name = document.createElement('span');
			name.textContent = charm.name;
			button.append(image, name);
			button.addEventListener('click', () => {
				if (!ready) { return; }
				options.select(charm.id);
				close();
			});
			grid.append(button);
		}
		empty.hidden = matches.length !== 0;
		status.textContent = `${matches.length} ${matches.length === 1 ? 'charm' : 'charms'} in your collection`;
	}
	function open(panel: HTMLElement, button: HTMLButtonElement) {
		if (!ready) { return; }
		if (!panel.hidden) { close(); return; }
		close(false);
		options.onOpen();
		opener = button;
		panel.hidden = false;
		button.setAttribute('aria-expanded', 'true');
		if (panel === picker) {
			search.value = '';
			group = 'All';
			render();
			search.focus({ preventScroll: true });
		} else {
			menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
		}
		options.onChange();
	}
	charmToggle.addEventListener('click', () => open(picker, charmToggle));
	settingsToggle.addEventListener('click', () => open(menu, settingsToggle));
	search.addEventListener('input', render);
	required('clear-charm-search').addEventListener('click', () => { search.value = ''; group = 'All'; render(); search.focus(); });
	for (const button of menu.querySelectorAll<HTMLButtonElement>('[data-action]')) {
		button.addEventListener('click', () => {
			close(false);
			settingsToggle.focus({ preventScroll: true });
			options.action(button.dataset.action as NavigationAction);
		});
	}
	menu.addEventListener('keydown', event => {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { return; }
		event.preventDefault();
		const buttons = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
		const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
			: (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
		buttons[next]?.focus();
	});
	for (const panel of [picker, menu]) {
		panel.addEventListener('keydown', event => {
			if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
		});
	}
	return {
		setCatalogue: (charms, id) => { catalogue = charms; selected = id; if (!picker.hidden) { render(); } },
		setReady: value => { ready = value; charmToggle.disabled = !ready; settingsToggle.disabled = !ready; },
		close, isOpen,
	};
}
