import type { CompanionAction } from './companion-core';
import { winLabel, winsToday, type SmallWins } from './small-wins';

export function createSmallWinsView(parent: HTMLElement, send: (action: CompanionAction) => void, layout: () => void) {
	const details = document.createElement('details');
	details.id = 'small-wins';
	details.innerHTML = `<summary>Small wins <span id="win-count"></span></summary>
		<p id="wins-total" class="companion-hint"></p>
		<form id="win-form"><label for="win-label">Something you finished</label>
		<div class="win-entry"><input id="win-label" type="text" maxlength="100" autocomplete="off" placeholder="One step worth remembering" required>
		<button id="win-add" type="submit">Record win</button></div></form>
		<label class="win-celebration-choice"><input id="wins-celebrate" type="checkbox"> Celebrate milestones</label>
		<p class="companion-hint">Completed focus sessions count automatically. Celebrations are brief and silent; Reduced Motion keeps them still.</p>
		<ul id="win-list" aria-label="Your recent small wins"></ul>
		<p class="companion-hint">Your last 20 notes stay on this device. The total keeps growing.</p>
		<button id="wins-clear" type="button">Clear wins</button>
		<div id="wins-confirm" hidden><p>Clear all win counts and saved notes?</p>
		<div class="win-confirm-actions"><button id="wins-confirm-clear" type="button">Clear all wins</button><button id="wins-cancel-clear" type="button">Keep my wins</button></div></div>`;
	parent.append(details);
	const get = <T extends HTMLElement>(id: string) => details.querySelector<T>(`#${id}`)!;
	const input = get<HTMLInputElement>('win-label');
	const add = get<HTMLButtonElement>('win-add');
	const celebrate = get<HTMLInputElement>('wins-celebrate');
	const list = get<HTMLUListElement>('win-list');
	const clear = get<HTMLButtonElement>('wins-clear');
	const confirm = get<HTMLDivElement>('wins-confirm');
	const confirmClear = get<HTMLButtonElement>('wins-confirm-clear');
	const cancelClear = get<HTMLButtonElement>('wins-cancel-clear');
	let locked = true;
	let listKey = '';

	// Keep keyboard focus while a save is pending, without accepting another action.
	details.addEventListener('click', event => {
		if (locked && event.target instanceof Element && event.target.closest('[aria-disabled="true"]')) {
			event.preventDefault();
			event.stopPropagation();
		}
	}, true);
	get<HTMLFormElement>('win-form').addEventListener('submit', event => {
		event.preventDefault();
		const label = winLabel(input.value);
		if (locked || !label) { return; }
		send({ type: 'win-add', label });
	});
	celebrate.addEventListener('change', () => { if (!locked) { send({ type: 'wins-celebrate', enabled: celebrate.checked }); } });
	clear.addEventListener('click', () => { confirm.hidden = false; cancelClear.focus({ preventScroll: true }); layout(); });
	cancelClear.addEventListener('click', () => { confirm.hidden = true; clear.focus({ preventScroll: true }); layout(); });
	confirmClear.addEventListener('click', () => { if (!locked) { send({ type: 'wins-clear' }); } });
	details.addEventListener('toggle', () => { if (!details.open) { confirm.hidden = true; } layout(); });

	function renderList(wins: SmallWins) {
		const key = JSON.stringify(wins.recent);
		if (key !== listKey) {
			listKey = key;
			const active = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
			const focusedId = list.contains(active ?? null) ? active?.dataset.winId : undefined;
			list.replaceChildren();
			for (const win of wins.recent) {
				const row = document.createElement('li');
				const text = document.createElement('span');
				text.textContent = win.label;
				text.title = `${win.day}${win.kind === 'focus' ? ' - Focus session' : ''}`;
				const undo = document.createElement('button');
				undo.type = 'button';
				undo.textContent = 'Undo';
				undo.dataset.winId = String(win.id);
				undo.setAttribute('aria-label', `Undo win: ${win.label}`);
				undo.addEventListener('click', () => { if (!locked) { send({ type: 'win-remove', id: win.id }); } });
				row.append(text, undo);
				list.append(row);
			}
			if (focusedId) {
				(list.querySelector<HTMLButtonElement>(`[data-win-id="${focusedId}"]`) ?? input).focus({ preventScroll: true });
			}
		}
		for (const button of list.querySelectorAll('button')) { button.setAttribute('aria-disabled', String(locked)); }
	}

	return {
		render(wins: SmallWins, now: number, busy: boolean) {
			locked = busy;
			const today = winsToday(wins, now);
			get('win-count').textContent = `${today} today`;
			get('wins-total').textContent = `${wins.total} ${wins.total === 1 ? 'small win' : 'small wins'} saved. Keep building on your progress.`;
			input.readOnly = busy;
			for (const control of [add, celebrate, clear, confirmClear, cancelClear]) {
				control.setAttribute('aria-disabled', String(busy));
			}
			if (!busy) { celebrate.checked = wins.celebrate; }
			clear.disabled = wins.total === 0;
			renderList(wins);
		},
		saved(action?: CompanionAction['type']) {
			if (action === 'win-add') { input.value = ''; }
			if (action === 'wins-clear') {
				const restore = confirm.contains(document.activeElement);
				confirm.hidden = true;
				if (restore) { details.querySelector('summary')!.focus({ preventScroll: true }); }
			}
		},
	};
}
