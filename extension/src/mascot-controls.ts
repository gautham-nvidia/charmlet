import type { CompanionAction } from './companion-core';
import type { MascotSettings } from './mascot-core';

export function createMascotControls(parent: HTMLElement, send: (action: CompanionAction) => void,
	select: () => void, layout: () => void) {
	const details = document.createElement('details'); details.id = 'mascot-settings';
	const summary = document.createElement('summary'); summary.textContent = "Cali's encouragement";
	const hint = document.createElement('p'); hint.className = 'companion-hint';
	hint.textContent = 'A California-inspired golden bear, cheering for your next small step. Click Cali for a little encouragement.';
	const nameLabel = document.createElement('label'); nameLabel.className = 'focus-intent-label';
	nameLabel.textContent = 'Your name (optional)';
	const name = document.createElement('input'); name.id = 'mascot-name'; name.type = 'text'; name.maxLength = 32;
	name.autocomplete = 'off'; name.placeholder = 'Stored only on this device'; nameLabel.append(name);
	function choice(id: string, text: string) {
		const label = document.createElement('label'); label.className = 'care-choice';
		const input = document.createElement('input'); input.type = 'checkbox'; input.id = id;
		label.append(input, document.createTextNode(` ${text}`));
		return { input, label };
	}
	const enabled = choice('mascot-enabled', 'Short encouraging bubbles');
	const nudges = choice('mascot-nudges', 'Gentle focus prompts');
	const actions = document.createElement('div'); actions.className = 'focus-actions';
	const save = document.createElement('button'); save.type = 'button'; save.id = 'mascot-save'; save.textContent = 'Save preferences';
	const hang = document.createElement('button'); hang.type = 'button'; hang.id = 'mascot-hang'; hang.textContent = 'Hang Cali';
	const note = document.createElement('p'); note.className = 'companion-hint';
	note.textContent = 'Quiet bubbles fade away. Escape dismisses one. Celebrations follow the Small wins setting and Reduced Motion.';
	actions.append(save, hang);
	details.append(summary, hint, nameLabel, enabled.label, nudges.label, actions, note); parent.append(details);
	let dirty = false, blocked = true;
	let submitted: string | undefined;
	const draft = () => ({ name: name.value, enabled: enabled.input.checked, focusNudges: nudges.input.checked });
	for (const input of [name, enabled.input, nudges.input]) { input.addEventListener('input', () => { dirty = true; }); }
	const apply = () => {
		if (blocked) { return; }
		submitted = JSON.stringify(draft());
		send({ type: 'mascot-configure', ...draft() });
	};
	save.addEventListener('click', apply);
	name.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } });
	hang.addEventListener('click', () => { if (!blocked) { select(); } });
	details.addEventListener('toggle', layout);
	return {
		render(settings: MascotSettings, disabled: boolean) {
			blocked = disabled;
			if (!dirty) { name.value = settings.name; enabled.input.checked = settings.enabled; nudges.input.checked = settings.focusNudges; }
			for (const control of [name, enabled.input, nudges.input, save, hang]) {
				control.disabled = disabled && document.activeElement !== control;
				control.setAttribute('aria-disabled', String(disabled));
			}
		},
		saved(action: CompanionAction['type'] | undefined) {
			if (action === 'mascot-configure') { dirty = submitted !== JSON.stringify(draft()); submitted = undefined; }
		},
	};
}
