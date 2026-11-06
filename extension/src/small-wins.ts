import { localDayKey } from './garden-core';

export const WIN_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;
export interface SmallWin { id: number; day: string; label: string; kind: 'manual' | 'focus'; }
export interface SmallWins {
	total: number;
	day: string;
	today: number;
	lastId: number;
	milestone: number;
	celebrate: boolean;
	recent: SmallWin[];
}
const MAX_COUNT = 1000000;
const bounded = (value: unknown, maximum = MAX_COUNT): number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, maximum) : 0;
const day = (value: unknown): string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';

export function winLabel(value: string): string {
	return Array.from(value.replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
		.replace(/\s+/g, ' ').trim()).slice(0, 100).join('');
}

export function emptyWins(): SmallWins {
	return { total: 0, day: '', today: 0, lastId: 0, milestone: 0, celebrate: false, recent: [] };
}

export function restoreWins(value: unknown): SmallWins {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return emptyWins(); }
	const raw = value as Record<string, unknown>;
	const recent: SmallWin[] = [];
	for (const candidate of Array.isArray(raw.recent) ? raw.recent.slice(0, 20) : []) {
		if (!candidate || typeof candidate !== 'object') { continue; }
		const entry = candidate as Record<string, unknown>;
		const id = bounded(entry.id, 8640000000000000);
		if (!id || !day(entry.day) || typeof entry.label !== 'string'
			|| !winLabel(entry.label) || recent.some(win => win.id === id)) { continue; }
		recent.push({ id, day: day(entry.day), label: winLabel(entry.label), kind: entry.kind === 'focus' ? 'focus' : 'manual' });
	}
	const total = Math.max(recent.length, bounded(raw.total));
	return {
		total, day: day(raw.day), today: Math.min(total, bounded(raw.today)),
		lastId: Math.max(bounded(raw.lastId, 8640000000000000), ...recent.map(win => win.id), 0),
		milestone: WIN_MILESTONES.find(value => value === raw.milestone) ?? 0,
		celebrate: raw.celebrate === true, recent,
	};
}

export function winsToday(wins: SmallWins, now: number): number {
	return wins.day === localDayKey(now) ? wins.today : 0;
}

export function recordWin(wins: SmallWins, label: string, kind: SmallWin['kind'], now: number): SmallWins {
	const total = Math.min(MAX_COUNT, wins.total + 1);
	const id = Math.max(now, wins.lastId + 1);
	const currentDay = localDayKey(now);
	const milestone = [...WIN_MILESTONES].reverse().find(value => value <= total) ?? 0;
	return {
		...wins, total, day: currentDay, today: Math.min(MAX_COUNT, winsToday(wins, now) + 1), lastId: id,
		milestone: Math.max(wins.milestone, milestone),
		recent: [{ id, day: currentDay, label: winLabel(label), kind }, ...wins.recent].slice(0, 20),
	};
}

export function removeWin(wins: SmallWins, id: number): SmallWins {
	const entry = wins.recent.find(win => win.id === id);
	if (!entry) { return wins; }
	return { ...wins, total: Math.max(0, wins.total - 1),
		today: Math.max(0, wins.today - (entry.day === wins.day ? 1 : 0)),
		recent: wins.recent.filter(win => win.id !== id) };
}
