import { getCharm, type CharmDefinition } from './charm-catalog';
import type { CharmState } from './charm-state';

export interface FestiveDay { name: string; charmKey: string; }

/** Public seasonal dates on the device's local calendar. Thanksgiving is US. */
export function festiveDay(now: number): FestiveDay | undefined {
	const today = new Date(now);
	if (!Number.isFinite(today.getTime())) { return undefined; }
	const year = today.getFullYear();
	const thanksgiving = 22 + (4 - new Date(year, 10, 1).getDay() + 7) % 7;
	const occasions = [
		{ month: 9, day: 31, name: 'Halloween', charmKey: 'pumpkin-patch' },
		{ month: 11, day: 25, name: 'Christmas', charmKey: 'christmas-tree' },
		{ month: 10, day: thanksgiving, name: 'Thanksgiving', charmKey: 'harvest-pie' },
		{ month: 10, day: thanksgiving + 1, name: 'Black Friday', charmKey: 'black-friday-bag' },
		{ month: 10, day: thanksgiving + 4, name: 'Cyber Monday', charmKey: 'cyber-monday-keyboard' },
	];
	return occasions.find(occasion => {
		const date = new Date(year, occasion.month, occasion.day);
		return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
	});
}

export function festiveCharm(day: FestiveDay, charms: readonly CharmDefinition[]): CharmDefinition | undefined {
	return charms.find(charm => charm.id === day.charmKey)
		?? charms.find(charm => {
			const id = charm.id.split(':').at(-1);
			return charm.id.startsWith('pack:') && (id === day.charmKey || id === `new-${day.charmKey}`);
		});
}

/** Derive the visible choice without replacing the user's saved selection. */
export function displayedCharm(state: CharmState, charms: readonly CharmDefinition[], now: number): CharmDefinition {
	const usual = getCharm(state.charmId, charms);
	if (!state.festiveEnabled || state.charmPinned) { return usual; }
	const day = festiveDay(now);
	return day ? festiveCharm(day, charms) ?? usual : usual;
}
