import { CHARMS, type CharmDefinition } from './charm-catalog';
import { charmCollection } from './charm-collections';
import { currentAccess, type AccessGrant } from './access-grant';
import selection from './starter-selection.json';

export const PRO_LAUNCH_CENTS = 749;
export const PRO_REGULAR_CENTS = 1749;
export const ITEM_PRICE_TIERS = [49, 99, 199] as const;

const starterIds = new Set(selection.starter);
const freeDownloadIds = new Set(selection.freeDownloads);

/** Fixed picks stay free across releases; reordering the gallery cannot silently withdraw a starter charm. */
export function starterSelection(catalogue: readonly CharmDefinition[] = CHARMS): string[] {
	return catalogue.filter(charm => starterIds.has(charm.id)).map(charm => charm.id);
}

/** Additional free picks are claimed online; they do not consume a Pro trial. */
export function freeDownloadSelection(catalogue: readonly CharmDefinition[] = CHARMS): string[] {
	return catalogue.filter(charm => freeDownloadIds.has(charm.id)).map(charm => charm.id);
}

export function charmPriceCents(charm: CharmDefinition): 0 | 49 | 99 | 199 {
	if (starterIds.has(charm.id) || freeDownloadIds.has(charm.id)) { return 0; }
	if (charm.id.startsWith('live:') || charm.id.startsWith('fidget:')) { return 199; }
	return ['Zodiac', 'Gemstones', 'Flowers', 'Sports'].includes(charmCollection(charm)) ? 49 : 99;
}

/** The host applies this before sending a catalogue to the renderer. Local photos/imports and earned flowers remain. */
export function accessibleCatalogue(
	catalogue: readonly CharmDefinition[],
	access: { grant?: AccessGrant; legacyIds?: readonly string[]; lastSeenMs?: number },
	nowMs = Date.now(),
): CharmDefinition[] {
	const active = currentAccess(access.grant, nowMs, access.lastSeenMs);
	if (active && ['trial', 'pro'].includes(access.grant!.kind)) { return [...catalogue]; }
	const owned = new Set([
		...starterSelection(), ...(access.legacyIds ?? []),
		...(access.grant?.items ?? []),
	]);
	return catalogue.filter(charm => owned.has(charm.id) || charm.id.startsWith('pack:')
		|| charm.id.startsWith('garden:'));
}
