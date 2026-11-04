import { getCharm, type CharmDefinition } from './charm-catalog';
import type { CharmState } from './charm-state';

export interface FestiveDay { name: string; charmKey: string; alternatives?: readonly string[]; }

function nthWeekday(year: number, month: number, weekday: number, occurrence: number): number {
	return 1 + (weekday - new Date(year, month, 1).getDay() + 7) % 7 + 7 * (occurrence - 1);
}

function lastMonday(year: number, month: number): number {
	const last = new Date(year, month + 1, 0);
	return last.getDate() - (last.getDay() - 1 + 7) % 7;
}

/** Gregorian Easter; all dates below are celebrations, not shifted office-closure dates. */
function easter(year: number): { month: number; day: number } {
	const a = year % 19;
	const b = Math.floor(year / 100), c = year % 100;
	const d = Math.floor(b / 4), e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4), k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const date = h + l - 7 * m + 114;
	return { month: Math.floor(date / 31) - 1, day: date % 31 + 1 };
}

const christmasCharms = [
	'santa-claus', 'reindeer', 'snow-globe', 'christmas-tree',
	'gingerbread-house', 'holiday-wreath', 'christmas-stocking', 'candy-cane',
];

/** US occasions and a Christmas-season rotation, using the device's local calendar. */
export function festiveDay(now: number): FestiveDay | undefined {
	const today = new Date(now);
	if (!Number.isFinite(today.getTime())) { return undefined; }
	const year = today.getFullYear();
	const thanksgiving = nthWeekday(year, 10, 4, 4);
	const occasions = [
		{ month: 0, day: 1, name: "New Year's Day", charmKey: 'new-year-popper' },
		{ month: 0, day: nthWeekday(year, 0, 1, 3), name: 'Martin Luther King Jr. Day', charmKey: 'peace-dove' },
		{ month: 1, day: 14, name: "Valentine's Day", charmKey: 'valentine-chocolates' },
		{ month: 1, day: nthWeekday(year, 1, 1, 3), name: "Presidents' Day", charmKey: 'white-house' },
		{ month: 2, day: 17, name: "St. Patrick's Day", charmKey: 'shamrock' },
		{ ...easter(year), name: 'Easter', charmKey: 'easter-basket' },
		{ month: 3, day: 22, name: 'Earth Day', charmKey: 'earth' },
		{ month: 4, day: nthWeekday(year, 4, 0, 2), name: "Mother's Day", charmKey: 'flower-wild-rose' },
		{ month: 4, day: lastMonday(year, 4), name: 'Memorial Day', charmKey: 'flower-poppy' },
		{ month: 5, day: 19, name: 'Juneteenth', charmKey: 'freedom-bell' },
		{ month: 5, day: nthWeekday(year, 5, 0, 3), name: "Father's Day", charmKey: 'filter-coffee' },
		{ month: 6, day: 4, name: 'Independence Day', charmKey: 'independence-rockets' },
		{ month: 8, day: nthWeekday(year, 8, 1, 1), name: 'Labor Day', charmKey: 'labor-day-gear' },
		{ month: 9, day: 31, name: 'Halloween', charmKey: 'pumpkin-patch' },
		{ month: 10, day: 11, name: 'Veterans Day', charmKey: 'remembrance-flag' },
		{ month: 10, day: thanksgiving, name: 'Thanksgiving', charmKey: 'harvest-pie' },
		{ month: 10, day: thanksgiving + 1, name: 'Black Friday', charmKey: 'black-friday-bag' },
		{ month: 10, day: thanksgiving + 4, name: 'Cyber Monday', charmKey: 'cyber-monday-keyboard' },
		{ month: 11, day: 24, name: 'Christmas Eve', charmKey: 'santa-claus' },
		{ month: 11, day: 25, name: 'Christmas', charmKey: 'christmas-tree' },
		{ month: 11, day: 31, name: "New Year's Eve", charmKey: 'new-year-popper' },
	];
	const occasion = occasions.find(occasion => {
		const date = new Date(year, occasion.month, occasion.day);
		return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
	});
	if (occasion) { return occasion; }
	if (today.getMonth() === 11) {
		const start = (today.getDate() - 1) % christmasCharms.length;
		const choices = [...christmasCharms.slice(start), ...christmasCharms.slice(0, start)];
		return { name: 'Christmas season', charmKey: choices[0], alternatives: choices.slice(1) };
	}
	return undefined;
}

export function festiveCharm(day: FestiveDay, charms: readonly CharmDefinition[]): CharmDefinition | undefined {
	for (const key of [day.charmKey, ...day.alternatives ?? []]) {
		const match = charms.find(charm => charm.id === key) ?? charms.find(charm => {
			const id = charm.id.split(':').at(-1);
			return (charm.id.startsWith('pack:') || charm.id.startsWith('trial:'))
				&& (id === key || id === `new-${key}`);
		});
		if (match) { return match; }
	}
	return undefined;
}

/** Derive the visible choice without replacing the user's saved selection. */
export function displayedCharm(state: CharmState, charms: readonly CharmDefinition[], now: number): CharmDefinition {
	const usual = getCharm(state.charmId, charms);
	if (!state.festiveEnabled || state.charmPinned) { return usual; }
	const day = festiveDay(now);
	return day ? festiveCharm(day, charms) ?? usual : usual;
}
