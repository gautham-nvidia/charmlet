import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import {
	applyCompanionAction, companionSnapshot, currentLearningCard, defaultCompanionState, formatFocusTime,
	matchesCompanionState, MINUTE_MS, parseCompanionAction, reconcileCompanion, remainingFocusMs,
	restoreCompanionState, type CompanionAction, type CompanionState,
} from '../companion-core';
import { CompanionController, type CompanionClock, type CompanionStorage } from '../companion-controller';
import { ALL_CARDS, ENCOURAGEMENT_CARDS, FACT_CARDS, feedDeck, MIXED_CARDS, TRIVIA_CARDS } from '../learning-cards';
import { MESSAGES } from '../messages';
import { StateStore } from '../state-store';
import * as garden from '../garden-core';
import * as care from '../care-core';

const START = 1800000000000;
const startAction: CompanionAction = { type: 'focus-start', phase: 'focus', focusMinutes: 1, breakMinutes: 1, intent: 'Finish one small test' };

class FakeClock implements CompanionClock {
	time = START;
	private sequence = 0;
	readonly pending = new Map<number, { due: number; callback: () => void }>();
	now() { return this.time; }
	set(callback: () => void, delayMs: number) {
		const key = ++this.sequence;
		this.pending.set(key, { due: this.time + delayMs, callback });
		return key;
	}
	clear(handle: unknown) { this.pending.delete(handle as number); }
	advance(milliseconds: number) {
		this.time += milliseconds;
		const due = [...this.pending.entries()].filter(([, job]) => job.due <= this.time);
		for (const [key, job] of due) { this.pending.delete(key); job.callback(); }
	}
}

class MemoryStorage implements CompanionStorage {
	value: unknown;
	writes = 0;
	failNext = false;
	staleNext = false;
	async write(value: CompanionState) {
		this.writes++;
		if (this.failNext) { this.failNext = false; throw new Error('Storage unavailable'); }
		if (this.staleNext) { this.staleNext = false; return; }
		this.value = structuredClone(value);
	}
	async read() { return structuredClone(this.value); }
}

test('learning catalogue has sourced facts and answerable trivia with unique stable identities', () => {
	assert.equal(FACT_CARDS.length, 60);
	assert.equal(TRIVIA_CARDS.length, 30);
	assert.equal(ENCOURAGEMENT_CARDS.length, 80);
	assert.equal(new Set(ALL_CARDS.map(card => card.id)).size, 170);
	assert.equal(MIXED_CARDS.length, 90);
	assert.equal(new Set(MIXED_CARDS.map(card => card.id)).size, 90);
	assert.deepEqual(FACT_CARDS.slice(0, 6).map(card => card.topic), ['Git', 'Code', 'GPU', 'AI', 'Silicon', 'Testing']);
	for (const card of [...FACT_CARDS, ...TRIVIA_CARDS]) {
		assert.ok(card.text.length > 20 && card.text.length <= 260, card.id);
		assert.ok(card.source?.label);
		assert.equal(new URL(card.source!.url).protocol, 'https:');
		if (card.kind === 'trivia') { assert.ok(card.answer && card.answer.length <= 240, card.id); }
	}
	assert.deepEqual(ENCOURAGEMENT_CARDS.map(card => card.text), MESSAGES);
});

test('feed preferences retain the legacy quote, reveal only the current trivia and survive JSON reload', () => {
	let state = defaultCompanionState(17);
	assert.equal(currentLearningCard(state).kind, 'fact');
	state = applyCompanionAction(state, { type: 'feed-mode', mode: 'encouragement' }, START).state;
	assert.equal(currentLearningCard(state).text, MESSAGES[17]);
	state = applyCompanionAction(state, { type: 'feed-mode', mode: 'trivia' }, START).state;
	const question = state.learning.cardId;
	state = applyCompanionAction(state, { type: 'feed-reveal', cardId: question, revealed: true }, START).state;
	assert.equal(state.learning.revealed, true);
	assert.equal(applyCompanionAction(state, { type: 'feed-reveal', cardId: question, revealed: true }, START).state, state);
	const revealed = restoreCompanionState(JSON.parse(JSON.stringify(state)), START);
	assert.deepEqual(revealed, state);
	state = applyCompanionAction(state, { type: 'feed-next' }, START).state;
	assert.equal(state.learning.revealed, false);
	assert.notEqual(state.learning.cardId, question);
	assert.equal(applyCompanionAction(state, { type: 'feed-reveal', cardId: question, revealed: true }, START).state, state);
	state = applyCompanionAction(state, { type: 'feed-mode', mode: 'encouragement' }, START).state;
	assert.equal(currentLearningCard(state).text, MESSAGES[17]);
});

test('every feed loops its own deck without leaking other kinds or losing the selected identity', () => {
	for (const mode of ['mix', 'facts', 'trivia', 'encouragement'] as const) {
		let state = applyCompanionAction(defaultCompanionState(), { type: 'feed-mode', mode }, START).state;
		const first = state.learning.cardId;
		const seen = new Set<string>();
		for (let index = 0; index < feedDeck(mode).length; index++) {
			seen.add(state.learning.cardId);
			state = applyCompanionAction(state, { type: 'feed-next' }, START).state;
		}
		assert.equal(seen.size, feedDeck(mode).length);
		assert.equal(state.learning.cardId, first);
	}
});

test('untrusted actions cannot set a clock, arbitrary URL or out-of-range duration', () => {
	for (const value of [null, [], {}, { type: 'open-url', url: 'file:///private' },
		{ ...startAction, focusMinutes: 0 }, { ...startAction, focusMinutes: 121 },
		{ ...startAction, focusMinutes: 1.5 }, { ...startAction, breakMinutes: 31 },
		{ ...startAction, intent: 'x'.repeat(1001) }, { ...startAction, phase: 'forever' },
		{ type: 'feed-mode', mode: 'paid' }, { type: 'feed-reveal', cardId: '', revealed: 'yes' }]) {
		assert.equal(parseCompanionAction(value), undefined);
	}
	assert.deepEqual(parseCompanionAction({ ...startAction, now: 0, extra: true }), startAction);
	assert.equal(parseCompanionAction({ ...startAction, intent: '  one\n small   goal  ' })?.type, 'focus-start');
	const sanitized = applyCompanionAction(defaultCompanionState(), { ...startAction, intent: '  one\n small   goal  ' }, START).state;
	assert.equal(sanitized.settings.intent, 'one small goal');
	assert.throws(() => applyCompanionAction(defaultCompanionState(), { ...startAction, focusMinutes: -1 }, START), /Invalid/);
});

test('focus time pauses exactly, resumes from its remainder and finishes only one session', () => {
	let state = applyCompanionAction(defaultCompanionState(), startAction, START).state;
	assert.equal(remainingFocusMs(state, START), MINUTE_MS);
	assert.equal(remainingFocusMs(state, START + 12345), 47655);
	state = applyCompanionAction(state, { type: 'focus-pause' }, START + 12345).state;
	assert.equal(state.focus.status, 'paused');
	assert.equal(remainingFocusMs(state, START + 3 * 3600000), 47655);
	state = applyCompanionAction(state, { type: 'focus-resume' }, START + 3 * 3600000).state;
	const end = state.focus.deadlineAt!;
	assert.equal(end, START + 3 * 3600000 + 47655);
	assert.equal(remainingFocusMs(state, end - 1), 1);
	state = reconcileCompanion(state, end);
	assert.equal(state.focus.status, 'finished');
	assert.equal(state.focus.phase, 'focus');
	assert.equal(state.focus.deadlineAt, null);
	assert.equal(reconcileCompanion(state, end + 24 * 3600000), state);
	assert.equal(companionSnapshot(state, end).progress, 1);
	state = applyCompanionAction(state, { ...startAction, phase: 'break' }, end).state;
	assert.equal(state.focus.phase, 'break');
	state = applyCompanionAction(state, { type: 'focus-stop' }, end + 1000).state;
	assert.equal(state.focus.status, 'idle');
	assert.equal(state.focus.phase, 'focus');
	assert.equal(companionSnapshot(state, end).progress, 0);
});

test('an active session keeps its chosen duration and intent until explicitly stopped', () => {
	let state = applyCompanionAction(defaultCompanionState(), startAction, START).state;
	const unchanged = applyCompanionAction(state, { type: 'focus-configure', focusMinutes: 50, breakMinutes: 10, intent: 'Other goal' }, START + 1000);
	assert.equal(unchanged.state, state);
	assert.ok(unchanged.message?.includes('Stop'));
	state = applyCompanionAction(state, { type: 'focus-pause' }, START + 1000).state;
	assert.equal(applyCompanionAction(state, { ...startAction, focusMinutes: 25 }, START + 2000).state, state);
	assert.equal(state.settings.intent, startAction.intent);
});

test('recovery finishes one overdue timer without fabricating an overnight sequence', () => {
	const running = applyCompanionAction(defaultCompanionState(), startAction, START).state;
	const restored = restoreCompanionState(JSON.parse(JSON.stringify(running)), START);
	const recovered = reconcileCompanion(restored, START + 24 * 3600000, undefined, true);
	assert.equal(recovered.focus.status, 'finished');
	assert.equal(recovered.focus.notice, 'elapsed-away');
	assert.equal(recovered.focus.remainingMs, 0);
	assert.equal(recovered.focus.phase, 'focus');
	assert.equal(reconcileCompanion(recovered, START + 48 * 3600000, undefined, true), recovered);
});

test('an observed backwards clock pauses at the last known remainder rather than extending a timer', () => {
	const running = applyCompanionAction(defaultCompanionState(), startAction, START).state;
	const paused = reconcileCompanion(running, START + 5000, START + 10000);
	assert.equal(paused.focus.status, 'paused');
	assert.equal(paused.focus.remainingMs, 50000);
	assert.equal(paused.focus.notice, 'clock-changed');
	assert.equal(paused.focus.deadlineAt, null);
	const beforeStart = reconcileCompanion(running, START - 1000, undefined, true);
	assert.equal(beforeStart.focus.remainingMs, MINUTE_MS);
	assert.equal(beforeStart.focus.status, 'paused');
	assert.throws(() => remainingFocusMs(running, Number.NaN), /clock/);
});

test('saved companion data is bounded and malformed timer arithmetic cannot create a long-running timer', () => {
	assert.deepEqual(restoreCompanionState(null, START), defaultCompanionState());
	assert.deepEqual(restoreCompanionState({ version: 99 }, START), defaultCompanionState());
	const value = defaultCompanionState();
	const invalid = restoreCompanionState({
		...value, settings: { focusMinutes: 999, breakMinutes: -50, intent: 'x'.repeat(500) },
		focus: { ...value.focus, status: 'running', startedAt: START, deadlineAt: START + 999999999, remainingMs: 60000 },
		learning: { mode: 'trivia', cardId: 'unknown', encouragementId: 'unknown', revealed: true },
	}, START);
	assert.equal(invalid.settings.focusMinutes, 120);
	assert.equal(invalid.settings.breakMinutes, 1);
	assert.equal(invalid.settings.intent.length, 160);
	assert.equal(invalid.focus.status, 'idle');
	assert.equal(invalid.learning.cardId, TRIVIA_CARDS[0].id);
	assert.equal(invalid.learning.revealed, false);
	assert.equal(formatFocusTime(60000), '1:00');
	assert.equal(formatFocusTime(59999), '1:00');
	assert.equal(formatFocusTime(59000), '0:59');
	assert.equal(formatFocusTime(7200000), '2:00:00');
});

test('controller ticks update the view without writing each second, then persist one completion', async context => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const controller = new CompanionController(undefined, storage, 0, clock);
	context.after(() => controller.dispose());
	await controller.initialize();
	assert.equal(storage.writes, 1);
	assert.equal(clock.pending.size, 0);
	await controller.dispatch(startAction);
	assert.equal(storage.writes, 2);
	assert.equal(clock.pending.size, 1);
	clock.advance(10000);
	await controller.flush();
	assert.equal(controller.snapshot().remainingMs, 50000);
	assert.equal(storage.writes, 2);
	clock.advance(100000);
	await controller.flush();
	assert.equal(controller.snapshot().state.focus.status, 'finished');
	assert.equal(storage.writes, 3);
	assert.equal(clock.pending.size, 0);
	clock.advance(24 * 3600000);
	await controller.flush();
	assert.equal(storage.writes, 3);
});

test('failed or stale file confirmation does not advance a user action and a later save recovers', async context => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const controller = new CompanionController(undefined, storage, 0, clock);
	context.after(() => controller.dispose());
	await controller.initialize();
	storage.failNext = true;
	await assert.rejects(controller.dispatch(startAction), /Storage/);
	assert.equal(controller.snapshot().state.focus.status, 'idle');
	assert.ok(controller.snapshot().error);
	assert.equal(clock.pending.size, 0);
	storage.staleNext = true;
	await assert.rejects(controller.dispatch(startAction), /confirm/);
	assert.equal(controller.snapshot().state.focus.status, 'idle');
	await controller.dispatch(startAction);
	assert.equal(controller.snapshot().state.focus.status, 'running');
	assert.equal(controller.snapshot().error, undefined);
});

test('controller serializes a rapid start and pause and cancels its owned timers on disposal', async () => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const controller = new CompanionController(undefined, storage, 0, clock);
	await controller.initialize();
	await Promise.all([controller.dispatch(startAction), controller.dispatch({ type: 'focus-pause' })]);
	assert.equal(controller.snapshot().state.focus.status, 'paused');
	assert.equal(clock.pending.size, 0);
	await controller.dispatch({ type: 'focus-resume' });
	assert.equal(clock.pending.size, 1);
	await controller.dispose();
	assert.equal(clock.pending.size, 0);
	await assert.rejects(controller.dispatch(startAction), /closed/);
});

test('companion state uses a separate canonical file and survives a new controller with the same deadline', async context => {
	const directory = mkdtempSync(join(tmpdir(), 'charmlet-companion-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const store = new StateStore<CompanionState>(directory, 'companion.json');
	const clock = new FakeClock();
	const first = new CompanionController(undefined, store, 17, clock);
	await first.initialize();
	await first.dispatch(startAction);
	const deadline = first.snapshot().state.focus.deadlineAt;
	await first.dispose();
	clock.advance(10000);
	const second = new CompanionController(await store.read(), store, 0, clock);
	context.after(() => second.dispose());
	await second.initialize();
	assert.equal(second.snapshot().state.focus.deadlineAt, deadline);
	assert.equal(second.snapshot().remainingMs, 50000);
	assert.deepEqual(await readdir(directory), ['companion.json']);
	assert.equal(matchesCompanionState(second.snapshot().state, await store.read()), true);
});

test('an older controller never overwrites a newer companion file with default state', async context => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const future = { version: 99, garden: { preciousProgress: 11 }, extra: 'Keep this data' };
	storage.value = structuredClone(future);
	const controller = new CompanionController(future, storage, 0, clock);
	context.after(() => controller.dispose());
	await controller.initialize();
	assert.equal(storage.writes, 0);
	assert.deepEqual(await storage.read(), future);
	assert.match(controller.snapshot().error!, /newer version/);
	assert.equal(clock.pending.size, 0);
	await assert.rejects(controller.dispatch(startAction), /newer version/);
	assert.deepEqual(await storage.read(), future);
});

test('version one migrates to an empty free garden and disabled care without losing focus or learning', () => {
	let before = applyCompanionAction(defaultCompanionState(17), startAction, START).state;
	before = applyCompanionAction(before, { type: 'focus-pause' }, START + 12345).state;
	const old = { version: 1, revision: before.revision, settings: before.settings, focus: before.focus, learning: before.learning };
	const migrated = restoreCompanionState(old, START + 100000);
	assert.equal(migrated.version, 2);
	assert.deepEqual(migrated.focus, before.focus);
	assert.deepEqual(migrated.learning, before.learning);
	assert.deepEqual(migrated.settings, before.settings);
	assert.deepEqual(migrated.garden, garden.emptyGarden());
	assert.deepEqual(migrated.care, care.defaultCare());
});

test('the garden daily allowance survives reload, blooming and planting another seed', () => {
	const first = Date.parse('2026-10-08T12:00:00Z');
	const day = (number: number) => `2026-10-${String(number).padStart(2, '0')}`;
	let state = garden.plantGarden(garden.emptyGarden(), first, 'plant-one', size => { assert.equal(size, 12); return 2; });
	assert.equal(state.plant!.flowerId, 'hibiscus');
	assert.equal(garden.plantGarden(state, first, 'ignored', () => { throw Error('Must not reroll'); }), state);
	state = garden.waterGarden(state, first, day(8)).state;
	assert.equal(state.plant!.waterings, 1);
	assert.equal(garden.waterGarden(state, first + 1000, day(8)).state, state);
	assert.equal(garden.waterGarden(state, first - 1000, day(7)).reason, 'clock-changed');
	state = garden.restoreGarden(JSON.parse(JSON.stringify(state)), first, day(8));
	assert.equal(state.plant!.flowerId, 'hibiscus');
	for (let dayNumber = 9; dayNumber <= 18; dayNumber++) {
		const result = garden.waterGarden(state, first + (dayNumber - 8) * 86400000, day(dayNumber));
		state = result.state;
		assert.equal(result.reason, dayNumber === 18 ? 'bloomed' : 'watered');
		assert.equal(state.collection.length, dayNumber === 18 ? 1 : 0);
	}
	assert.equal(state.plant!.waterings, 11);
	assert.equal(state.collection[0].blooms, 1);
	assert.equal(garden.waterGarden(state, first, day(19)).reason, 'complete');
	state = garden.restoreGarden(JSON.parse(JSON.stringify(state)), first + 10 * 86400000, day(18));
	state = garden.plantGarden(state, first + 10 * 86400000, 'plant-two', size => { assert.equal(size, 11); return 0; });
	assert.equal(state.collection.length, 1);
	assert.equal(state.plant!.waterings, 0);
	assert.equal(garden.waterGarden(state, first + 10 * 86400000, day(18)).reason, 'watered-today');
	state = garden.waterGarden(state, first + 11 * 86400000, day(19)).state;
	assert.equal(state.plant!.waterings, 1);
});

test('missing garden days keep progress and all twelve species precede repeated keepsakes', () => {
	let state = garden.plantGarden(garden.emptyGarden(), START, 'first', () => 0);
	state = garden.waterGarden(state, START, '2027-01-01').state;
	state = garden.restoreGarden(JSON.parse(JSON.stringify(state)), START + 15 * 86400000, '2027-01-16');
	assert.equal(state.plant!.waterings, 1);
	assert.equal(garden.waterGarden(state, START + 15 * 86400000, '2027-01-16').state.plant!.waterings, 2);
	state = garden.emptyGarden();
	let ordinal = 1;
	for (let planting = 0; planting < 13; planting++) {
		state = garden.plantGarden(state, START + planting, `plant-${planting}`, size => {
			assert.equal(size, planting < 12 ? 12 - planting : 12);
			return 0;
		});
		for (let watering = 0; watering < 11; watering++) {
			const now = Date.UTC(2027, 0, ordinal++, 12);
			state = garden.waterGarden(state, now, new Date(now).toISOString().slice(0, 10)).state;
		}
	}
	assert.equal(state.collection.length, 12);
	assert.equal(new Set(state.collection.map(item => item.id)).size, 12);
	assert.equal(state.collection.find(item => item.id === 'sunflower')!.blooms, 2);
	assert.equal(state.collection.reduce((sum, item) => sum + item.blooms, 0), 13);
});

test('garden validation rejects bad random choices and conservatively restores damaged progress', () => {
	for (const value of [-1, 12, 0.5, Number.NaN]) {
		assert.throws(() => garden.plantGarden(garden.emptyGarden(), START, 'seed', () => value), /seed choice/);
	}
	const broken = garden.restoreGarden({
		plant: { id: 'seed', flowerId: 'iris', waterings: 999, plantedAt: START },
		collection: [{ id: 'daisy', blooms: 2, firstBloomAt: START, lastBloomAt: START }, { id: 'daisy', blooms: 1 }, { id: '../outside' }],
		lastWateredDay: 'not-a-date',
	}, START, '2027-01-15');
	assert.equal(broken.plant!.waterings, 10);
	assert.equal(broken.collection.length, 1);
	assert.equal(broken.collection[0].blooms, 2);
	assert.equal(broken.lastWateredDay, '2027-01-15');
	assert.equal(garden.canWaterGarden(broken, '2027-01-15'), false);
	assert.equal(garden.isDayKey('2026-02-30'), false);
	assert.equal(garden.isDayKey('2028-02-29'), true);
	assert.equal(garden.isDayKey('2026-2-8'), false);
});

test('garden midnight follows local daylight-saving days instead of adding twenty-four hours', () => {
	const output = execFileSync(process.execPath, ['-e', `
		const garden = require(process.argv[1]);
		const spring = Date.parse('2026-03-08T00:00:00-08:00');
		const autumn = Date.parse('2026-11-01T00:00:00-07:00');
		let state = garden.plantGarden(garden.emptyGarden(), spring, 'spring-seed', () => 0);
		const before = garden.gardenNextChange(state, spring);
		state = garden.waterGarden(state, spring, '2026-03-08').state;
		const next = garden.gardenNextChange(state, spring);
		console.log(JSON.stringify({
			spring: garden.nextLocalMidnight(spring)-spring, autumn: garden.nextLocalMidnight(autumn)-autumn,
			day: garden.localDayKey(spring), before: before ?? null, next,
			after: garden.gardenNextChange(state, garden.nextLocalMidnight(spring)) ?? null
		}));
	`, require.resolve('../garden-core')], { env: { ...process.env, TZ: 'America/Los_Angeles' }, encoding: 'utf8' });
	const observed = JSON.parse(output);
	assert.equal(observed.spring, 23 * 3600000);
	assert.equal(observed.autumn, 25 * 3600000);
	assert.equal(observed.day, '2026-03-08');
	assert.equal(observed.before, null);
	assert.equal(observed.next, Date.parse('2026-03-09T00:00:00-07:00'));
	assert.equal(observed.after, null);
});

test('optional reminders keep only one pending cue per kind and defer while focusing', () => {
	let state = care.defaultCare();
	assert.equal(care.nextReminderDue(state), undefined);
	state = care.configureReminder(state, 'water', true, 15, START);
	state = care.configureReminder(state, 'move', true, 15, START);
	assert.equal(care.nextReminderDue(state), START + 15 * MINUTE_MS);
	state = care.settleCare(state, START + 15 * MINUTE_MS);
	assert.equal(care.nextReminderDue(state), undefined);
	assert.equal(care.visibleReminder(state, { phase: 'focus', status: 'running' }), undefined);
	assert.equal(care.visibleReminder(state, { phase: 'focus', status: 'paused' }), 'water');
	assert.equal(care.visibleReminder(state, { phase: 'break', status: 'running' }), 'water');
	assert.equal(care.settleCare(state, START + 3 * 86400000), state);
	const dismissed = care.dismissReminder(state, 'water', 'done', START + 3 * 86400000);
	assert.equal(dismissed.water.dueAt, START + 3 * 86400000 + 15 * MINUTE_MS);
	assert.equal(care.visibleReminder(dismissed, { phase: 'focus', status: 'idle' }), 'move');
});

test('snooze skip disable and clock rollback retain a bounded reminder schedule', () => {
	let state = care.configureReminder(care.defaultCare(), 'move', true, 50, START);
	state = care.settleCare(state, START + 50 * MINUTE_MS);
	state = care.dismissReminder(state, 'move', 'snooze', START + 50 * MINUTE_MS);
	assert.equal(state.move.dueAt, START + 60 * MINUTE_MS);
	assert.equal(care.dismissReminder(state, 'move', 'snooze', START + 51 * MINUTE_MS), state);
	state = care.settleCare(state, START + 60 * MINUTE_MS);
	state = care.dismissReminder(state, 'move', 'skip', START + 60 * MINUTE_MS);
	assert.equal(state.move.dueAt, START + 110 * MINUTE_MS);
	state = care.configureReminder(state, 'move', false, 50, START);
	assert.equal(state.move.dueAt, null);
	assert.equal(state.move.pendingAt, null);
	state = care.configureReminder(state, 'water', true, 15, START);
	state = care.configureReminder(state, 'move', true, 60, START);
	state = care.settleCare(state, START + 15 * MINUTE_MS);
	const adjusted = care.settleCare(state, START - MINUTE_MS, START + 15 * MINUTE_MS);
	assert.equal(adjusted.water.pendingAt, state.water.pendingAt);
	assert.equal(adjusted.move.dueAt, START - MINUTE_MS + 60 * MINUTE_MS);
	assert.throws(() => care.configureReminder(state, 'water', true, 1, START), /settings/);
	const restored = care.restoreCare({
		water: { enabled: true, intervalMinutes: 15, dueAt: START + 999999999 },
		move: { enabled: true, intervalMinutes: 60, pendingAt: START - MINUTE_MS, dueAt: START },
	}, START);
	assert.equal(restored.water.dueAt, START + 15 * MINUTE_MS);
	assert.equal(restored.move.dueAt, null);
	assert.deepEqual(care.restoreCare(JSON.parse(JSON.stringify(restored)), START), restored);
});

test('controller persists a flower exactly once and a failed eleventh watering keeps the old progress', async context => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const initial = defaultCompanionState();
	initial.garden = {
		plant: { id: 'nearly-grown', flowerId: 'sunflower', waterings: 10, plantedAt: START - 14 * 86400000 },
		lastWateredDay: garden.localDayKey(START - 86400000), lastWateredAt: START - 86400000, collection: [],
	};
	const controller = new CompanionController(initial, storage, 0, clock, { plantId: () => 'new-seed', index: () => 1 });
	context.after(() => controller.dispose());
	await controller.initialize();
	storage.failNext = true;
	await assert.rejects(controller.dispatch({ type: 'garden-water', today: '2099-01-01', waterings: 11 }), /Storage/);
	assert.equal(controller.snapshot().state.garden.plant!.waterings, 10);
	assert.equal(controller.snapshot().state.garden.collection.length, 0);
	await controller.dispatch({ type: 'garden-water' });
	assert.equal(controller.snapshot().state.garden.plant!.waterings, 11);
	assert.equal(controller.snapshot().state.garden.collection[0].blooms, 1);
	await controller.dispatch({ type: 'garden-water' });
	assert.equal(controller.snapshot().state.garden.collection[0].blooms, 1);
	await controller.dispatch({ type: 'garden-plant' });
	assert.equal(controller.snapshot().state.garden.plant!.flowerId, 'hibiscus');
	assert.equal(controller.snapshot().gardenCanWater, false);
	assert.equal(clock.pending.size, 1);
});

test('the scheduler wakes for a reminder while focus is idle and never creates a catch-up backlog', async context => {
	const clock = new FakeClock();
	const storage = new MemoryStorage();
	const controller = new CompanionController(undefined, storage, 0, clock);
	context.after(() => controller.dispose());
	await controller.initialize();
	await controller.dispatch({ type: 'care-configure', kind: 'water', enabled: true, intervalMinutes: 15 });
	assert.equal(clock.pending.size, 1);
	clock.advance(2 * 86400000);
	await controller.flush();
	assert.equal(controller.snapshot().reminder, 'water');
	assert.equal(clock.pending.size, 0);
	assert.equal(storage.writes, 3);
	await controller.dispatch({ type: 'care-dismiss', kind: 'water', action: 'snooze' });
	assert.equal(controller.snapshot().reminder, null);
	assert.equal(controller.snapshot().state.care.water.dueAt, clock.now() + care.SNOOZE_MS);
	assert.equal(clock.pending.size, 1);
	assert.equal(controller.snapshot().state.garden.lastWateredDay, null);
});
