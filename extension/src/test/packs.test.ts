import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { test } from 'node:test';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHARMS } from '../charm-catalog';
import {
	installPack, loadPacks, MAX_PACK_BYTES, MAX_PNG_BYTES, packCharms, parseCharmPack, removePack,
} from '../charm-packs';
import { restoreState } from '../charm-state';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEgAAABUCAYAAAAh+XGnAAAAp0lEQVR4Ae3BAQGAQACEMLxqdrKGkf0EkoDtut/nI79G1IgaUSNqRI2oETWiRtSIGlEjakSNqBE1okbUiBpRI2pEjagRNaJG1IgaUSNqRI2oETWiRtSIGlEjakSNqBE1okbUiBpRI2pEjagRNaJG1IgaUSNqRI2oETWiRtSIGlEjakSNqBE1okbUiBpRI2pEjagRNaJG1IgaUSNqRI2oETWiRtSIGlEHeOoC77RBk0cAAAAASUVORK5CYII=';

function pack(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		format: 'charmlet-pack', version: 1, id: 'probe-card', name: 'Probe Card', author: 'Charmlet',
		charms: [{
			id: 'probe-card', name: 'Probe Card', group: 'Silicon & Code', description: 'A tiny probe card.',
			accent: '#8DB7A6', png: PNG, source: 'https://example.invalid/ignored.svg',
		}],
		...overrides,
	};
}

function encoded(value: unknown): string {
	return JSON.stringify(value);
}

test('valid packs project only approved fields with namespaced PNG sources', () => {
	const parsed = parseCharmPack(encoded(pack()));
	assert.deepEqual(parsed, {
		format: 'charmlet-pack', version: 1, id: 'probe-card', name: 'Probe Card', author: 'Charmlet',
		charms: [{
			id: 'probe-card', name: 'Probe Card', group: 'Silicon & Code', description: 'A tiny probe card.',
			accent: '#8db7a6', png: PNG,
		}],
	});
	const projected = packCharms([parsed]);
	assert.equal(projected.length, 1);
	assert.equal(projected[0].id, 'pack:probe-card:probe-card');
	assert.equal(projected[0].file, '');
	assert.equal(projected[0].source, `data:image/png;base64,${PNG}`);
	assert.equal(projected.some(charm => CHARMS.some(builtin => builtin.id === charm.id)), false);
});

test('invalid metadata, identifiers, text, sizes and payloads are rejected before storage', async () => {
	const validCharm = (pack().charms as Record<string, unknown>[])[0];
	const cases: unknown[] = [
		{ ...pack(), format: 'other' },
		{ ...pack(), version: 2 },
		{ ...pack(), charms: [] },
		{ ...pack(), charms: Array.from({ length: 13 }, (_, index) => ({ ...validCharm, id: `charm-${index}` })) },
		{ ...pack(), charms: [validCharm, { ...validCharm }] },
		{ ...pack(), id: '../outside' },
		{ ...pack(), id: 'nul' },
		{ ...pack(), id: 'com1' },
		{ ...pack(), name: 'Bad\u0000Name' },
		{ ...pack(), charms: [{ ...validCharm, description: 'Bad\u202eText' }] },
		{ ...pack(), charms: [{ ...validCharm, accent: 'blue' }] },
		{ ...pack(), charms: [{ ...validCharm, png: 'data:image/svg+xml;base64,PHN2Zy8+' }] },
		{ ...pack(), charms: [{ ...validCharm, png: Buffer.from('<svg/>').toString('base64') }] },
		{ ...pack(), charms: [{ ...validCharm, png: 'A'.repeat(Math.ceil(MAX_PNG_BYTES / 3) * 4 + 1) }] },
	];
	for (const value of cases) {
		assert.throws(() => parseCharmPack(encoded(value)));
	}
	assert.throws(() => parseCharmPack(encoded({ ...pack(), padding: 'x'.repeat(MAX_PACK_BYTES) })));

	const root = mkdtempSync(join(tmpdir(), 'charmlet-pack-invalid-'));
	const directory = join(root, 'packs');
	try {
		await assert.rejects(installPack(directory, encoded({ ...pack(), id: '../outside' })));
		await assert.rejects(readdir(directory));
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('PNG checksum corruption and valid-CRC animation control chunks are rejected', () => {
	const png = Buffer.from(PNG, 'base64');
	const corrupted = Buffer.from(png);
	corrupted[corrupted.length - 5] ^= 1;
	const animated = Buffer.concat([
		png.subarray(0, 33), Buffer.from('AAAACGFjVEwAAAABAAAAALQt6aA=', 'base64'), png.subarray(33),
	]);
	for (const bytes of [corrupted, animated]) {
		const value = pack({ charms: [{ ...(pack().charms as Record<string, unknown>[])[0], png: bytes.toString('base64') }] });
		assert.throws(() => parseCharmPack(encoded(value)));
	}
});

test('pack storage is exclusive, idempotent and removes only its own file', async () => {
	const root = mkdtempSync(join(tmpdir(), 'charmlet-pack-store-'));
	const directory = join(root, 'packs');
	try {
		const first = await installPack(directory, encoded(pack()));
		assert.equal(first.added, true);
		assert.deepEqual((await loadPacks(directory)).packs, [first.pack]);
		const original = await readFile(join(directory, 'probe-card.charmlet.json'), 'utf8');
		const repeated = await installPack(directory, encoded(pack()));
		assert.equal(repeated.added, false);
		await assert.rejects(installPack(directory, encoded(pack({ name: 'Different Probe Card' }))));
		assert.equal(await readFile(join(directory, 'probe-card.charmlet.json'), 'utf8'), original);
		await writeFile(join(directory, 'sentinel.txt'), 'keep', 'utf8');
		await removePack(directory, 'probe-card');
		assert.equal(await readFile(join(directory, 'sentinel.txt'), 'utf8'), 'keep');
		assert.deepEqual((await loadPacks(directory)).packs, []);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('stored corruption is isolated and catalogue restoration preserves safe preferences', async () => {
	const root = mkdtempSync(join(tmpdir(), 'charmlet-pack-load-'));
	const directory = join(root, 'packs');
	try {
		const installed = await installPack(directory, encoded(pack()));
		await writeFile(join(directory, 'broken.charmlet.json'), '{', 'utf8');
		const loaded = await loadPacks(directory);
		assert.deepEqual(loaded.packs, [installed.pack]);
		assert.deepEqual(loaded.invalid, ['broken.charmlet.json']);
		assert.deepEqual(await loadPacks(join(root, 'missing')), { packs: [], invalid: [] });
		const catalogue = [...CHARMS, ...packCharms(loaded.packs)];
		const selected = restoreState({
			charmId: 'pack:probe-card:probe-card', layoutMode: 'orbit', showMessages: false, rotateMessages: false, messageIndex: 3,
			cordLength: 210, size: 80, hidden: true, reducedMotion: true,
		}, catalogue);
		assert.equal(selected.charmId, 'pack:probe-card:probe-card');
		const fallback = restoreState(selected, CHARMS);
		assert.equal(fallback.charmId, 'terminal');
		assert.equal(fallback.cordLength, 210);
		assert.equal(fallback.size, 80);
		assert.equal(fallback.hidden, true);
		assert.equal(fallback.reducedMotion, true);
		assert.equal(fallback.layoutMode, 'orbit');
		assert.equal(fallback.showMessages, false);
		assert.equal(fallback.rotateMessages, false);
		assert.equal(fallback.messageIndex, 3);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
