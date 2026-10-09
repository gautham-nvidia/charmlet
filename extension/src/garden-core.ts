export const FLOWERS = [
	{ id: 'sunflower', name: 'Sunflower', accent: '#e9b951' },
	{ id: 'marigold', name: 'Marigold', accent: '#e7a050' },
	{ id: 'hibiscus', name: 'Hibiscus', accent: '#db828c' },
	{ id: 'bluebell', name: 'Bluebell', accent: '#91b6db' },
	{ id: 'iris', name: 'Iris', accent: '#ac95cf' },
	{ id: 'poppy', name: 'Poppy', accent: '#dd8172' },
	{ id: 'orchid', name: 'Orchid', accent: '#c79bd0' },
	{ id: 'daisy', name: 'Daisy', accent: '#d7cd9c' },
	{ id: 'lavender', name: 'Lavender', accent: '#b5a0d2' },
	{ id: 'cosmos', name: 'Cosmos', accent: '#d997b8' },
	{ id: 'sakura', name: 'Sakura', accent: '#dfafbe' },
	{ id: 'wild-rose', name: 'Wild Rose', accent: '#d98d9d' },
] as const;
export type FlowerId = typeof FLOWERS[number]['id'];
export const WATERINGS_TO_BLOOM = 11;
export type GardenStage = 'seed' | 'sprout' | 'leaves' | 'bud' | 'bloom';
export interface GardenPlant { id: string; flowerId: FlowerId; waterings: number; plantedAt: number; }
export interface CollectedFlower { id: FlowerId; blooms: number; firstBloomAt: number; lastBloomAt: number; }
export interface GardenState {
	plant: GardenPlant | null;
	collection: CollectedFlower[];
	lastWateredDay: string | null;
	lastWateredAt: number | null;
}
export type WateringReason = 'no-plant' | 'complete' | 'watered-today' | 'clock-changed' | 'watered' | 'bloomed';
export interface WateringResult { state: GardenState; reason: WateringReason; earned?: FlowerId; }

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function timestamp(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
}
function count(value: unknown, maximum: number, fallback: number) {
	return typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(maximum, value)) : fallback;
}
export function isFlowerId(value: unknown): value is FlowerId {
	return FLOWERS.some(flower => flower.id === value);
}
export function isDayKey(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { return false; }
	const date = new Date(`${value}T12:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function localDayKey(now: number): string {
	if (!timestamp(now)) { throw new Error('Invalid garden clock.'); }
	const date = new Date(now);
	return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function nextLocalMidnight(now: number): number {
	if (!timestamp(now)) { throw new Error('Invalid garden clock.'); }
	const date = new Date(now);
	date.setHours(24, 0, 0, 0);
	return date.getTime();
}
export function emptyGarden(): GardenState {
	return { plant: null, collection: [], lastWateredDay: null, lastWateredAt: null };
}
export function restoreGarden(value: unknown, now: number, today = localDayKey(now)): GardenState {
	if (!isDayKey(today) || !timestamp(now)) { throw new Error('Invalid garden calendar.'); }
	const raw = object(value);
	const collection: CollectedFlower[] = [];
	for (const value of (Array.isArray(raw.collection) ? raw.collection.slice(0, 64) : [])) {
		const item = object(value);
		if (!isFlowerId(item.id)) { continue; }
		const firstBloomAt = timestamp(item.firstBloomAt) ? item.firstBloomAt : now;
		const lastBloomAt = timestamp(item.lastBloomAt) ? Math.max(firstBloomAt, item.lastBloomAt) : firstBloomAt;
		const blooms = Math.max(1, count(item.blooms, 9999, 1));
		const existing = collection.find(flower => flower.id === item.id);
		if (existing) {
			existing.blooms = Math.max(existing.blooms, blooms);
			existing.firstBloomAt = Math.min(existing.firstBloomAt, firstBloomAt);
			existing.lastBloomAt = Math.max(existing.lastBloomAt, lastBloomAt);
		} else { collection.push({ id: item.id, blooms, firstBloomAt, lastBloomAt }); }
	}
	const candidate = object(raw.plant);
	let plant: GardenPlant | null = null;
	if (typeof candidate.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(candidate.id) && isFlowerId(candidate.flowerId)) {
		let waterings = count(candidate.waterings, WATERINGS_TO_BLOOM, 0);
		if (waterings === WATERINGS_TO_BLOOM && !collection.some(flower => flower.id === candidate.flowerId)) { waterings = 10; }
		plant = { id: candidate.id, flowerId: candidate.flowerId, waterings, plantedAt: timestamp(candidate.plantedAt) ? candidate.plantedAt : now };
	}
	const hasProgress = !!plant?.waterings || collection.length > 0;
	const lastWateredDay = isDayKey(raw.lastWateredDay) ? raw.lastWateredDay : hasProgress ? today : null;
	return {
		plant, collection, lastWateredDay,
		lastWateredAt: lastWateredDay ? timestamp(raw.lastWateredAt) ? raw.lastWateredAt : now : null,
	};
}
export function gardenCandidates(state: GardenState): readonly FlowerId[] {
	const uncollected = FLOWERS.filter(flower => !state.collection.some(owned => owned.id === flower.id)).map(flower => flower.id);
	return uncollected.length ? uncollected : FLOWERS.map(flower => flower.id);
}
export function plantGarden(state: GardenState, now: number, id: string, chooseIndex: (count: number) => number): GardenState {
	if (!timestamp(now) || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) { throw new Error('Invalid planting request.'); }
	if (state.plant && state.plant.waterings < WATERINGS_TO_BLOOM) { return state; }
	const candidates = gardenCandidates(state);
	const index = chooseIndex(candidates.length);
	if (!Number.isInteger(index) || index < 0 || index >= candidates.length) { throw new Error('Invalid seed choice.'); }
	return { ...state, plant: { id, flowerId: candidates[index], waterings: 0, plantedAt: now } };
}
export function waterGarden(state: GardenState, now: number, today = localDayKey(now)): WateringResult {
	if (!timestamp(now) || !isDayKey(today)) { throw new Error('Invalid watering clock.'); }
	if (!state.plant) { return { state, reason: 'no-plant' }; }
	if (state.plant.waterings >= WATERINGS_TO_BLOOM) { return { state, reason: 'complete' }; }
	if (state.lastWateredDay && today <= state.lastWateredDay) {
		return { state, reason: today === state.lastWateredDay ? 'watered-today' : 'clock-changed' };
	}
	const plant = { ...state.plant, waterings: state.plant.waterings + 1 };
	let collection = state.collection;
	const bloomed = plant.waterings === WATERINGS_TO_BLOOM;
	if (bloomed) {
		const existing = collection.find(flower => flower.id === plant.flowerId);
		collection = existing
			? collection.map(flower => flower.id === plant.flowerId
				? { ...flower, blooms: Math.min(9999, flower.blooms + 1), lastBloomAt: Math.max(flower.lastBloomAt, now) } : flower)
			: [...collection, { id: plant.flowerId, blooms: 1, firstBloomAt: now, lastBloomAt: now }];
	}
	return {
		state: { plant, collection, lastWateredDay: today, lastWateredAt: now },
		reason: bloomed ? 'bloomed' : 'watered',
		...(bloomed ? { earned: plant.flowerId } : {}),
	};
}
export function gardenStage(state: GardenState): GardenStage {
	const waterings = state.plant?.waterings ?? 0;
	return waterings >= 11 ? 'bloom' : waterings >= 7 ? 'bud' : waterings >= 4 ? 'leaves' : waterings >= 1 ? 'sprout' : 'seed';
}
export function canWaterGarden(state: GardenState, today: string): boolean {
	return isDayKey(today) && !!state.plant && state.plant.waterings < WATERINGS_TO_BLOOM
		&& (!state.lastWateredDay || today > state.lastWateredDay);
}
export function gardenNextChange(state: GardenState, now: number): number | undefined {
	if (!state.plant || state.plant.waterings >= WATERINGS_TO_BLOOM || canWaterGarden(state, localDayKey(now))) { return undefined; }
	return nextLocalMidnight(now);
}
