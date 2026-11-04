import { test, expect, _electron as electron, type ElectronApplication, type Frame, type Page, type TestInfo } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { resolveCliPathFromVSCodeExecutablePath } from '@vscode/test-electron';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { applyCompanionAction, defaultCompanionState } from '../companion-core';
import { DEFAULT_STATE } from '../charm-state';
import { CHARMS, TRIAL_CHARMS } from '../charm-catalog';
import { learningCard } from '../learning-cards';
import { MESSAGES } from '../messages';
import { localDayKey, type GardenState } from '../garden-core';
import { command, readyFrame, reloadCharm } from './editor-helpers';

interface OwnedEditor {
	profile: string;
	storage: string;
	preferencesPath: string;
	companionPath: string;
	app: ElectronApplication;
	window: Page;
}

async function alphaAtCordTip(frame: Frame): Promise<number> {
	const id = await frame.locator('#stage').getAttribute('data-charm');
	const bundled = TRIAL_CHARMS.find(charm => charm.id === id);
	// VS Code serves bundled images from a different origin. Read the same
	// packaged pixels locally while measuring the real rendered geometry.
	const png = bundled ? readFileSync(resolve('media', bundled.file)).toString('base64') : undefined;
	return frame.evaluate(async png => {
		const image = document.getElementById('charm-image') as HTMLImageElement;
		let pixels = image;
		if (png) {
			pixels = new Image();
			pixels.src = `data:image/png;base64,${png}`;
			await pixels.decode();
		}
		const path = document.getElementById('thread') as unknown as SVGPathElement;
		const point = path.getPointAtLength(path.getTotalLength());
		const matrix = path.getScreenCTM()!;
		const tip = { x: matrix.a * point.x + matrix.c * point.y + matrix.e, y: matrix.b * point.x + matrix.d * point.y + matrix.f };
		const bounds = image.getBoundingClientRect();
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
		const context = canvas.getContext('2d')!;
		context.drawImage(pixels, 0, 0);
		const x = Math.floor((tip.x - bounds.left) * canvas.width / bounds.width);
		const y = Math.floor((tip.y - bounds.top) * canvas.height / bounds.height);
		return context.getImageData(x, y, 1, 1).data[3];
	}, png);
}

async function launchOwnedEditor(prefix: string, seed: (paths: Omit<OwnedEditor, 'app' | 'window'>) => void, installed = false): Promise<OwnedEditor> {
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
	if (installed) {
		const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version as string;
		expect(version).toMatch(/^\d+\.\d+\.\d+$/);
		const cliPath = resolveCliPathFromVSCodeExecutablePath(executablePath);
		const args = [`--user-data-dir=${join(profile, 'user')}`, `--extensions-dir=${join(profile, 'extensions')}`,
			'--install-extension', resolve(`charmlet-${version}.vsix`), '--force'];
		let executable = cliPath;
		const cliEnvironment = { ...environment };
		if (process.platform === 'win32') {
			// The vendor wrapper locates versioned resources in recent Windows archives.
			// Invoke its Node entry directly so profile paths never pass through a shell.
			const match = readFileSync(cliPath, 'utf8').match(/"%~dp0\.\.\\([^"]+cli\.js)"/);
			if (!match) { throw new Error('Cannot locate the VS Code CLI in its vendor wrapper.'); }
			args.unshift(resolve(dirname(cliPath), '..', match[1]));
			executable = executablePath;
			cliEnvironment.ELECTRON_RUN_AS_NODE = '1';
			cliEnvironment.VSCODE_DEV = '';
		}
		const install = spawnSync(executable, args, { env: cliEnvironment, encoding: 'utf8', timeout: 90000 });
		expect(install.error, 'The isolated VSIX installer must start.').toBeUndefined();
		expect(install.status, install.stderr || install.stdout).toBe(0);
		const installedManifest = JSON.parse(readFileSync(join(profile, 'extensions', `gautham-nvidia.charmlet-${version}`, 'package.json'), 'utf8'));
		expect(installedManifest.version).toBe(version);
		writeFileSync(join(profile, 'user', 'User', 'settings.json'), JSON.stringify({
			'security.workspace.trust.emptyWindow': false,
			'security.workspace.trust.startupPrompt': 'never',
		}));
	}
	const app = await electron.launch({
		executablePath,
		args: [
			'--new-window', `--user-data-dir=${join(profile, 'user')}`, `--extensions-dir=${join(profile, 'extensions')}`,
			'--force-device-scale-factor=1', // Use the CI pixel grid on high-DPI developer displays too.
			...(installed ? [] : [`--extensionDevelopmentPath=${resolve('.')}`, '--disable-workspace-trust']),
			...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu-sandbox'] : []),
			'--skip-welcome', '--skip-release-notes', '--disable-telemetry', '--disable-updates', scratchFile,
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
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();
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
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();
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
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();
		await expect(frame.locator('#companion-tools')).toBeHidden();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-size', '100');
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();

		await frame.getByRole('tab', { name: 'Learn', exact: true }).click();
		await frame.locator('#feed-mode').selectOption('trivia');
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		const questionState = JSON.parse(readFileSync(companionPath, 'utf8'));
		const questionId = questionState.learning.cardId;
		const questionText = await frame.locator('#message-text').textContent();
		const question = learningCard(questionId)!;
		expect(question.kind).toBe('trivia');
		expect(questionText).toBe(question.text);
		await frame.locator('#companion-close').click();
		await frame.getByRole('button', { name: 'Reveal answer', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#message-answer')).toHaveText(question.answer!);
		await expect(frame.locator('#message-source')).toBeVisible();
		await window.screenshot({ path: testInfo.outputPath('phase-4-learning.png') });
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
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();
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
		await expect(frame.locator('#companion-tools')).toBeHidden();
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

		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-reminders').click();
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

		await frame.getByRole('button', { name: 'Open garden', exact: true }).click();
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
		await frame.getByRole('button', { name: 'Focus', exact: true }).click();
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

test('garden entry is visible before opening companion tools', async ({}, testInfo) => {
	const editor = await launchOwnedEditor('charmlet-garden-entry-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, reducedMotion: true })}\n`);
		writeFileSync(companionPath, `${JSON.stringify(defaultCompanionState())}\n`);
	});
	const { window, companionPath } = editor;
	try {
		await command(window, 'Charmlet: Show Charm');
		let frame = await readyFrame(window);
		const entry = frame.getByRole('button', { name: 'Open garden', exact: true });
		await expect(frame.locator('#companion-tools')).toBeHidden();
		await expect(entry).toBeVisible();
		await expect(entry).toHaveText('Garden');
		await entry.click();
		await expect(frame.getByRole('tab', { name: 'Garden', exact: true })).toHaveAttribute('aria-selected', 'true');
		await frame.getByRole('button', { name: 'Plant a seed', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(entry).toHaveText('Garden');
		await frame.getByRole('button', { name: 'Water plant', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await expect(frame.locator('#garden-count')).toHaveText('1 / 11 waterings');
		const plantId = JSON.parse(readFileSync(companionPath, 'utf8')).garden.plant.id;
		await frame.getByRole('tab', { name: 'Garden', exact: true }).press('Escape');
		await expect(entry).toBeFocused();
		await command(window, 'Charmlet: Open Garden');
		await expect(frame.locator('#garden-panel')).toBeVisible();
		await expect(frame.getByRole('button', { name: 'Water plant', exact: true })).toBeDisabled();
		frame = await reloadCharm(window);
		await frame.getByRole('button', { name: 'Open garden', exact: true }).click();
		await expect(frame.locator('#garden-count')).toHaveText('1 / 11 waterings');
		expect(JSON.parse(readFileSync(companionPath, 'utf8')).garden.plant.id).toBe(plantId);
		await window.screenshot({ path: testInfo.outputPath('garden-entry.png') });
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

test('motivation has no category heading and reminder checkboxes remain compact', async ({}, testInfo) => {
	const editor = await launchOwnedEditor('charmlet-controls-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, reducedMotion: true })}\n`);
		const state = applyCompanionAction(defaultCompanionState(), { type: 'feed-mode', mode: 'encouragement' }, Date.now()).state;
		writeFileSync(companionPath, `${JSON.stringify(state)}\n`);
	});
	try {
		await command(editor.window, 'Charmlet: Show Charm');
		const frame = await readyFrame(editor.window);
		await expect.soft(frame.locator('.message-meta')).toBeHidden();
		await expect(frame.locator('#message-text')).not.toBeEmpty();
		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-reminders').click();
		for (const id of ['water-reminder-enabled', 'move-reminder-enabled', 'care-defer']) {
			const bounds = await frame.locator(`#${id}`).boundingBox();
			expect.soft(bounds?.width).toBeLessThanOrEqual(20);
			expect.soft(bounds?.height).toBeLessThanOrEqual(20);
		}
		await editor.window.screenshot({ path: testInfo.outputPath('reminder-controls.png') });
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

test('navigation A searches installed charms and exposes quiet reminders and build identity', async ({}, testInfo) => {
	const editor = await launchOwnedEditor('charmlet-navigation-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, reducedMotion: true })}\n`);
		const state = applyCompanionAction(defaultCompanionState(), { type: 'care-configure', kind: 'water', enabled: true, intervalMinutes: 15 }, Date.now() - 16 * 60000).state;
		writeFileSync(companionPath, `${JSON.stringify(state)}\n`);
	});
	try {
		await command(editor.window, 'Charmlet: Show Charm');
		let frame = await readyFrame(editor.window);
		await expect(frame.locator('#companion-tools')).toBeHidden();
		await expect(frame.locator('#care-cue')).toBeVisible();
		await expect(frame.locator('#message-meta')).toBeHidden();
		await expect(frame.locator('#primary-nav > button')).toHaveCount(4);
		await expect(frame.locator('#primary-nav .nav-chevron')).toHaveCount(2);
		const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
		await expect(frame.locator('#app-version')).toHaveText(`v${version}`);
		await expect(frame.locator('.app-footer')).toContainText('Made in Silicon Valley');
		await expect(frame.locator('#website-placeholder')).toHaveText('Website — coming soon');
		await frame.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(frame.locator('#care-cue')).toBeHidden();
		await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
		await expect(frame.locator('#charm-search')).toBeFocused();
		await expect(frame.locator('#charm-grid .charm-tile')).toHaveCount(CHARMS.length);
		await frame.locator('#app').screenshot({ path: testInfo.outputPath('navigation-picker.png') });
		await frame.locator('#charm-groups').getByRole('button', { name: 'Gemstones', exact: true }).click();
		await expect(frame.locator('#charm-grid .charm-tile')).toHaveCount(8);
		await frame.locator('#charm-search').fill('ruby');
		await expect(frame.locator('#charm-grid .charm-tile')).toHaveCount(1);
		await frame.getByRole('button', { name: 'Select Ruby', exact: true }).click();
		await expect(frame.locator('#charm-picker')).toBeHidden();
		await expect(frame.locator('#charms-toggle')).toBeFocused();
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'trial:new-ruby');
		frame = await reloadCharm(editor.window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'trial:new-ruby');
		await frame.locator('#settings-toggle').click();
		await expect(frame.locator('#menu-appearance')).toBeFocused();
		await frame.locator('#menu-appearance').press('ArrowDown');
		await expect(frame.locator('#menu-messages')).toBeFocused();
		await frame.locator('#menu-messages').press('Enter');
		await expect(frame.locator('#feed-mode')).toHaveValue('encouragement');
		await frame.locator('#feed-mode').selectOption('facts');
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
		await frame.locator('#companion-close').click();
		await expect(frame.locator('#settings-toggle')).toBeFocused();
		await expect(frame.locator('#message-meta')).toBeVisible();
		await editor.window.screenshot({ path: testInfo.outputPath('navigation-a.png') });
		await frame.locator('#app').screenshot({ path: testInfo.outputPath('navigation-app.png') });
		const reviewPack = resolve('..', 'website', 'packs', 'review', 'review-starter-redraws-1.charmlet.json');
		await editor.app.evaluate(({ dialog }, path) => {
			dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
		}, reviewPack);
		await command(editor.window, 'Charmlet: Import Charm Pack');
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'pack:review-starter-redraws-1:starter-terminal');
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		await expect.poll(() => frame.locator('#charm-image').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(216);
		await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
		await expect(frame.locator('#charm-select option[value^="pack:review-starter-redraws-1:"]')).toHaveCount(10);
		await editor.window.screenshot({ path: testInfo.outputPath('navigation-redraw-review.png') });
		await frame.locator('#picker-close').click();
		frame = await reloadCharm(editor.window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'pack:review-starter-redraws-1:starter-terminal');
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

test('imported artwork attaches to its silhouette and rebounds while focus ticks', async ({}, testInfo) => {
	const editor = await launchOwnedEditor('charmlet-bounce-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, reducedMotion: false, rotateMessages: false })}\n`);
		const state = applyCompanionAction(defaultCompanionState(), {
			type: 'focus-start', phase: 'focus', focusMinutes: 25, breakMinutes: 5, intent: 'Review charm motion',
		}, Date.now()).state;
		writeFileSync(companionPath, `${JSON.stringify(state)}\n`);
	});
	const { window } = editor;
	try {
		await window.emulateMedia({ reducedMotion: 'no-preference' });
		await command(window, 'Charmlet: Show Charm');
		const frame = await readyFrame(window);
		const reviewPack = resolve('..', 'website', 'packs', 'review', 'art-new-red-panda-r1-p2.charmlet.json');
		const pack = JSON.parse(readFileSync(reviewPack, 'utf8'));
		await editor.app.evaluate(({ dialog }, path) => {
			dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
		}, reviewPack);
		await command(window, 'Charmlet: Import Charm Pack');
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', `pack:${pack.id}:${pack.charms[0].id}`);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await expect.poll(() => frame.locator('#charm-image').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
		const alphaAtConnection = await alphaAtCordTip(frame);
		expect(alphaAtConnection, 'The cord tip must touch the visible panda, not transparent padding').toBeGreaterThanOrEqual(128);
		const restingY = Number(await frame.locator('#charm').getAttribute('data-position-y'));
		const focusBefore = await frame.locator('#focus-readout').innerText();
		const bounds = await frame.locator('#charm').boundingBox();
		if (!bounds) { throw new Error('The imported charm must be visible before dragging.'); }
		const x = bounds.x + bounds.width / 2;
		const y = bounds.y + bounds.height / 2;
		await window.mouse.move(x, y);
		await window.mouse.down();
		await window.mouse.move(x, y + 90, { steps: 12 });
		await expect.poll(async () => Number(await frame.locator('#charm').getAttribute('data-position-y'))).toBeGreaterThan(restingY + 70);
		type Recording = { values: number[]; elapsed: number; done: boolean; timedOut: boolean };
		await frame.evaluate(() => {
			const recording: Recording = { values: [], elapsed: 0, done: false, timedOut: false };
			(window as unknown as { __charmletBounce: Recording }).__charmletBounce = recording;
			const charm = document.getElementById('charm')!;
			const stage = document.getElementById('stage')!;
			charm.addEventListener('pointerup', () => {
				const start = performance.now();
				const sample = () => {
					recording.values.push(Number(charm.dataset.positionY));
					recording.elapsed = performance.now() - start;
					recording.timedOut = recording.elapsed > 7000;
					recording.done = stage.dataset.running === 'false' || recording.timedOut;
					if (!recording.done) { requestAnimationFrame(sample); }
				};
				requestAnimationFrame(sample);
			}, { once: true });
		});
		await window.mouse.up();
		await expect.poll(() => frame.evaluate(() => (window as unknown as { __charmletBounce: Recording }).__charmletBounce.done),
			{ timeout: 10000 }).toBe(true);
		const recording = await frame.evaluate(() => (window as unknown as { __charmletBounce: Recording }).__charmletBounce);
		writeFileSync(testInfo.outputPath('bounce-samples.json'), `${JSON.stringify({ restingY, ...recording }, null, 2)}\n`);
		expect(recording.timedOut).toBe(false);
		expect(recording.elapsed, 'A timer tick must not cut the return animation short').toBeGreaterThan(1500);
		expect(Math.min(...recording.values)).toBeLessThan(restingY - 8);
		let previousSign = 1;
		let crossings = 0;
		for (const value of recording.values) {
			const displacement = value - restingY;
			if (Math.abs(displacement) <= 0.75) { continue; }
			if (Math.sign(displacement) !== previousSign) { crossings++; previousSign = Math.sign(displacement); }
		}
		expect(crossings).toBeGreaterThanOrEqual(3);
		expect(Math.abs(recording.values.at(-1)! - restingY)).toBeLessThan(1);
		expect(await frame.locator('#focus-readout').innerText()).not.toBe(focusBefore);
		await frame.locator('#app').screenshot({ path: testInfo.outputPath('attached-panda.png') });

		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-appearance').click();
		await frame.locator('#motion').click();
		await frame.locator('#settings-close').click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		const framesBefore = await frame.locator('#stage').getAttribute('data-frames');
		const reducedBounds = await frame.locator('#charm').boundingBox();
		if (!reducedBounds) { throw new Error('Reduced-motion charm must remain visible.'); }
		const reducedX = reducedBounds.x + reducedBounds.width / 2;
		const reducedY = reducedBounds.y + reducedBounds.height / 2;
		await window.mouse.move(reducedX, reducedY);
		await window.mouse.down();
		await window.mouse.move(reducedX, reducedY + 55, { steps: 6 });
		await expect(frame.locator('#phase')).toHaveText('Held');
		await window.mouse.up();
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		await expect(frame.locator('#stage')).toHaveAttribute('data-frames', framesBefore!);
		expect(Number(await frame.locator('#charm').getAttribute('data-position-y'))).toBeCloseTo(restingY, 1);
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

test('soft charms squeeze at their attachment and festive defaults protect manual choices', async ({}, testInfo) => {
	const editor = await launchOwnedEditor('charmlet-festive-soft-', ({ preferencesPath, companionPath }) => {
		writeFileSync(preferencesPath, `${JSON.stringify({ ...DEFAULT_STATE, rotateMessages: false })}\n`);
		writeFileSync(companionPath, `${JSON.stringify(defaultCompanionState())}\n`);
	});
	const { window, preferencesPath } = editor;
	try {
		await window.emulateMedia({ reducedMotion: 'no-preference' });
		await command(window, 'Charmlet: Show Charm');
		let frame = await readyFrame(window);
		await expect(frame.locator('#message-text')).toHaveText(MESSAGES[0]);
		const review = JSON.parse(readFileSync(resolve('..', 'website', 'art-review.json'), 'utf8'));
		const imported: string[] = [];
		for (const key of ['new-pumpkin-patch', 'new-stress-ball']) {
			const item = review.items.find((item: { key: string }) => item.key === key);
			const path = resolve('..', 'website', item.download);
			const pack = JSON.parse(readFileSync(path, 'utf8'));
			await editor.app.evaluate(({ dialog }, path) => {
				dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
			}, path);
			await command(window, 'Charmlet: Import Charm Pack');
			const id = `pack:${pack.id}:${pack.charms[0].id}`;
			imported.push(id);
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', id);
		}
		const [pumpkin, ball] = imported;
		// Only Charmlet reads the simulated date. Keep the IDE's clock, native
		// event timestamps, animation frames and real timers intact.
		const setReviewDate = (date: Date) => frame.evaluate(now => {
			Date.now = () => now;
			globalThis.window.dispatchEvent(new Event('focus'));
		}, date.getTime());
		await setReviewDate(new Date(2026, 9, 31, 12));
		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-appearance').click();
		await expect(frame.locator('#charm-pinned')).toBeChecked();
		await frame.locator('#festive-enabled').check();
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', ball);
		await frame.locator('#festive-enabled').uncheck();
		await frame.getByRole('button', { name: 'Follow holiday defaults', exact: true }).click();
		await expect(frame.locator('#festive-enabled')).toBeChecked();
		await expect(frame.locator('#charm-pinned')).not.toBeChecked();
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', pumpkin);
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		expect(JSON.parse(readFileSync(preferencesPath, 'utf8'))).toMatchObject({
			charmId: ball, charmPinned: false, festiveEnabled: true,
		});
		await frame.locator('#settings-close').click();
		await setReviewDate(new Date(2026, 10, 1, 0));
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', ball);
		await setReviewDate(new Date(2026, 9, 31, 12));
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', pumpkin);
		await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
		await frame.getByRole('button', { name: 'Select Stress Ball', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', ball);
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		await setReviewDate(new Date(2027, 9, 31, 12));
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', ball);
		expect(JSON.parse(readFileSync(preferencesPath, 'utf8')).charmPinned).toBe(true);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		const pointerFrames = window.frames();
		for (const target of pointerFrames) {
			await target.evaluate(() => {
				const events: Record<string, unknown>[] = [];
				for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel',
					'gotpointercapture', 'lostpointercapture', 'mousedown', 'mouseup']) {
					globalThis.window.addEventListener(type, event => {
						const pointer = event as PointerEvent;
						const target = event.target instanceof Element ? event.target : undefined;
						events.push({ type, id: pointer.pointerId, buttons: pointer.buttons, trusted: event.isTrusted,
							x: pointer.clientX, y: pointer.clientY, target: target?.id || target?.tagName,
							classes: target?.getAttribute('class'),
							captured: document.getElementById('charm')?.hasPointerCapture(pointer.pointerId),
							time: performance.now() });
						document.documentElement.dataset.pointerTrace = JSON.stringify(events.slice(-40));
					}, true);
				}
			});
		}
		const squeezed = () => frame.locator('#charm-image').evaluate(image => {
			const matrix = new DOMMatrix(getComputedStyle(image).transform);
			return matrix.a > 1.05 && matrix.d < .9;
		});
		try {
			await frame.locator('#app').screenshot({ path: testInfo.outputPath('stress-ball-rest.png') });
			// Hover waits for the current iframe target to be stable and receive
			// input; coordinates cached before a screenshot cannot establish that.
			await frame.locator('#charm').hover();
			await window.mouse.down();
			await expect(frame.locator('#charm')).toHaveClass(/\bdragging\b/);
			await expect.poll(squeezed).toBe(true);
			// Exercise a sustained hold, without interrupting pointer capture with
			// a screenshot. Capture evidence once the native release has completed.
			await window.waitForTimeout(500);
			await expect.poll(() => frame.locator('#charm-image').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).d)).toBe(.86);
			expect(await alphaAtCordTip(frame), 'Squeezing must leave the cord touching the visible ball').toBeGreaterThanOrEqual(128);
			await window.mouse.up();
			writeFileSync(testInfo.outputPath('squeeze-release.json'), JSON.stringify(await frame.evaluate(() => ({
				active: document.getElementById('charm')!.matches(':active'),
				classes: document.getElementById('charm')!.className,
				phase: document.getElementById('phase')!.textContent,
				running: document.getElementById('stage')!.dataset.running,
				transform: getComputedStyle(document.getElementById('charm-image')!).transform,
			})), null, 2));
			await expect.poll(() => frame.locator('#charm-image').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).d)).toBe(1);
		} finally {
			writeFileSync(testInfo.outputPath('squeeze-pointer-events.json'), JSON.stringify({
				host: await editor.app.evaluate(({ app }) => ({ version: app.getVersion(), engines: process.versions })),
				frames: await Promise.all(pointerFrames.map(target => target.evaluate(() => ({
					name: globalThis.window.name, agent: navigator.userAgent,
					visible: document.visibilityState, focused: document.hasFocus(),
					viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
					captured: document.getElementById('charm')?.hasPointerCapture(1),
					classes: document.getElementById('charm')?.className,
					soft: document.getElementById('charm')?.dataset.soft,
					phase: document.getElementById('phase')?.textContent,
					events: JSON.parse(document.documentElement.dataset.pointerTrace ?? '[]'),
				})).catch(error => ({ error: String(error) })))),
			}, null, 2));
		}
		await frame.locator('#app').screenshot({ path: testInfo.outputPath('stress-ball-released.png') });
		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-appearance').click();
		await frame.locator('#motion').click();
		await frame.locator('#settings-close').click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
		const framesBefore = await frame.locator('#stage').getAttribute('data-frames');
		await frame.locator('#charm').focus();
		await window.keyboard.down('Space');
		await expect.poll(squeezed).toBe(true);
		await expect(frame.locator('#charm-image')).toHaveCSS('transition-duration', '0s');
		await window.keyboard.up('Space');
		await expect(frame.locator('#charm-image')).toHaveCSS('transform', 'none');
		await expect(frame.locator('#stage')).toHaveAttribute('data-frames', framesBefore!);
		await window.keyboard.down('Space');
		await expect.poll(squeezed).toBe(true);
		await frame.evaluate(() => globalThis.window.dispatchEvent(new Event('blur')));
		await expect(frame.locator('#charm-image')).toHaveCSS('transform', 'none');
		await window.keyboard.up('Space');
		await expect(frame.locator('#stage')).toHaveAttribute('data-frames', framesBefore!);
		frame = await reloadCharm(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-charm', ball);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		expect(JSON.parse(readFileSync(preferencesPath, 'utf8'))).toMatchObject({
			charmId: ball, charmPinned: true, festiveEnabled: true, reducedMotion: true,
		});
		await frame.locator('#settings-toggle').click();
		await frame.locator('#menu-appearance').click();
		await frame.locator('#motion').click();
		await frame.locator('#settings-close').click();
		for (const key of ['new-smiley-happy', 'new-emoji-heart']) {
			const entry = TRIAL_CHARMS.find(charm => charm.artworkKey === key)!;
			await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
			await frame.locator('#charm-search').fill(entry.name);
			await frame.locator(`.charm-tile[data-charm-id="${entry.id}"]`).click();
			await expect(frame.locator('#charm')).toHaveAttribute('data-soft', 'true');
			await frame.locator('#charm-image').evaluate(image => (image as HTMLImageElement).decode());
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await frame.locator('#charm').focus();
			try {
				await window.keyboard.down('Space');
				await expect.poll(squeezed).toBe(true);
				expect(await frame.locator('#charm-image').evaluate(image => parseFloat(getComputedStyle(image).transitionDuration))).toBeGreaterThan(0);
				expect(await alphaAtCordTip(frame), `${entry.name} must stay attached while squeezed`).toBeGreaterThanOrEqual(128);
			} finally {
				await window.keyboard.up('Space');
			}
			await expect.poll(() => frame.locator('#charm-image').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).d)).toBe(1);
		}
	} finally {
		await closeOwnedEditor(editor, testInfo);
	}
});

if (process.env.CHARMLET_TEST_PACKAGED === '1') {
	test('installed VSIX runs in Restricted Mode and keeps garden progress', async ({}, testInfo) => {
		const editor = await launchOwnedEditor('charmlet-installed-', () => {}, true);
		try {
			const restricted = editor.window.getByRole('button', { name: /^Restricted Mode/ });
			await expect(restricted).toBeVisible();
			await command(editor.window, 'Charmlet: Show Charm');
			let frame = await readyFrame(editor.window);
			const expectDailyWatering = async (lastWateredDay: string | null) => {
				expect(lastWateredDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				await expect.poll(async () => {
					const enabled = await frame.getByRole('button', { name: 'Water plant', exact: true }).isEnabled();
					return enabled === (localDayKey(Date.now()) > lastWateredDay!);
				}, { message: 'Watering eligibility must follow the current local day.' }).toBe(true);
			};
			const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
			await expect(frame.locator('#app-version')).toHaveText(`v${version}`);
			await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
			await expect(frame.locator('#charm-grid .charm-tile')).toHaveCount(CHARMS.length);
			await frame.locator('#picker-close').click();
			await expect(frame.locator('#festive-enabled')).toBeChecked();
			await expect(frame.locator('#charm-pinned')).not.toBeChecked();
			const readGarden = () => existsSync(editor.companionPath)
				? JSON.parse(readFileSync(editor.companionPath, 'utf8')).garden : defaultCompanionState().garden;
			const gardenBeforeTrial = readGarden();
			for (const key of [
				'starter-drishti', 'new-ate-tester', 'new-earth', 'new-milky-way',
				'new-emerald', 'new-zodiac-libra', 'new-santa-claus', 'new-murugan', 'flower-sunflower',
				'new-smiley-happy', 'new-emoji-heart', 'new-drishti-guardian',
			]) {
				const entry = TRIAL_CHARMS.find(charm => charm.artworkKey === key)!;
				expect(entry, `${key} must be present without importing a pack`).toBeTruthy();
				await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
				await frame.locator('#charm-search').fill(entry.name);
				await frame.getByRole('button', { name: `Select ${entry.name}`, exact: true }).click();
				await expect(frame.locator('#stage')).toHaveAttribute('data-charm', entry.id);
				await expect.poll(() => frame.locator('#charm-image').evaluate(image => {
					const png = image as HTMLImageElement;
					return png.complete && png.naturalWidth === 216 && png.naturalHeight === 252;
				})).toBe(true);
				await expect(frame.locator('#charm-image')).toHaveAttribute('src', new RegExp(`${entry.file.replace('.', '\\.')}$`));
				await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
			}
			expect(readGarden()).toEqual(gardenBeforeTrial);
			await frame.locator('#app').screenshot({ path: testInfo.outputPath('installed-trial-flower.png') });
			await command(editor.window, 'Charmlet: Open Garden');
			await frame.getByRole('button', { name: 'Plant a seed', exact: true }).click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
			await frame.getByRole('button', { name: 'Water plant', exact: true }).click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
			await expect(frame.locator('#garden-count')).toHaveText('1 / 11 waterings');
			const watered = JSON.parse(readFileSync(editor.companionPath, 'utf8')).garden as GardenState;
			await expectDailyWatering(watered.lastWateredDay);
			frame = await reloadCharm(editor.window);
			await expect(restricted).toBeVisible();
			await command(editor.window, 'Charmlet: Open Garden');
			await expect(frame.locator('#garden-count')).toHaveText('1 / 11 waterings');
			expect(JSON.parse(readFileSync(editor.companionPath, 'utf8')).garden).toEqual(watered);
			// A real reload can cross midnight. The saved watering stays unchanged,
			// but the next local calendar day correctly permits another watering.
			await expectDailyWatering(watered.lastWateredDay);
			writeFileSync(testInfo.outputPath('garden-calendar.json'), JSON.stringify({
				watered, observedDayAfterReload: localDayKey(Date.now()),
			}, null, 2));
			await frame.locator('#app').screenshot({ path: testInfo.outputPath('installed-garden.png') });

			// Exercise a previous-day restoration on every run, without
			// changing the machine clock or touching a normal editor profile.
			const priorDay = new Date();
			priorDay.setDate(priorDay.getDate() - 1);
			const overnight = JSON.parse(readFileSync(editor.companionPath, 'utf8'));
			overnight.garden.lastWateredDay = localDayKey(priorDay.getTime());
			overnight.garden.lastWateredAt = priorDay.getTime();
			overnight.garden.plant.plantedAt = priorDay.getTime() - 1000;
			writeFileSync(editor.companionPath, `${JSON.stringify(overnight)}\n`);
			frame = await reloadCharm(editor.window);
			await expect(restricted).toBeVisible();
			await command(editor.window, 'Charmlet: Open Garden');
			await expect(frame.locator('#garden-count')).toHaveText('1 / 11 waterings');
			expect(JSON.parse(readFileSync(editor.companionPath, 'utf8')).garden.plant.id).toBe(watered.plant?.id);
			await expect(frame.getByRole('button', { name: 'Water plant', exact: true })).toBeEnabled();
			await frame.getByRole('button', { name: 'Water plant', exact: true }).click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
			await expect(frame.locator('#garden-count')).toHaveText('2 / 11 waterings');
			await expectDailyWatering(JSON.parse(readFileSync(editor.companionPath, 'utf8')).garden.lastWateredDay);
		} finally {
			await closeOwnedEditor(editor, testInfo);
		}
	});
}
