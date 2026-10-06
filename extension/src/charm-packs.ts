import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import type { CharmDefinition } from './charm-catalog';

export interface PackCharm {
	id: string;
	name: string;
	group: string;
	description: string;
	accent: string;
	png: string;
}

export interface CharmPack {
	format: 'charmlet-pack';
	version: 1;
	id: string;
	name: string;
	author: string;
	charms: PackCharm[];
}

export const MAX_PACK_BYTES = 2 * 1024 * 1024;
export const MAX_PNG_BYTES = 256 * 1024;

const PACK_ID = /^[a-z][a-z0-9-]{0,47}$/;
const PACK_FILE = /^[a-z][a-z0-9-]{0,47}\.charmlet\.json$/;
const DEVICE_ID = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) {
			crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(bytes: Buffer): void {
	if (bytes.length > MAX_PNG_BYTES || bytes.length < 45
		|| !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
		throw new Error('A charm must contain a bounded static PNG image.');
	}
	let offset = 8;
	let chunks = 0;
	let width = 0;
	let height = 0;
	let channels = 0;
	let seenData = false;
	let dataClosed = false;
	let ended = false;
	const compressed: Buffer[] = [];
	const ancillary = new Map([['sRGB', 1], ['gAMA', 4], ['cHRM', 32], ['pHYs', 9]]);
	while (offset < bytes.length) {
		if (++chunks > 128 || offset + 12 > bytes.length) {
			throw new Error('The PNG chunk structure is invalid.');
		}
		const length = bytes.readUInt32BE(offset);
		const end = offset + length + 12;
		if (end > bytes.length) { throw new Error('The PNG chunk is truncated.'); }
		const type = bytes.toString('ascii', offset + 4, offset + 8);
		const data = bytes.subarray(offset + 8, end - 4);
		if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) {
			throw new Error('The PNG checksum is invalid.');
		}
		if (chunks === 1) {
			if (type !== 'IHDR' || length !== 13) { throw new Error('The PNG header is invalid.'); }
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			if (width < 72 || width > 576 || width % 72 !== 0 || height !== width / 72 * 84) {
				throw new Error('Charm image dimensions must be 72x84 multiples up to 576x672.');
			}
			if (data[8] !== 8 || ![2, 6].includes(data[9]) || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
				throw new Error('Use an eight-bit, noninterlaced RGB or RGBA PNG.');
			}
			channels = data[9] === 6 ? 4 : 3;
		} else if (type === 'IDAT') {
			if (dataClosed || length === 0) { throw new Error('The PNG image-data sequence is invalid.'); }
			seenData = true;
			compressed.push(data);
		} else if (type === 'IEND') {
			if (length !== 0 || !seenData || end !== bytes.length) { throw new Error('The PNG ending is invalid.'); }
			ended = true;
		} else if (ancillary.has(type)) {
			if (length !== ancillary.get(type)) { throw new Error('The PNG metadata is invalid.'); }
			if (seenData) { dataClosed = true; }
		} else {
			throw new Error('Only static PNG artwork with standard color metadata is supported.');
		}
		offset = end;
	}
	if (!ended) { throw new Error('The PNG ending is missing.'); }
	const stride = width * channels + 1;
	const expected = stride * height;
	let inflated: Buffer;
	try {
		inflated = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected });
	} catch {
		throw new Error('The PNG image data is invalid or exceeds its declared dimensions.');
	}
	if (inflated.length !== expected) { throw new Error('The PNG image length is invalid.'); }
	for (let row = 0; row < height; row++) {
		if (inflated[row * stride] > 4) { throw new Error('The PNG scanline filter is invalid.'); }
	}
}

function record(value: unknown, field: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${field} must be an object.`);
	}
	return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maximum: number): string {
	if (typeof value !== 'string' || !value.trim() || value.length > maximum || FORBIDDEN_TEXT.test(value)) {
		throw new Error(`${field} must be short plain text.`);
	}
	return value.trim();
}

function identifier(value: unknown, field: string): string {
	const result = text(value, field, 48);
	if (!PACK_ID.test(result) || DEVICE_ID.test(result)) { throw new Error(`${field} must use a portable lowercase ID with letters, digits and hyphens.`); }
	return result;
}

export function parseCharmPack(input: string | Uint8Array): CharmPack {
	const length = typeof input === 'string' ? Buffer.byteLength(input, 'utf8') : input.byteLength;
	if (length > MAX_PACK_BYTES) { throw new Error('The charm pack is too large (maximum 2 MiB).'); }
	let decoded: unknown;
	try { decoded = JSON.parse(typeof input === 'string' ? input : Buffer.from(input).toString('utf8')); }
	catch { throw new Error('The charm pack is not valid JSON.'); }
	const root = record(decoded, 'Pack');
	if (root.format !== 'charmlet-pack' || root.version !== 1) {
		throw new Error('This charm-pack format is not supported.');
	}
	if (!Array.isArray(root.charms) || root.charms.length < 1 || root.charms.length > 12) {
		throw new Error('A charm pack must contain 1 to 12 charms.');
	}
	const seen = new Set<string>();
	const charms = root.charms.map((entry, index): PackCharm => {
		const value = record(entry, `Charm ${index + 1}`);
		const id = identifier(value.id, 'Charm ID');
		if (seen.has(id)) { throw new Error('Charm IDs in a pack must be unique.'); }
		seen.add(id);
		const accent = text(value.accent, 'Accent', 7);
		if (!/^#[0-9a-fA-F]{6}$/.test(accent)) { throw new Error('Use a six-digit hex accent color.'); }
		if (typeof value.png !== 'string' || value.png.length > Math.ceil(MAX_PNG_BYTES / 3) * 4
			|| !/^[A-Za-z0-9+/]+={0,2}$/.test(value.png)) {
			throw new Error('A charm image must be bounded base64 PNG data.');
		}
		const png = Buffer.from(value.png, 'base64');
		if (png.toString('base64') !== value.png) { throw new Error('The PNG base64 encoding is invalid.'); }
		validatePng(png);
		return {
			id,
			name: text(value.name, 'Charm name', 48),
			group: text(value.group, 'Charm group', 48),
			description: text(value.description, 'Charm description', 160),
			accent: accent.toLowerCase(),
			png: value.png,
		};
	});
	return {
		format: 'charmlet-pack',
		version: 1,
		id: identifier(root.id, 'Pack ID'),
		name: text(root.name, 'Pack name', 48),
		author: text(root.author, 'Pack author', 80),
		charms,
	};
}

export function packCharms(packs: readonly CharmPack[]): CharmDefinition[] {
	return packs.flatMap(pack => pack.charms.map(charm => ({
		id: `pack:${pack.id}:${charm.id}`,
		name: charm.name,
		file: '',
		description: charm.description,
		accent: charm.accent,
		group: charm.group,
		source: `data:image/png;base64,${charm.png}`,
	})));
}

async function readPackFile(path: string): Promise<CharmPack> {
	const info = await fs.lstat(path);
	if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_PACK_BYTES) {
		throw new Error('The stored pack is not a bounded regular file.');
	}
	return parseCharmPack(await fs.readFile(path));
}

export async function loadPacks(directory: string): Promise<{ packs: CharmPack[]; invalid: string[] }> {
	let entries;
	try { entries = await fs.readdir(directory, { withFileTypes: true }); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') { return { packs: [], invalid: [] }; }
		throw error;
	}
	const packs: CharmPack[] = [];
	const invalid: string[] = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (!entry.isFile() || !PACK_FILE.test(entry.name)) { continue; }
		try {
			const pack = await readPackFile(join(directory, entry.name));
			if (`${pack.id}.charmlet.json` !== entry.name) { throw new Error('Pack identity does not match its filename.'); }
			packs.push(pack);
		} catch { invalid.push(entry.name); }
	}
	return { packs, invalid };
}

export async function installPack(directory: string, input: string | Uint8Array): Promise<{ pack: CharmPack; added: boolean }> {
	const pack = parseCharmPack(input);
	const canonical = JSON.stringify(pack);
	await fs.mkdir(directory, { recursive: true });
	const target = join(directory, `${pack.id}.charmlet.json`);
	let handle;
	try { handle = await fs.open(target, 'wx'); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'EEXIST') { throw error; }
		const existing = await readPackFile(target);
		if (JSON.stringify(existing) === canonical) { return { pack: existing, added: false }; }
		throw new Error('A different pack with this ID is installed. Remove it before importing the new pack.');
	}
	try {
		await handle.writeFile(`${canonical}\n`, 'utf8');
	} catch (error) {
		await handle.close();
		await fs.unlink(target).catch(() => {});
		throw error;
	}
	await handle.close();
	return { pack, added: true };
}

export async function removePack(directory: string, id: string): Promise<void> {
	const safeId = identifier(id, 'Pack ID');
	await fs.unlink(join(directory, `${safeId}.charmlet.json`));
}
