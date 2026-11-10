import { strict as assert } from 'node:assert';
import { mkdtempSync, promises as filesystem } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEFAULT_STATE, getLayout, matchesSavedState, resetState, restoreState, type CharmState, type LayoutMode } from '../charm-state';
import { buildCatalogue, CHARMS, FIDGET_CHARMS, LIVE_CHARMS, ORIGINAL_CHARMS, RETIRED_CHARMS, TRIAL_CHARMS } from '../charm-catalog';
import { MESSAGES } from '../messages';
import { MESSAGE_ROTATION_MS, MessageRotation } from '../message-rotation';
import { Pendulum } from '../pendulum';
import { StateStore } from '../state-store';
import { StateWriter } from '../state-writer';
import { displayedCharm, festiveCharm, festiveDay } from '../festive-charms';
import { chainLinks, cordForCharm, cordPath } from '../cord-design';

test('missing or invalid saved values restore a usable charm', () => {
	assert.deepEqual(restoreState(undefined), DEFAULT_STATE);
	assert.deepEqual(restoreState({ cordLength: Number.NaN, hidden: 'yes' }), DEFAULT_STATE);
	assert.equal(restoreState({ cordLength: 9999 }).cordLength, 9999);
	assert.equal(restoreState({ cordLength: -10 }).cordLength, 48);
	assert.equal(restoreState({ messageIndex: -1 }).messageIndex, 0);
	assert.equal(restoreState({ messageIndex: MESSAGES.length }).messageIndex, 0);
	assert.equal(restoreState({ messageIndex: 1.5 }).messageIndex, 0);
});

test('hide and motion preferences survive a reload without trusting unknown fields', () => {
	assert.deepEqual(restoreState({ cordLength: 180, hidden: true, reducedMotion: true, extra: 'ignored' }), {
		version: 1, charmId: 'terminal', layoutMode: 'hanging', showMessages: true, rotateMessages: true, messageIndex: 0,
		cordLength: 180, size: 100, hidden: true, reducedMotion: true,
		festiveEnabled: true, charmPinned: false, cordChoices: {}, caliOutfit: 'daily', puzzles: DEFAULT_STATE.puzzles,
	});
});

test('cords follow the visible charm and preserve independent manual choices', () => {
	const ruby = CHARMS.find(charm => charm.id === 'trial:new-ruby')!;
	const soft = CHARMS.find(charm => charm.id === 'trial:new-smiley-happy')!;
	const murugan = CHARMS.find(charm => charm.id === 'trial:new-murugan')!;
	assert.equal(cordForCharm(ruby), 'gold-chain');
	assert.equal(cordForCharm(soft), 'soft');
	assert.equal(cordForCharm(murugan), 'braid');
	const saved = restoreState({ ...DEFAULT_STATE, cordChoices: {
		[ruby.id]: 'silver-chain', [soft.id]: 'ribbon', missing: 'braid', terminal: 'script',
	} });
	assert.equal(cordForCharm(ruby, saved.cordChoices), 'silver-chain');
	assert.equal(cordForCharm(soft, saved.cordChoices), 'ribbon');
	assert.equal(cordForCharm(murugan, saved.cordChoices), 'braid');
	assert.deepEqual(Object.keys(saved.cordChoices).sort(), [ruby.id, soft.id].sort());
	assert.ok(matchesSavedState(saved, JSON.parse(JSON.stringify(saved))));
	assert.equal(matchesSavedState(saved, { ...saved, cordChoices: {} }), false);
	assert.deepEqual(resetState(saved).cordChoices, saved.cordChoices);
});

test('chain geometry remains finite and bounded during long pulls in every direction', () => {
	for (const point of [{ x: 220, y: 900 }, { x: -200, y: -300 }, { x: 2200, y: 900 }, { x: 0, y: 0 }]) {
		const start = { x: 0, y: 0 };
		assert.ok(cordPath(start, point).endsWith(`${point.x} ${point.y}`));
		for (const balls of [true, false]) {
			const links = chainLinks(start, point, balls);
			assert.doesNotMatch(links, /NaN|Infinity/);
			assert.ok((links.match(/M /g) ?? []).length < 180);
		}
	}
});

test('legacy and unknown charm selections retain the other preferences', () => {
	for (const charmId of [undefined, 'missing', '../outside.svg', null]) {
		const state = restoreState({ charmId, layoutMode: 'orbit', showMessages: false, rotateMessages: false, messageIndex: MESSAGES.length - 1, cordLength: 210, size: 80, hidden: true, reducedMotion: true });
		assert.equal(state.charmId, 'terminal');
		assert.equal(state.layoutMode, 'orbit');
		assert.equal(state.showMessages, false);
		assert.equal(state.rotateMessages, false);
		assert.equal(state.messageIndex, MESSAGES.length - 1);
		assert.equal(state.cordLength, 210);
		assert.equal(state.size, 80);
		assert.equal(state.hidden, true);
		assert.equal(state.reducedMotion, true);
	}
});

test('every bundled selection survives saved-state restoration', () => {
	assert.deepEqual(ORIGINAL_CHARMS.map(charm => charm.id), ['terminal']);
	assert.equal(CHARMS.length, ORIGINAL_CHARMS.length + TRIAL_CHARMS.length + LIVE_CHARMS.length + FIDGET_CHARMS.length);
	assert.equal(new Set(CHARMS.map(charm => charm.id)).size, CHARMS.length);
	assert.equal(CHARMS[0].id, 'terminal');
	assert.equal(CHARMS[1].id, 'live:cali');
	assert.ok(CHARMS.slice(1, 1 + LIVE_CHARMS.length).every(charm => charm.id.startsWith('live:')));
	assert.ok(TRIAL_CHARMS.length > 100, 'The complete curated trial must be bundled, not require imports.');
	for (const group of ['Solar System', 'Gemstones', 'Zodiac', 'Test Bench', 'Sacred Traditions', 'Seasonal', 'California', 'Celebrations', 'Music']) {
		assert.ok(TRIAL_CHARMS.some(charm => charm.group === group), `Missing trial collection: ${group}`);
	}
	for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
		assert.ok(TRIAL_CHARMS.some(charm => charm.id === `trial:new-${planet}`));
	}
	assert.equal(TRIAL_CHARMS.filter(charm => charm.group === 'Zodiac').length, 12);
	assert.equal(TRIAL_CHARMS.filter(charm => charm.group === 'Garden Flowers').length, 18);
	assert.equal(TRIAL_CHARMS.filter(charm => charm.group === 'Music').length, 12);
	assert.ok(TRIAL_CHARMS.every(charm => !charm.source && /^trial-[a-z0-9-]+\.png$/.test(charm.file)));
	assert.equal(MESSAGES.length, 80);
	assert.equal(new Set(MESSAGES).size, MESSAGES.length);
	assert.ok(MESSAGES.every(message => message.trim().length > 0));
	for (const charm of CHARMS) {
		const requested = { ...DEFAULT_STATE, charmId: charm.id, cordLength: 210, size: 80 };
		assert.deepEqual(restoreState(JSON.parse(JSON.stringify(requested))), requested);
	}
});

test('retiring the early designs preserves the matching choice, pin and cord', () => {
	for (const [oldId, replacement] of Object.entries(RETIRED_CHARMS)) {
		assert.equal(CHARMS.some(charm => charm.id === oldId), false);
		const restored = restoreState({ charmId: oldId, size: 80, cordLength: 210, reducedMotion: true,
			cordChoices: { [oldId]: 'ribbon' } });
		assert.equal(restored.charmId, replacement);
		assert.equal(restored.charmPinned, true);
		assert.equal(restored.size, 80);
		assert.equal(restored.cordLength, 210);
		assert.equal(restored.reducedMotion, true);
		assert.equal(restored.cordChoices[replacement], 'ribbon');
		assert.deepEqual(restoreState(JSON.parse(JSON.stringify(restored))), restored);
	}
	const preferred = restoreState({ charmId: 'chip', charmPinned: false,
		cordChoices: { chip: 'ribbon', 'trial:starter-chip': 'silver-chain' } });
	assert.equal(preferred.charmPinned, false);
	assert.equal(preferred.cordChoices['trial:starter-chip'], 'silver-chain');
});

test('an identical imported replacement also keeps the retired choice and its cord', () => {
	const art = TRIAL_CHARMS.find(charm => charm.id === 'trial:starter-chip')!;
	const imported = { ...art, id: 'pack:my-chip:chip', source: 'data:image/png;base64,fixture' };
	const catalogue = buildCatalogue([imported]);
	const state = restoreState({ charmId: 'chip', cordChoices: { chip: 'braid' } }, catalogue);
	assert.equal(state.charmId, imported.id);
	assert.equal(state.charmPinned, true);
	assert.equal(state.cordChoices[imported.id], 'braid');
});

test('reset retains the selected charm and motion preference', () => {
	const state = restoreState({ charmId: 'wafer', layoutMode: 'orbit', showMessages: false, rotateMessages: false, messageIndex: 5, cordLength: 700, size: 140, hidden: true, reducedMotion: true });
	assert.deepEqual(resetState(state), {
		...DEFAULT_STATE, charmId: 'trial:starter-wafer', reducedMotion: true, layoutMode: 'orbit', showMessages: false, rotateMessages: false, messageIndex: 5,
		charmPinned: true,
	});
});

test('seasonal dates follow local days and Cyber Monday can cross into December', () => {
	const local = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).getTime();
	for (const [year, thanksgiving, mondayMonth, mondayDay] of [
		[2024, 28, 12, 2], [2025, 27, 12, 1], [2026, 26, 11, 30], [2029, 22, 11, 26],
	]) {
		assert.equal(festiveDay(local(year, 11, thanksgiving))?.name, 'Thanksgiving');
		assert.equal(festiveDay(local(year, 11, thanksgiving + 1))?.name, 'Black Friday');
		assert.equal(festiveDay(local(year, mondayMonth, mondayDay))?.name, 'Cyber Monday');
		assert.equal(festiveDay(local(year, 11, thanksgiving - 1)), undefined);
	}
	const halloween = local(2026, 10, 31, 0);
	assert.equal(festiveDay(halloween - 1), undefined);
	assert.equal(festiveDay(halloween)?.name, 'Halloween');
	assert.equal(festiveDay(local(2026, 11, 1, 0) - 1)?.name, 'Halloween');
	assert.equal(festiveDay(local(2026, 11, 1, 0)), undefined);
	assert.equal(festiveDay(local(2026, 12, 25))?.name, 'Christmas');
	assert.equal(festiveDay(local(2026, 12, 26))?.name, 'Christmas season');
	assert.equal(festiveDay(Number.NaN), undefined);
});

test('festive display preserves manual state and falls back for pins or absent artwork', () => {
	const pumpkin = { ...CHARMS[0], id: 'pack:seasonal:new-pumpkin-patch', name: 'Pumpkin Patch' };
	const usual = TRIAL_CHARMS.find(charm => charm.id === 'trial:starter-wafer')!;
	const withoutHoliday = [...ORIGINAL_CHARMS, usual];
	const catalogue = [...withoutHoliday, pumpkin];
	const state = { ...DEFAULT_STATE, charmId: usual.id, festiveEnabled: true };
	const saved = JSON.stringify(state);
	const halloween = new Date(2026, 9, 31, 12).getTime();
	assert.equal(displayedCharm(state, catalogue, halloween).id, pumpkin.id);
	assert.equal(JSON.stringify(state), saved, 'Automatic display must not overwrite the saved selection.');
	assert.equal(displayedCharm(state, catalogue, new Date(2026, 10, 1, 0).getTime()).id, usual.id);
	assert.equal(displayedCharm(state, withoutHoliday, halloween).id, usual.id);
	assert.equal(displayedCharm({ ...state, festiveEnabled: false }, catalogue, halloween).id, usual.id);
	assert.equal(displayedCharm({ ...state, charmPinned: true }, catalogue, halloween).id, usual.id);
	assert.equal(displayedCharm({ ...state, charmPinned: true }, catalogue, new Date(2027, 9, 31, 12).getTime()).id, usual.id);
});

test('older favourites are pinned and explicit festive preferences survive restoration and reset', () => {
	const legacy = restoreState({ charmId: 'wafer', festiveEnabled: true });
	assert.equal(legacy.charmPinned, true);
	assert.equal(restoreState(undefined).festiveEnabled, true);
	assert.equal(restoreState({ festiveEnabled: 'true' }).festiveEnabled, true);
	assert.equal(restoreState({ festiveEnabled: false }).festiveEnabled, false);
	assert.equal(restoreState({ charmId: 'wafer', festiveEnabled: false }).charmPinned, true);
	const state = { ...DEFAULT_STATE, charmId: 'trial:starter-wafer', festiveEnabled: true, charmPinned: false };
	assert.deepEqual(restoreState(JSON.parse(JSON.stringify(state))), state);
	const reset = resetState({ ...state, charmPinned: true, size: 140, cordLength: 250 });
	assert.equal(reset.charmPinned, true);
	assert.equal(reset.festiveEnabled, true);
	assert.equal(reset.charmId, 'trial:starter-wafer');
	assert.equal(reset.size, DEFAULT_STATE.size);
});

test('US celebration dates resolve to bundled artwork, including floating dates and Easter', () => {
	const cases: Array<[number, number, number, string]> = [
		[2026, 1, 1, "New Year's Day"], [2026, 1, 19, 'Martin Luther King Jr. Day'],
		[2026, 2, 14, "Valentine's Day"], [2026, 2, 16, "Presidents' Day"],
		[2026, 3, 17, "St. Patrick's Day"], [2024, 3, 31, 'Easter'],
		[2025, 4, 20, 'Easter'], [2026, 4, 5, 'Easter'], [2027, 3, 28, 'Easter'],
		[2026, 4, 22, 'Earth Day'], [2026, 5, 10, "Mother's Day"],
		[2026, 5, 25, 'Memorial Day'], [2026, 6, 19, 'Juneteenth'],
		[2026, 6, 21, "Father's Day"], [2026, 7, 4, 'Independence Day'],
		[2026, 9, 7, 'Labor Day'], [2026, 10, 31, 'Halloween'],
		[2026, 11, 11, 'Veterans Day'], [2026, 11, 26, 'Thanksgiving'],
		[2026, 11, 27, 'Black Friday'], [2026, 11, 30, 'Cyber Monday'],
		[2026, 12, 24, 'Christmas Eve'], [2026, 12, 25, 'Christmas'],
		[2026, 12, 31, "New Year's Eve"],
	];
	for (const [year, month, date, name] of cases) {
		const day = festiveDay(new Date(year, month - 1, date, 12).getTime());
		assert.equal(day?.name, name, `${year}-${month}-${date}`);
		assert.ok(day && festiveCharm(day, CHARMS), `${name} must work without an imported pack.`);
	}
});

test('Christmas rotation is stable within a local day and specific holidays take precedence', () => {
	const morning = festiveDay(new Date(2026, 11, 1, 0).getTime())!;
	const evening = festiveDay(new Date(2026, 11, 1, 23, 59).getTime())!;
	const nextDay = festiveDay(new Date(2026, 11, 2, 0).getTime())!;
	assert.deepEqual(morning, evening);
	assert.equal(morning.charmKey, 'santa-claus');
	assert.equal(nextDay.charmKey, 'reindeer');
	assert.equal(festiveDay(new Date(2025, 11, 1, 12).getTime())?.name, 'Cyber Monday');
	assert.equal(festiveDay(new Date(2026, 11, 24, 12).getTime())?.charmKey, 'santa-claus');
	assert.equal(festiveDay(new Date(2026, 11, 25, 12).getTime())?.charmKey, 'christmas-tree');
	const saved = { ...DEFAULT_STATE, charmId: 'trial:starter-wafer' };
	assert.equal(displayedCharm(saved, CHARMS, new Date(2027, 0, 2, 0).getTime()).id, 'trial:starter-wafer');
	assert.equal(saved.charmId, 'trial:starter-wafer');
});

test('state writes are ordered and flush waits for the final confirmed value', async () => {
	const releases: Array<() => void> = [];
	const writes: number[] = [];
	let stored: unknown;
	const writer = new StateWriter<number>(value => new Promise<void>(resolveWrite => {
		writes.push(value);
		releases.push(() => { stored = value; resolveWrite(); });
	}), () => stored, (expected, actual) => expected === actual);
	const first = writer.save(1);
	await Promise.resolve();
	await Promise.resolve();
	assert.deepEqual(writes, [1]);
	let flushed = false;
	const flush = writer.flush().then(() => { flushed = true; });
	const last = writer.save(2);
	releases.shift()!();
	await first;
	await Promise.resolve();
	await Promise.resolve();
	assert.deepEqual(writes, [1, 2]);
	assert.equal(flushed, false);
	releases.shift()!();
	await last;
	await flush;
	assert.equal(stored, 2);
	assert.equal(flushed, true);
});

test('an acknowledged write with stale readback is rejected', async () => {
	const expected = { ...DEFAULT_STATE, charmId: 'lemon-chilies' };
	const writer = new StateWriter<CharmState>(() => Promise.resolve(), () => DEFAULT_STATE, matchesSavedState);
	await assert.rejects(writer.save(expected), /could not confirm/);
	assert.equal(matchesSavedState(expected, { ...expected }), true);
	assert.equal(matchesSavedState(expected, { ...expected, messageIndex: 2 }), false);
	assert.equal(matchesSavedState(expected, null), false);
});

test('a rejected state write does not poison the next save', async () => {
	let stored: unknown;
	const writer = new StateWriter<number>(async value => {
		if (value === 1) { throw new Error('Unavailable storage'); }
		stored = value;
	}, () => stored, (expected, actual) => expected === actual);
	await assert.rejects(writer.save(1), /Unavailable storage/);
	await writer.flush();
	await writer.save(2);
	await writer.flush();
	assert.equal(stored, 2);
});

test('missing preference file migrates legacy state and later file state wins', async context => {
	const directory = mkdtempSync(join(tmpdir(), 'charmlet-state-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const store = new StateStore(directory);
	const legacy = { ...DEFAULT_STATE, charmId: 'trial:starter-chip', cordLength: 180 };
	assert.deepEqual(await store.load(legacy), { value: legacy, source: 'legacy' });
	const selected = { ...legacy, charmId: 'lemon-chilies', messageIndex: 79 };
	await store.write(selected);
	const reloaded = new StateStore(directory);
	assert.deepEqual(await reloaded.load(DEFAULT_STATE), { value: selected, source: 'file' });
	assert.deepEqual(JSON.parse(await readFile(store.path, 'utf8')), selected);
});

test('rapid preference writes confirm the final complete file after reopening', async context => {
	const directory = mkdtempSync(join(tmpdir(), 'charmlet-state-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const store = new StateStore(directory);
	const writer = new StateWriter<CharmState>(value => store.write(value), () => store.read(), matchesSavedState);
	const first = { ...DEFAULT_STATE, charmId: 'terminal' };
	const last: CharmState = { ...DEFAULT_STATE, charmId: 'lemon-chilies', layoutMode: 'orbit', cordLength: 250, size: 120, reducedMotion: true, hidden: true, messageIndex: 79, rotateMessages: false };
	await Promise.all([writer.save(first), writer.save(last)]);
	await writer.flush();
	assert.deepEqual(await new StateStore(directory).read(), last);
	assert.deepEqual(await readdir(directory), ['preferences.json']);
});

test('unreadable preference JSON reports the problem and leaves the legacy fallback available', async context => {
	const directory = mkdtempSync(join(tmpdir(), 'charmlet-state-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const store = new StateStore(directory);
	await writeFile(store.path, '{broken', 'utf8');
	const legacy = { ...DEFAULT_STATE, charmId: 'trial:starter-wafer' };
	const loaded = await store.load(legacy);
	assert.equal(loaded.source, 'legacy');
	assert.deepEqual(loaded.value, legacy);
	assert.ok(loaded.error instanceof SyntaxError);
	assert.equal(await readFile(store.path, 'utf8'), '{broken');
});

test('Windows file replacement retries temporary locks, bounds failures and preserves the prior save',
	{ skip: process.platform !== 'win32' }, async context => {
		const directory = mkdtempSync(join(tmpdir(), 'charmlet-state-'));
		context.after(() => rm(directory, { recursive: true, force: true }));
		const store = new StateStore(directory);
		await store.write({ ...DEFAULT_STATE });
		const originalRename = filesystem.rename;
		let busyAttempts = 2, calls = 0;
		const locked = Object.assign(new Error('File temporarily locked'), { code: 'EPERM' });
		context.mock.method(filesystem, 'rename', async (...args: Parameters<typeof filesystem.rename>) => {
			calls++;
			if (busyAttempts-- > 0) { throw locked; }
			return originalRename(...args);
		});
		const selected = { ...DEFAULT_STATE, charmId: 'fidget:cube' };
		await store.write(selected);
		assert.equal(calls, 3);
		assert.deepEqual(await store.read(), selected);
		assert.deepEqual(await readdir(directory), ['preferences.json']);

		busyAttempts = Infinity; calls = 0;
		await assert.rejects(store.write({ ...DEFAULT_STATE }), error => error === locked);
		assert.equal(calls, 6);
		assert.deepEqual(await store.read(), selected);
		assert.deepEqual(await readdir(directory), ['preferences.json']);
	});

test('preference file errors reject saves and allow a later successful write', async context => {
	const root = mkdtempSync(join(tmpdir(), 'charmlet-state-'));
	context.after(() => rm(root, { recursive: true, force: true }));
	const directory = join(root, 'storage');
	await writeFile(directory, 'blocked', 'utf8');
	const store = new StateStore(directory);
	const writer = new StateWriter<CharmState>(value => store.write(value), () => store.read(), matchesSavedState);
	await assert.rejects(writer.save({ ...DEFAULT_STATE }));
	await writer.flush();
	assert.equal(await readFile(directory, 'utf8'), 'blocked');
	await rm(directory);
	const selected = { ...DEFAULT_STATE, charmId: 'lemon-chilies' };
	await writer.save(selected);
	await writer.flush();
	assert.deepEqual(await store.read(), selected);
	assert.deepEqual(await readdir(directory), ['preferences.json']);
});

test('automatic message rotation advances, reschedules and obeys enable and stop', context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	try {
		let calls = 0;
		let rotation: MessageRotation;
		rotation = new MessageRotation(() => {
			calls++;
			rotation.update(true);
		});
		rotation.update(true);
		context.mock.timers.tick(MESSAGE_ROTATION_MS - 1);
		assert.equal(calls, 0);
		context.mock.timers.tick(1);
		assert.equal(calls, 1);
		rotation.update(false);
		context.mock.timers.tick(2 * MESSAGE_ROTATION_MS);
		assert.equal(calls, 1);
		rotation.update(true);
		context.mock.timers.tick(MESSAGE_ROTATION_MS);
		assert.equal(calls, 2);
		rotation.stop();
		context.mock.timers.tick(2 * MESSAGE_ROTATION_MS);
		assert.equal(calls, 2);
	} finally {
		context.mock.timers.reset();
	}
});

test('eligible heartbeats do not postpone automatic card rotation', context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	try {
		let calls = 0;
		const rotation = new MessageRotation(() => { calls++; });
		rotation.setEnabled(true);
		for (let second = 0; second < MESSAGE_ROTATION_MS / 1000; second++) {
			context.mock.timers.tick(1000);
			rotation.setEnabled(true);
		}
		assert.equal(calls, 1);
		rotation.setEnabled(false);
		context.mock.timers.tick(MESSAGE_ROTATION_MS);
		assert.equal(calls, 1);
		rotation.stop();
	} finally { context.mock.timers.reset(); }
});

test('manual message changes restart the automatic countdown', context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	try {
		let calls = 0;
		const rotation = new MessageRotation(() => { calls++; });
		rotation.update(true);
		context.mock.timers.tick(MESSAGE_ROTATION_MS - 100);
		rotation.update(true);
		context.mock.timers.tick(100);
		assert.equal(calls, 0);
		context.mock.timers.tick(MESSAGE_ROTATION_MS - 100);
		assert.equal(calls, 1);
		rotation.stop();
	} finally {
		context.mock.timers.reset();
	}
});

test('size persists and Phase 0 states gain the default without losing their parked length', () => {
	assert.equal(restoreState({ cordLength: 210 }).size, 100);
	assert.equal(restoreState({ cordLength: 210 }).cordLength, 210);
	assert.equal(restoreState({ size: 140 }).size, 140);
	assert.equal(restoreState({ size: 175 }).size, 175);
	assert.equal(restoreState({ size: 200 }).size, 200);
	assert.equal(restoreState({ size: 999 }).size, 200);
	assert.equal(restoreState({ size: -1 }).size, 60);
	assert.equal(restoreState({ size: Number.NaN }).size, 100);
});

test('every supported size fits the logical view without overwriting requested preferences', () => {
	for (const mode of ['hanging', 'orbit'] as LayoutMode[]) {
		for (const size of [60, 100, 140, 175, 200]) {
			for (const height of [80, 144, 240, 500]) {
				const state = restoreState({ cordLength: 320, size });
				const layout = getLayout(96, height, state.cordLength, state.size, mode);
				const bottom = layout.anchorY + layout.cordLength + layout.attachmentOffset + layout.visualRadius;
				assert.ok(bottom <= layout.height, `Mode ${mode}, size ${size}, height ${height}`);
				assert.ok(layout.anchorX + layout.charmWidth / 2 <= layout.width);
				assert.ok(layout.anchorX - layout.charmWidth / 2 >= 0);
				if (mode === 'orbit') {
					assert.ok(layout.anchorX - layout.orbitRadius - layout.visualRadius >= -0.001);
					assert.ok(layout.anchorX + layout.orbitRadius + layout.visualRadius <= layout.width + 0.001);
					assert.ok(layout.anchorY - layout.orbitRadius - layout.visualRadius >= -0.001);
					assert.ok(layout.anchorY + layout.orbitRadius + layout.visualRadius <= layout.height + 0.001);
				}
				assert.equal(state.cordLength, 320);
				assert.equal(state.size, size);
			}
		}
	}
});

test('resizing clamps the parked cord to keep the charm in the view', () => {
	for (const mode of ['hanging', 'orbit'] as LayoutMode[]) {
		for (const height of [144, 200, 400, 800]) {
			const layout = getLayout(280, height, 320, DEFAULT_STATE.size, mode);
			assert.ok(layout.anchorY + layout.cordLength + layout.attachmentOffset + layout.visualRadius <= layout.height);
			assert.ok(layout.anchorX + 40 <= layout.width);
			assert.ok(layout.cordLength >= 48);
		}
	}
});

test('compact panels keep downward pull room and return to the visible rest', () => {
	for (const size of [60, 100, 140, 200]) {
		for (const mode of ['hanging', 'orbit'] as LayoutMode[]) {
			const requestedPreference = 126;
			const pendulum = new Pendulum(180, 120, requestedPreference, size, mode);
			try {
				const restingLength = pendulum.layout.cordLength;
				const resting = pendulum.position;
				pendulum.grab(resting);
				pendulum.drag({
					x: pendulum.layout.anchorX,
					y: pendulum.layout.anchorY + pendulum.layout.maximumDragCord + pendulum.layout.attachmentOffset,
				}, true);
				assert.ok(pendulum.layout.cordLength >= restingLength + 31, `Mode ${mode}, size ${size}`);
				assert.ok(pendulum.position.x - pendulum.layout.visualRadius >= -0.001);
				assert.ok(pendulum.position.x + pendulum.layout.visualRadius <= pendulum.layout.width + 0.001);
				assert.ok(pendulum.position.y - pendulum.layout.visualRadius >= -0.001);
				assert.ok(pendulum.position.y + pendulum.layout.visualRadius <= pendulum.layout.height + 0.001);
				assert.equal(pendulum.engine.world.constraints.length, 2);
				pendulum.release();
				assert.equal(pendulum.engine.world.constraints.length, 1);
				pendulum.returnToLength(requestedPreference, true);
				assert.equal(pendulum.layout.cordLength, restingLength);
				assert.deepEqual(pendulum.position, resting);
				assert.equal(requestedPreference, 126);
			} finally {
				pendulum.dispose();
			}
		}
	}
});

test('a click impulse moves the charm, then the pendulum sleeps', () => {
	const pendulum = new Pendulum(280, 350, 128);
	const restingX = pendulum.position.x;
	assert.equal(pendulum.moving, false);
	pendulum.nudge(-1);
	for (let frame = 0; frame < 15; frame++) {
		pendulum.step();
	}
	assert.ok(pendulum.position.x < restingX - 5);
	for (let frame = 0; frame < 1500; frame++) {
		pendulum.step();
	}
	assert.equal(pendulum.moving, false);
	assert.equal(pendulum.position.x, restingX);
	pendulum.dispose();
});

test('opposite nudges have balanced travel in a narrow dock', () => {
	for (const size of [60, 100, 140, 200]) {
		const left = new Pendulum(180, 500, 320, size);
		const right = new Pendulum(180, 500, 320, size);
		try {
			const leftStart = left.position.x;
			const rightStart = right.position.x;
			left.nudge(-1);
			right.nudge(1);
			let leftTravel = 0;
			let rightTravel = 0;
			for (let frame = 0; frame < 120; frame++) {
				left.step();
				right.step();
				leftTravel = Math.max(leftTravel, leftStart - left.position.x);
				rightTravel = Math.max(rightTravel, right.position.x - rightStart);
			}
			assert.ok(leftTravel > 10 && rightTravel > 10, `Size ${size}: both nudges must move`);
			assert.ok(Math.abs(leftTravel - rightTravel) < 1,
				`Size ${size}: left travel ${leftTravel}, right travel ${rightTravel}`);
		} finally {
			left.dispose();
			right.dispose();
		}
	}
});

test('long saved cords use tall views and survive temporary clamping', () => {
	const state = restoreState({ cordLength: 700 });
	assert.equal(state.cordLength, 700);
	assert.equal(getLayout(280, 1000, state.cordLength).cordLength, 700);
	assert.ok(getLayout(280, 240, state.cordLength).cordLength < 700);
	assert.equal(state.cordLength, 700);
	assert.equal(getLayout(280, 1000, state.cordLength).cordLength, 700);
	const pendulum = new Pendulum(280, 1000, 126);
	pendulum.setLength(9999);
	pendulum.settle();
	assert.ok(pendulum.layout.cordLength > 320);
	assert.ok(Math.abs(pendulum.position.y + pendulum.layout.visualRadius + pendulum.layout.edgePadding + pendulum.layout.pullAllowance - pendulum.layout.height) < 0.001);
	pendulum.dispose();
});

test('rapid circular drags keep the body in view and recover after release', () => {
	for (const immediate of [false, true]) {
		const pendulum = new Pendulum(140, 800, 126, 60);
		try {
			const start = {
				x: pendulum.position.x - pendulum.layout.charmWidth * 0.45,
				y: pendulum.position.y - pendulum.layout.charmHeight * 0.45,
			};
			const assertInside = () => {
				const { x, y } = pendulum.position;
				const { bodyRadius, width, height } = pendulum.layout;
				assert.ok(x >= bodyRadius - 0.001 && x <= width - bodyRadius + 0.001, `Horizontal escape: ${x}`);
				assert.ok(y >= bodyRadius - 0.001 && y <= height - bodyRadius + 0.001, `Vertical escape: ${y}`);
			};
			pendulum.grab(start);
			for (let step = 1; step <= 16; step++) {
				const theta = 2 * Math.PI * step / 16;
				const point = { x: start.x + 160 * (Math.cos(theta) - 1), y: start.y + 160 * Math.sin(theta) };
				pendulum.drag(point, immediate);
				if (!immediate) {
					pendulum.step();
				}
				assertInside();
			}
			pendulum.release();
			pendulum.setLength(126);
			if (immediate) {
				pendulum.settle();
			}
			for (let step = 0; step < 1500; step++) {
				pendulum.step();
				assertInside();
			}
			assert.equal(pendulum.moving, false);
			assert.equal(pendulum.engine.world.constraints.length, 1);
			assert.equal(pendulum.position.x, pendulum.layout.anchorX);
		} finally {
			pendulum.dispose();
		}
	}
});

test('a released stretch rebounds across rest with diminishing bounces and then sleeps', () => {
	const pendulum = new Pendulum(280, 800, 126);
	try {
		const resting = pendulum.position;
		const stretchedLength = 246;
		pendulum.setLength(stretchedLength);
		pendulum.settle();
		pendulum.returnToLength(126);
		assert.equal(pendulum.layout.cordLength, stretchedLength);
		assert.equal(pendulum.moving, true);
		let previousSign = 1;
		const peaks = [stretchedLength - 126];
		for (let step = 0; step < 240; step++) {
			pendulum.step();
			const displacement = pendulum.position.y - resting.y;
			const sign = Math.sign(displacement);
			if (Math.abs(displacement) > 0.75) {
				if (sign !== previousSign) { peaks.push(0); previousSign = sign; }
				peaks[peaks.length - 1] = Math.max(peaks[peaks.length - 1], Math.abs(displacement));
			}
			assert.ok(pendulum.position.y - pendulum.layout.visualRadius >= 0);
			assert.ok(pendulum.position.y + pendulum.layout.visualRadius <= pendulum.layout.height);
			if (step === 0) {
				assert.ok(pendulum.layout.cordLength > 126 && pendulum.layout.cordLength < stretchedLength);
				assert.ok(displacement > 110, 'release must start at the held position, without a jump to rest');
			}
		}
		assert.ok(peaks.length >= 4, 'the actual charm must cross its resting position repeatedly');
		assert.ok(peaks[1] > 10, 'the first rebound must be clearly visible');
		assert.ok(peaks[2] > 4 && peaks[2] < peaks[1], 'the next bounce must be smaller');
		assert.ok(peaks[3] < peaks[2], 'subsequent bounces must lose energy');
		assert.equal(pendulum.layout.cordLength, 126);
		assert.equal(pendulum.moving, false);
		assert.deepEqual(pendulum.position, resting);
	} finally {
		pendulum.dispose();
	}
});

test('release before the next physics frame does not jump to an unrendered pointer target', () => {
	const p = new Pendulum(280, 800, 126);
	try {
		const rest = p.position;
		p.grab(rest);
		p.drag({ x: rest.x, y: rest.y + 200 });
		assert.deepEqual(p.position, rest);
		p.returnToLength(126);
		p.step();
		assert.ok(Math.abs(p.position.y - rest.y) < 1, 'release must start at the visible charm');
		assert.equal(p.layout.cordLength, 126);
	} finally { p.dispose(); }
});

test('imported attachment geometry scales with the image and remains bounded during a rebound', () => {
	for (const mode of ['hanging', 'orbit'] as const) {
		for (const attachment of [{ x: 0.5, y: 0 }, { x: 0.45, y: 14 / 84 }, { x: 0.55, y: 0.5 }]) {
			const p = new Pendulum(180, 140, 48, 200, mode, attachment);
			try {
				const rest = p.position;
				assert.ok(Math.abs(p.layout.attachmentX - (attachment.x - 0.5) * p.layout.charmWidth) < 0.001);
				assert.ok(Math.abs(p.layout.attachmentOffset - (0.5 - attachment.y) * p.layout.charmHeight) < 0.001);
				p.grab(rest);
				p.drag({ x: rest.x, y: rest.y + 100 }, true);
				p.returnToLength(48);
				for (let step = 0; step < 240; step++) {
					p.step();
					const { x, y } = p.position;
					assert.ok(x - p.layout.visualRadius >= -0.001 && x + p.layout.visualRadius <= p.layout.width + 0.001);
					assert.ok(y - p.layout.visualRadius >= -0.001 && y + p.layout.visualRadius <= p.layout.height + 0.001);
				}
				assert.deepEqual(p.position, rest);
				assert.equal(p.moving, false);
				assert.equal(p.engine.world.constraints.length, 1);
			} finally { p.dispose(); }
		}
	}
});

test('return motion respects reduced motion, grabs, resize and immediate settling', () => {
	const pendulum = new Pendulum(280, 800, 126);
	try {
		pendulum.setLength(600);
		pendulum.settle();
		const clock = pendulum.engine.timing.timestamp;
		pendulum.returnToLength(126, true);
		assert.equal(pendulum.layout.cordLength, 126);
		assert.equal(pendulum.moving, false);
		assert.equal(pendulum.engine.timing.timestamp, clock);
		pendulum.setLength(600);
		pendulum.settle();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.grab(pendulum.position);
		const heldLength = pendulum.layout.cordLength;
		for (let step = 0; step < 10; step++) {
			pendulum.step();
		}
		assert.equal(pendulum.layout.cordLength, heldLength);
		pendulum.release();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.resize(180, 200, 126);
		const resizedLength = getLayout(180, 200, 126).cordLength;
		for (let step = 0; step < 60; step++) {
			pendulum.step();
		}
		assert.equal(pendulum.layout.cordLength, resizedLength);
		assert.equal(pendulum.moving, false);
		pendulum.resize(280, 800, 126);
		pendulum.setLength(600);
		pendulum.settle();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.settle();
		assert.equal(pendulum.layout.cordLength, 126);
		assert.equal(pendulum.moving, false);
	} finally {
		pendulum.dispose();
	}
});

test('a downward pull returns to rest without a stuck drag constraint', () => {
	const pendulum = new Pendulum(280, 800, 128);
	const resting = pendulum.position;
	pendulum.grab(resting);
	pendulum.drag({ x: pendulum.layout.anchorX, y: pendulum.layout.anchorY + 220 + pendulum.layout.attachmentOffset });
	for (let frame = 0; frame < 60; frame++) { pendulum.step(); }
	assert.ok(pendulum.position.y > resting.y + 80);
	assert.equal(pendulum.layout.cordLength, 220);
	pendulum.release();
	pendulum.returnToLength(128);
	for (let frame = 0; frame < 1500; frame++) { pendulum.step(); }
	assert.equal(pendulum.moving, false);
	assert.equal(pendulum.layout.cordLength, 128);
	assert.deepEqual(pendulum.position, resting);
	pendulum.resize(180, 160, 128);
	assert.ok(pendulum.position.y + pendulum.layout.visualRadius <= pendulum.layout.height);
	assert.equal(pendulum.engine.world.constraints.length, 1);
	pendulum.dispose();
});

test('size changes scale the body and attachment without accumulating walls or constraints', () => {
	const pendulum = new Pendulum(280, 400, 126);
	for (const size of [140, 200, 60, 100]) {
		pendulum.grab(pendulum.position);
		pendulum.resize(280, 400, 126, size);
		const radius = pendulum.body.circleRadius;
		assert.ok(typeof radius === 'number');
		assert.ok(Math.abs(radius - 34 * 1.15 * size / 100) < 0.001);
		assert.ok(Math.abs(pendulum.layout.charmWidth - 82.8 * size / 100) < 0.001);
		assert.ok(Math.abs(pendulum.layout.charmHeight - 96.6 * size / 100) < 0.001);
		assert.equal(pendulum.tether.length, pendulum.layout.cordLength + pendulum.layout.attachmentOffset);
		assert.equal(pendulum.engine.world.constraints.length, 1);
		assert.equal(pendulum.engine.world.bodies.length, 4);
		assert.equal(pendulum.moving, false);
	}
	pendulum.dispose();
});

test('complete peg orbits stay visible in both directions and return from above', () => {
	for (const size of [60, 100, 140, 200]) {
		for (const immediate of [false, true]) {
			for (const direction of [-1, 1]) {
				const p = new Pendulum(340, 800, 126, size, 'orbit');
				try {
					const peg = { x: p.layout.anchorX, y: p.layout.anchorY };
					const resting = p.position;
					const radius = p.layout.orbitRadius;
					const inside = () => {
						const { x, y } = p.position;
						const r = p.layout.visualRadius;
						assert.ok(x - r >= -0.001 && x + r <= p.layout.width + 0.001);
						assert.ok(y - r >= -0.001 && y + r <= p.layout.height + 0.001);
					};
					p.grab(p.position);
					p.drag({ x: peg.x, y: peg.y + radius }, immediate);
					if (!immediate) { for (let i = 0; i < 12; i++) { p.step(); } }
					let previous = p.angle;
					let travel = 0;
					const quadrants = new Set<number>();
					for (let step = 1; step <= 72; step++) {
						const theta = direction * 2 * Math.PI * step / 72;
						p.drag({ x: peg.x + Math.sin(theta) * radius, y: peg.y + Math.cos(theta) * radius }, immediate);
						if (!immediate) { for (let i = 0; i < 4; i++) { p.step(); inside(); } }
						inside();
						const delta = p.angle - previous;
						travel += Math.atan2(Math.sin(delta), Math.cos(delta));
						previous = p.angle;
						const pos = p.position;
						quadrants.add((pos.x >= peg.x ? 1 : 0) + (pos.y >= peg.y ? 2 : 0));
						assert.equal(p.layout.anchorX, peg.x);
						assert.equal(p.layout.anchorY, peg.y);
					}
					assert.ok(-direction * travel > 2 * Math.PI - 0.2, `size=${size}, immediate=${immediate}, travel=${travel}`);
					assert.equal(quadrants.size, 4);
					p.drag({ x: peg.x, y: peg.y - radius }, immediate);
					if (!immediate) { for (let i = 0; i < 180; i++) { p.step(); inside(); } }
					assert.ok(p.position.y < peg.y, 'holding above the peg must not auto-settle');
					p.release();
					p.returnToLength(126, immediate);
					for (let i = 0; i < 1500; i++) { p.step(); inside(); }
					assert.equal(p.moving, false);
					assert.equal(p.layout.cordLength, 126);
					assert.deepEqual(p.position, resting);
					assert.equal(p.engine.world.constraints.length, 1);
				} finally { p.dispose(); }
			}
		}
	}
});

test('long resting cords recover visibly from every orbit quadrant', () => {
	const p = new Pendulum(340, 1200, 700, DEFAULT_STATE.size, 'orbit');
	try {
		const resting = p.position;
		for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
			p.grab(p.position);
			p.drag({ x: p.layout.anchorX + Math.sin(angle) * p.layout.orbitRadius, y: p.layout.anchorY + Math.cos(angle) * p.layout.orbitRadius }, true);
			p.release();
			p.returnToLength(700);
			for (let i = 0; i < 1500; i++) {
				p.step();
				assert.ok(p.position.x - p.layout.visualRadius >= -0.001);
				assert.ok(p.position.x + p.layout.visualRadius <= p.layout.width + 0.001);
				assert.ok(p.position.y - p.layout.visualRadius >= -0.001);
				assert.ok(p.position.y + p.layout.visualRadius <= p.layout.height + 0.001);
			}
			assert.deepEqual(p.position, resting);
			assert.equal(p.layout.cordLength, 700);
			assert.equal(p.moving, false);
		}
	} finally { p.dispose(); }
});

test('reduced-motion dragging follows input without advancing the physics clock', () => {
	const pendulum = new Pendulum(280, 400, 126);
	const start = pendulum.position;
	pendulum.grab(start);
	pendulum.drag({ x: start.x - 40, y: start.y + 20 }, true);
	assert.equal(pendulum.position.x, start.x - 40);
	assert.equal(pendulum.position.y, start.y + 20);
	assert.equal(pendulum.engine.timing.timestamp, 0);
	pendulum.release();
	pendulum.settle();
	assert.equal(pendulum.moving, false);
	pendulum.dispose();
});