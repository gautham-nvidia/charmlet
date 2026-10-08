import { test, expect, _electron as electron } from '@playwright/test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyCompanionAction, defaultCompanionState } from '../companion-core';
import { DEFAULT_STATE } from '../charm-state';
import { learningCard } from '../learning-cards';
import { MESSAGES } from '../messages';
import { command, readyFrame, reloadCharm } from './editor-helpers';

test('companion focus and learning persist across a real editor reload', async ({}, testInfo) => {
	test.setTimeout(180000);
	const profile = mkdtempSync(join(tmpdir(), 'charmlet-companion-ui-'));
	const scratchFile = join(profile, 'companion-trial.ts');
	const storage = join(profile, 'user', 'User', 'globalStorage', 'gautham-nvidia.charmlet');
	const preferencesPath = join(storage, 'preferences.json');
	const companionPath = join(storage, 'companion.json');
	mkdirSync(storage, { recursive: true });
	writeFileSync(scratchFile, "export const companion = 'Focus and learn';\n");
	writeFileSync(preferencesPath, `${JSON.stringify({
		...DEFAULT_STATE, messageIndex: 17, rotateMessages: false, reducedMotion: true,
	})}\n`);
	const expired = applyCompanionAction(
		defaultCompanionState(17),
		{ type: 'focus-start', phase: 'focus', focusMinutes: 1, breakMinutes: 1, intent: 'Old session' },
		Date.now() - 2 * 60000,
	).state;
	writeFileSync(companionPath, `${JSON.stringify(expired)}\n`);

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
	const window = await app.firstWindow();
	try {
		expect(realpathSync(await app.evaluate(({ app: host }) => host.getPath('userData')))).toBe(realpathSync(join(profile, 'user')));
		await app.evaluate(({ BrowserWindow }) => {
			const testWindow = BrowserWindow.getAllWindows()[0];
			testWindow.setIgnoreMouseEvents(true);
			testWindow.setSize(1400, 900);
		});
		await expect(window.locator('.part.activitybar a.action-label[aria-label="Charmlet"]')).toBeVisible({ timeout: 30000 });
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
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-size', '100');

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
		await expect(focusTab).toHaveAttribute('aria-selected', 'true');
		await expect(focusTab).toBeFocused();
		await focusTab.press('ArrowLeft');
		await expect(learnTab).toBeFocused();
		await expect(learnTab).toHaveAttribute('aria-selected', 'true');
		await learnTab.press('ArrowRight');
		await expect(focusTab).toBeFocused();
		await expect(focusTab).toHaveAttribute('aria-selected', 'true');
	} finally {
		try {
			await app.close();
		} finally {
			const editorLogs = join(profile, 'user', 'logs');
			if (existsSync(editorLogs)) {
				try { cpSync(editorLogs, testInfo.outputPath('editor-logs'), { recursive: true }); } catch { /* Keep test result. */ }
			}
		}
	}
});
