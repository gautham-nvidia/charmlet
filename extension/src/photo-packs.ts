import { MAX_PACK_BYTES, parseCharmPack, type CharmPack } from './charm-packs';

export function isPhotoPack(pack: CharmPack): boolean {
	return /^photo-[a-z0-9-]{1,41}$/.test(pack.id)
		&& pack.charms.length === 1 && pack.charms[0].id === 'portrait' && pack.charms[0].group === 'Personal Keepsakes';
}

/** The renderer can save only a bounded personal-photo pack, never a filesystem path. */
export function photoPackInput(value: unknown): string {
	if (typeof value !== 'string' || value.length > MAX_PACK_BYTES) { throw new Error('The photo charm is too large to save.'); }
	if (!isPhotoPack(parseCharmPack(value))) { throw new Error('Choose a photo and a keepsake frame before saving.'); }
	return value;
}
