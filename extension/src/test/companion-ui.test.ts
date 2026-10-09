import { test, expect, _electron as electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyCompanionAction, defaultCompanionState } from '../companion-core';
import { DEFAULT_STATE } from '../charm-state';
import { learningCard } from '../learning-cards';
import { MESSAGES } from '../messages';
import { localDayKey } from '../garden-core';
import { command, readyFrame, reloadCharm } from './editor-helpers';

interface OwnedEditor {
	profile: string;
	storage: string;
	preferencesPath: string;
	companionPath: string;
	app: ElectronApplication;
	window: Page;
}

async function launchOwnedEditor(prefix: string, seed: (paths: Omit<OwnedEditor, 'app' | 'window'>) => void): Promise<OwnedEditor> {
	const profile = mkdtempSync(join(tmpdir(), prefix));
	const scratchFile = join(profile, 'companion-trial.ts');
	const storage = join(profile, 'user', 'User', 'globalStorage', 'gautham-nvidia.charmlet');
	const paths = {
		profile, storage,
		preferencesPath: join(storage, 'preferences.json'),
		companionPath: join(storage, 'companion.json'),
	};
	mkdirSync(storage, { recursive: true });
	writeFileSync(scratchFile, "export const companion = 'Focus, learn and grow';\n");
	seed(paths);
	const environment: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') { environment[key] = value; }
	}
	environment.CHARMLET_TRACE_SAVES = '1';
	const executablePath = process.env.VSCODE_EXECUTABLE
		?? (process.platform === 'win32' ? 'C:\\Program Files\\Microsoft VS Code\\Code.exe' : undefined);
	if (!executablePath) { throw new Error('Set VSCODE_TEST_VERSION or VSCODE_EXECUTABLE for this desktop editor.'); }
	const app = await electron.launch({
		executablePath,
		args: [
			'--new-window', `--user-data-dir=${join(profile, 'user')}`, `--extensions-dir=${join(profile, 'extensions')}`,
			`--extensionDevelopmentPath=${resolve('.')}`,
			...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu-sandbox'] : []),
			'--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--disable-telemetry', '--disable-updates', scratchFile,
		],
		env: environment,
		timeout: 45000,
	});
	try {
		const window = await app.firstWindow();
		expect(realpathSync(await app.evaluate(({ app: host }) => host.getPath('userData')))).toBe(realpathSync(join(profile, 'user')));
		await app.evaluate(({ BrowserWindow }) => {
			const testWindow = BrowserWindow.getAllWindows()[0];
			testWindow.setIgnoreMouseEvents(true);
			testWindow.setSize(1400, 900);
		});
		await expect(window.locator('.part.activitybar a.action-label[aria-label="Charmlet"]')).toBeVisible({ timeout: 30000 });
		return { ...paths, app, window };
	} catch (error) {
		await app.close();
		throw error;
	}
}

async function closeOwnedEditor(editor: OwnedEditor, testInfo: TestInfo) {
	try {
		await editor.app.close();
	} finally {
		const editorLogs = join(editor.profile, 'user', 'logs');
		if (existsSync(editorLogs)) {
			try { cpSync(editorLogs, testInfo.outputPath('editor-logs'), { recursive: true }); } catch { /* Keep test result. */ }
		}
	}
}

test('companion focus and learning persist across a real editor reload', async ({}, testInfo) => {
	test.setTimeout(180000);
	const editor = await launchOwnedEditor('charmlet-companion-ui-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({
			...DEFAULT_STATE, messageIndex: 17, rotateMessages: false, reducedMotion: true,
		})}\n`);
		const expired = applyCompanionAction(
			defaultCompanionState(17),
			{ type: 'focus-start', phase: 'focus', focusMinutes: 1, breakMinutes: 1, intent: 'Old session' },
			Date.now() - 2 * 60000,
		).state;
		writeFileSync(companionPath, `${JSON.stringify(expired)}\n`);
	});
	const { window, preferencesPath, companionPath } = editor;
	try {
		await command(window, 'Charmlet: Show Charm');
		let frame = await readyFrame(window);
		const stage = frame.locator('#stage');
		await expect(stage).toHaveAttribute('data-companion-ready', 'true');
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await expect(frame.locator('#focus-status')).toHaveText('Focus complete');
		await expect(frame.locator('#focus-notice')).toContainText('ended while you were away');
		expect(JSON.parse(readFileSync(companionPath, 'utf8')).focus.status).toBe('finished');

		await frame.getByRole('button', { name: 'Stop', exact: true }).click();
		await expect(stage).toHaveAttribute('data-companion-persisted', 'true');
		const focusMinutes = frame.locator('#focus-minutes');
		const breakMinutes = frame.locator('#break-minutes');
		const focusIntent = frame.locator('#focus-intent');
		await focusMinutes.focus();
		await focusMinutes.fill('1');
		await focusMinutes.press('Tab');
		await expect(breakMinutes).toBeFocused();
		await expect(breakMinutes).toBeEditable();
		await breakMinutes.fill('1');
		await breakMinutes.press('Tab');
		await expect(focusIntent).toBeFocused();
		await expect(focusIntent).toBeEditable();
		await focusIntent.fill('Repair parser test');
		await frame.getByRole('button', { name: 'Start focus', exact: true }).click();
		await expect(stage).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#focus-status')).toHaveText('Focusing');
		await expect(frame.locator('#focus-ring')).toBeVisible();
		const running = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(running.settings.intent).toBe('Repair parser test');
		expect(running.focus.deadlineAt - Date.now()).toBeGreaterThan(0);
		expect(running.focus.deadlineAt - Date.now()).toBeLessThanOrEqual(60000);
		const firstDeadline = running.focus.deadlineAt;
		const messageText = frame.locator('#message-text');
		await messageText.evaluate(node => {
			(globalThis as unknown as { __charmletMessageNode?: ChildNode | null }).__charmletMessageNode = node.firstChild;
		});
		const initialFocusTime = (await frame.locator('#focus-time').textContent())!;
		await expect(frame.locator('#focus-time')).not.toHaveText(initialFocusTime);
		expect(await messageText.evaluate(node => {
			const saved = (globalThis as unknown as { __charmletMessageNode?: ChildNode | null }).__charmletMessageNode;
			return saved === node.firstChild && saved?.isConnected === true;
		})).toBe(true);

		await frame.getByRole('button', { name: 'Pause', exact: true }).click();
		await expect(stage).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#focus-status')).toHaveText('Paused');
		const paused = JSON.parse(readFileSync(companionPath, 'utf8'));
		const pausedText = await frame.locator('#focus-time').textContent();
		await window.screenshot({ path: testInfo.outputPath('phase-4-focus.png') });

		frame = await reloadCharm(window);
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await expect(frame.locator('#focus-status')).toHaveText('Paused');
		expect(JSON.parse(readFileSync(companionPath, 'utf8')).focus.remainingMs).toBe(paused.focus.remainingMs);
		await expect(frame.locator('#focus-time')).toHaveText(pausedText!);
		await frame.getByRole('button', { name: 'Resume', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		const resumed = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(resumed.focus.status).toBe('running');
		expect(resumed.focus.deadlineAt).toBeGreaterThan(firstDeadline);
		await frame.getByRole('button', { name: 'Stop', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#focus-ring')).toBeHidden();
		const storedPreferences = JSON.parse(readFileSync(preferencesPath, 'utf8'));
		expect(storedPreferences.cordLength).toBe(126);
		expect(storedPreferences.size).toBe(100);
		await expect(frame.locator('#cord-length')).toHaveValue('126');
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await expect(frame.locator('#companion-tools')).toBeHidden();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-size', '100');
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();

		await frame.getByRole('tab', { name: 'Learn', exact: true }).click();
		await frame.locator('#feed-mode').selectOption('trivia');
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		const questionState = JSON.parse(readFileSync(companionPath, 'utf8'));
		const questionId = questionState.learning.cardId;
		const questionText = await frame.locator('#message-text').textContent();
		const question = learningCard(questionId)!;
		expect(question.kind).toBe('trivia');
		expect(questionText).toBe(question.text);
		await frame.getByRole('button', { name: 'Reveal answer', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#message-answer')).toHaveText(question.answer!);
		await expect(frame.locator('#message-source')).toBeVisible();
		await window.screenshot({ path: testInfo.outputPath('phase-4-learning.png') });
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await expect(frame.locator('#companion-tools')).toBeHidden();
		await expect(frame.locator('#message-card')).toHaveAttribute('data-rotation', 'paused');
		await frame.getByRole('button', { name: 'Next coding message', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#message-text')).not.toHaveText(questionText!);
		await expect(frame.locator('#message-answer')).toBeHidden();
		const selectedAfterNext = JSON.parse(readFileSync(companionPath, 'utf8')).learning.cardId;

		frame = await reloadCharm(window);
		let restored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(restored.learning.mode).toBe('trivia');
		expect(restored.learning.cardId).toBe(selectedAfterNext);
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await frame.getByRole('tab', { name: 'Learn', exact: true }).click();
		await frame.locator('#feed-mode').selectOption('encouragement');
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#message-text')).toHaveText(MESSAGES[17]);
		await frame.locator('#feed-mode').selectOption('facts');
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		restored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(learningCard(restored.learning.cardId)?.kind).toBe('fact');
		await expect(frame.locator('#message-source')).toBeVisible();

		await command(window, 'Charmlet: Focus Session');
		await expect(frame.locator('#companion-tools')).toBeVisible();
		const focusTab = frame.getByRole('tab', { name: 'Focus', exact: true });
		const learnTab = frame.getByRole('tab', { name: 'Learn', exact: true });
		const gardenTab = frame.getByRole('tab', { name: 'Garden', exact: true });
		await expect(focusTab).toHaveAttribute('aria-selected', 'true');
		await expect(focusTab).toBeFocused();
		await focusTab.press('ArrowLeft');
		await expect(gardenTab).toBeFocused();
		await expect(gardenTab).toHaveAttribute('aria-selected', 'true');
		await gardenTab.press('ArrowRight');
		await expect(focusTab).toBeFocused();
		await expect(focusTab).toHaveAttribute('aria-selected', 'true');
		await focusTab.press('ArrowRight');
		await expect(learnTab).toBeFocused();
		await expect(learnTab).toHaveAttribute('aria-selected', 'true');
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

test('garden rewards and gentle reminders persist through the real editor', async ({}, testInfo) => {
	test.setTimeout(180000);
	const seededAt = Date.now();
	const yesterday = new Date(seededAt);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayKey = localDayKey(yesterday.getTime());
	const editor = await launchOwnedEditor('charmlet-garden-ui-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, reducedMotion: true })}\n`);
		const companion = defaultCompanionState();
		companion.garden = {
			plant: { id: 'almost-grown', flowerId: 'hibiscus', waterings: 10, plantedAt: seededAt - 20 * 86400000 },
			collection: [], lastWateredDay: yesterdayKey, lastWateredAt: yesterday.getTime(),
		};
		companion.care = {
			deferWhileFocusing: true,
			water: { enabled: true, intervalMinutes: 15, dueAt: seededAt - 2000, pendingAt: null },
			move: { enabled: true, intervalMinutes: 15, dueAt: seededAt - 1000, pendingAt: null },
		};
		writeFileSync(companionPath, `${JSON.stringify(companion)}\n`);
	});
	const { window, companionPath } = editor;
	try {
		await command(window, 'Charmlet: Show Charm');
		let frame = await readyFrame(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-ready', 'true');
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await expect(frame.locator('#care-cue')).toBeVisible();
		await expect(frame.locator('#care-cue-label')).toHaveText('Water break');
		await window.screenshot({ path: testInfo.outputPath('phase-4-care.png') });
		const beforeSnooze = Date.now();
		await frame.getByRole('button', { name: 'Snooze 10 min', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		const afterSnooze = Date.now();
		let stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.care.water.pendingAt).toBeNull();
		expect(stored.care.water.dueAt).toBeGreaterThanOrEqual(beforeSnooze + 10 * 60000);
		expect(stored.care.water.dueAt).toBeLessThanOrEqual(afterSnooze + 10 * 60000);
		await expect(frame.locator('#care-cue-label')).toHaveText('Stand and move');
		const beforeDone = Date.now();
		await frame.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		const afterDone = Date.now();
		stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.care.move.pendingAt).toBeNull();
		expect(stored.care.move.dueAt).toBeGreaterThanOrEqual(beforeDone + 15 * 60000);
		expect(stored.care.move.dueAt).toBeLessThanOrEqual(afterDone + 15 * 60000);
		await expect(frame.locator('#care-cue')).toBeHidden();

		await frame.locator('#care-settings').getByText('Gentle reminders', { exact: true }).click();
		const waterEnabled = frame.locator('#water-reminder-enabled');
		const moveEnabled = frame.locator('#move-reminder-enabled');
		await expect(waterEnabled).toBeChecked();
		await expect(moveEnabled).toBeChecked();
		await frame.locator('#water-reminder-minutes').fill('');
		await waterEnabled.uncheck();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await moveEnabled.uncheck();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.care.water).toMatchObject({ enabled: false, dueAt: null, pendingAt: null });
		expect(stored.care.move).toMatchObject({ enabled: false, dueAt: null, pendingAt: null });

		await frame.getByRole('tab', { name: 'Garden', exact: true }).click();
		await expect(frame.locator('#garden-count')).toHaveText('10 / 11 waterings');
		await frame.getByRole('button', { name: 'Water plant', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.garden.plant.waterings).toBe(11);
		expect(stored.garden.collection).toHaveLength(1);
		expect(stored.garden.collection[0]).toMatchObject({ id: 'hibiscus', blooms: 1 });
		await expect(frame.locator('#charm-select option[value="garden:hibiscus"]')).toHaveCount(1);
		await window.screenshot({ path: testInfo.outputPath('phase-4-garden.png') });
		await frame.getByRole('button', { name: 'Hang my flower', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'garden:hibiscus');
		await expect.poll(() => frame.locator('#charm-image').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(72);

		frame = await reloadCharm(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'garden:hibiscus');
		stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.garden.collection[0]).toMatchObject({ id: 'hibiscus', blooms: 1 });
		await frame.getByRole('button', { name: 'Companion tools', exact: true }).click();
		await frame.getByRole('tab', { name: 'Garden', exact: true }).click();
		await expect(frame.locator('#garden-count')).toHaveText('11 / 11 waterings');
		await frame.getByRole('button', { name: 'Plant another seed', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		stored = JSON.parse(readFileSync(companionPath, 'utf8'));
		expect(stored.garden.plant.waterings).toBe(0);
		expect(stored.garden.plant.flowerId).not.toBe('hibiscus');
		expect(stored.garden.collection[0]).toMatchObject({ id: 'hibiscus', blooms: 1 });
		await expect(frame.locator('#garden-art')).toHaveAttribute('src', /garden-seed\.svg$/);
		await expect(frame.getByRole('button', { name: 'Water plant', exact: true })).toBeDisabled();
		await frame.getByRole('button', { name: 'Hang Hibiscus, grown 1 time', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'garden:hibiscus');
		await expect(frame.locator('#garden-art')).toHaveAttribute('src', /garden-seed\.svg$/);
		await expect(frame.getByRole('button', { name: 'Water plant', exact: true })).toBeDisabled();
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});
