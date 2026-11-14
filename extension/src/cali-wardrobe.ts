export interface CaliOutfit {
	id: string;
	label: string;
	file: string;
}

/** Sunday-first, matching the person's local calendar rather than a server timezone. */
export const CALI_WEEK = [
	{ id: 'sunday-knit', label: 'Sunday - soft knit', file: 'live-art-cali-sunday.png' },
	{ id: 'monday-denim', label: 'Monday - denim overshirt', file: 'live-art-cali-monday.png' },
	{ id: 'tuesday-hoodie', label: 'Tuesday - charcoal hoodie', file: 'live-art-cali-tuesday.png' },
	{ id: 'wednesday-vest', label: 'Wednesday - forest vest', file: 'live-art-cali-wednesday.png' },
	{ id: 'thursday-flannel', label: 'Thursday - rust flannel', file: 'live-art-cali-thursday.png' },
	{ id: 'friday-coast', label: 'Friday - coastal casual', file: 'live-art-cali-friday.png' },
	{ id: 'saturday-trail', label: 'Saturday - trail fleece', file: 'live-art-cali-saturday.png' },
] as const satisfies readonly CaliOutfit[];

export type CaliOutfitChoice = 'daily' | typeof CALI_WEEK[number]['id'];

export function restoreCaliOutfit(value: unknown): CaliOutfitChoice {
	return typeof value === 'string' && CALI_WEEK.some(outfit => outfit.id === value) ? value as CaliOutfitChoice : 'daily';
}

export function caliOutfitAt(now: number, choice: CaliOutfitChoice = 'daily'): CaliOutfit {
	const chosen = CALI_WEEK.find(outfit => outfit.id === choice);
	if (chosen) { return chosen; }
	const day = new Date(now).getDay();
	return CALI_WEEK[Number.isFinite(day) ? day : 1];
}
