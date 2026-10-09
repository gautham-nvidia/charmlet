import { test, expect, _electron as electron, type Frame, type Page } from '@playwright/test';
import { copyFileSync, cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { CHARMS } from '../charm-catalog';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { command, commandInput, endOfDocument, primaryModifier, readyFrame, reloadCharm } from './editor-helpers';

async function expectBalancedSwingRoom(frame: Frame) {
	await expect.poll(() => frame.locator('#charm').evaluate(charm => {
		const bounds = charm.getBoundingClientRect();
		const stage = document.getElementById('stage')!.getBoundingClientRect();
		const leftGap = bounds.left - stage.left;
		const rightGap = stage.right - bounds.right;
		return Math.abs(leftGap - rightGap);
	})).toBeLessThanOrEqual(2);
}

async function browserFrames(window: Page, count = 12) {
	await window.evaluate(total => new Promise<void>(resolveFrames => {
		let remaining = total;
		function next() {
			if (--remaining <= 0) {
				resolveFrames();
			} else {
				requestAnimationFrame(next);
			}
		}
		requestAnimationFrame(next);
	}), count);
}

async function beginDrag(window: Page, frame: Frame, deltaX: number, deltaY: number, grabFraction = 0.5, expectedPhase: 'Held' | 'Retracted' = 'Held') {
	await expect(frame.locator('#charm')).toBeVisible();
	await frame.locator('#charm').evaluate(charm => {
		charm.addEventListener('pointerdown', event => {
			(charm as HTMLElement).dataset.testPointer = String((event as PointerEvent).pointerId);
		}, { once: true });
	});
	const bounds = await frame.locator('#charm').boundingBox();
	if (!bounds) {
		throw new Error('Cannot drag an invisible charm.');
	}
	const startX = bounds.x + bounds.width * grabFraction;
	const startY = bounds.y + bounds.height * grabFraction;
	await window.mouse.move(startX, startY);
	await window.mouse.down();
	for (let step = 1; step <= 12; step++) {
		await window.mouse.move(startX + deltaX * step / 12, startY + deltaY * step / 12);
		await browserFrames(window, 1);
	}
	await expect(frame.locator('#phase')).toHaveText(expectedPhase);
	return { x: startX, y: startY };
}

async function dragCharm(window: Page, frame: Frame, deltaX: number, deltaY: number, expectedPhase: 'Held' | 'Retracted' = 'Held') {
	await beginDrag(window, frame, deltaX, deltaY, 0.5, expectedPhase);
	await window.mouse.up();
}

test('real-editor charm supports docking, gestures, focus, persistence and reduced motion', async ({}, testInfo) => {
	// Full desktop scenario includes host startup, reloads, gestures and evidence capture.
	// Keep individual assertion and performance limits independent of this total budget.
	test.setTimeout(420000);
	const profile = mkdtempSync(join(tmpdir(), 'charmlet-ui-'));
	const scratchFile = join(profile, 'charmlet-trial.ts');
	writeFileSync(scratchFile, "export const greeting = 'Hello, Charmlet!';\n");
	const environment: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') {
			environment[key] = value;
		}
	}
	environment.CHARMLET_TRACE_SAVES = '1';
	const executablePath = process.env.VSCODE_EXECUTABLE
		?? (process.platform === 'win32' ? 'C:\\Program Files\\Microsoft VS Code\\Code.exe' : undefined);
	if (!executablePath) {
		throw new Error('Set VSCODE_TEST_VERSION or VSCODE_EXECUTABLE for this desktop editor.');
	}
	const app = await electron.launch({
		executablePath,
		args: [
			'--new-window',
			`--user-data-dir=${join(profile, 'user')}`,
			`--extensions-dir=${join(profile, 'extensions')}`,
			`--extensionDevelopmentPath=${resolve('.')}`,
			...(process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu-sandbox'] : []),
			'--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
			'--disable-telemetry', '--disable-updates',
			scratchFile,
		],
		env: environment,
		timeout: 45000,
	});
	const window = await app.firstWindow();
	const preferenceEvents: unknown[] = [];
	try {
		await window.exposeBinding('__charmletRecordPreference', (source, record: unknown) => {
			preferenceEvents.push({ frame: source.frame.url(), record });
		});
		const actualUserData = await app.evaluate(({ app: host }) => host.getPath('userData'));
		expect(realpathSync(actualUserData)).toBe(realpathSync(join(profile, 'user')));
		await app.evaluate(({ BrowserWindow }) => {
			const testWindow = BrowserWindow.getAllWindows()[0];
			testWindow.setIgnoreMouseEvents(true);
			testWindow.setSize(1400, 900);
		});
		const windowGeometry = await app.evaluate(({ app: host, BrowserWindow, screen }) => {
			const hostWindow = BrowserWindow.getAllWindows()[0];
			const bounds = hostWindow.getBounds();
			return { hostVersion: host.getVersion(), platform: process.platform, requested: { width: 1400, height: 900 }, bounds, contentBounds: hostWindow.getContentBounds(), workArea: screen.getDisplayMatching(bounds).workArea, zoomFactor: hostWindow.webContents.getZoomFactor() };
		});
		writeFileSync(testInfo.outputPath('editor-window.json'), `${JSON.stringify(windowGeometry, null, 2)}\n`);
		await window.waitForLoadState('domcontentloaded');
		await expect(window.locator('.monaco-workbench')).toBeVisible({ timeout: 30000 });
		await expect(window.locator('.part.editor .view-lines').first()).toContainText('Hello, Charmlet!', { timeout: 30000 });
		await expect(window.locator('.part.activitybar a.action-label[aria-label="Charmlet"]')).toBeVisible({ timeout: 30000 });
		await window.keyboard.press(`${primaryModifier}+Shift+P`);
		const input = commandInput(window);
		await expect(input).toBeVisible();
		await input.fill('>');
		await input.pressSequentially('Charmlet: Show Charm', { delay: 30 });
		await expect(window.locator('.quick-input-list')).toContainText('Charmlet: Show Charm', { timeout: 15000 });
		await window.keyboard.press('Enter');
		await expect.poll(() => window.frames().map(frame => frame.url()).join('\n'), { timeout: 30000 })
			.toContain('vscode-webview');
		const charmFrame = await readyFrame(window);
		const charmImage = charmFrame.locator('#charm img');
		await expect(charmImage).toBeVisible();
		await expect.poll(() => charmImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(72);
		await window.keyboard.press(`${primaryModifier}+Shift+P`);
		await input.fill('>');
		await input.pressSequentially('View: Move View', { delay: 30 });
		await expect(window.locator('.quick-input-list')).toContainText('View: Move View');
		await window.locator('.quick-input-list').getByText('View: Move View', { exact: true }).click();
		await input.fill('Charmlet');
		await expect(window.locator('.quick-input-list')).toContainText('Charmlet');
		await window.locator('.quick-input-list .monaco-list-row').filter({ has: window.getByText('Charmlet', { exact: true }) }).click();
		await input.fill('New Secondary Side Bar');
		await expect(window.locator('.quick-input-list')).toContainText('New Secondary Side Bar');
		await window.keyboard.press('Enter');
		await expect(window.locator('.quick-input-widget')).toBeHidden();
		let frame = await readyFrame(window);
		await expect(window.locator('.part.auxiliarybar a.action-label[aria-label="Charmlet"]')).toBeVisible();
		await expect.poll(() => frame.locator('#stage').evaluate(stage => stage.clientHeight)).toBeGreaterThan(350);
		await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await expect.poll(() => frame.locator('#hanging').evaluate(node => node.getAnimations().every(animation => animation.playState === 'finished'))).toBe(true);
		await expectBalancedSwingRoom(frame);
		const startX = Number(await frame.locator('#charm').getAttribute('data-position-x'));
		await frame.locator('#charm').click();
		await expect.poll(async () => Math.abs(Number(await frame.locator('#charm').getAttribute('data-position-x')) - startX)).toBeGreaterThan(3);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await frame.locator('#charm').focus();
		await frame.locator('#charm').press('ArrowRight');
		await expect.poll(async () => Number(await frame.locator('#charm').getAttribute('data-position-x')) - startX).toBeGreaterThan(3);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await dragCharm(window, frame, 0, 90);
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await window.screenshot({ path: testInfo.outputPath('right-dock.png') });
		await dragCharm(window, frame, -55, 0);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'true');
		await frame.getByRole('button', { name: 'Hide charm', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		const hiddenFrames = await frame.locator('#stage').getAttribute('data-frames');
		await browserFrames(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-frames', hiddenFrames!);
		await frame.locator('#restore').click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await dragCharm(window, frame, 0, -80, 'Retracted');
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
		await expect(frame.locator('#restore')).toBeVisible();
		await frame.locator('#restore').click();
		await frame.getByRole('switch', { name: 'Motion', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		await frame.locator('#charm').focus();
		await frame.locator('#charm').press('ArrowDown');
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
		await frame.locator('#charm').press('Escape');
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
		frame = await reloadCharm(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
		await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
		await frame.locator('#restore').click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
		await frame.locator('#charm').click();
		await browserFrames(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		await command(window, 'Charmlet: Show Charm');
		await expect(window.locator('.part.editor .monaco-editor.focused')).toBeVisible();
		await window.keyboard.press(endOfDocument);
		await window.keyboard.press('Enter');
		await window.keyboard.type('const charmletTrial = true;');
		await expect(window.locator('.part.editor .monaco-editor.focused .view-lines')).toContainText('const charmletTrial = true;');
		await window.keyboard.press(`${primaryModifier}+S`);
		await expect.poll(() => readFileSync(scratchFile, 'utf8')).toContain('const charmletTrial = true;');
		await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 650));
		frame = await readyFrame(window);
		const fits = await frame.locator('#charm').evaluate(charm => {
			const bounds = charm.getBoundingClientRect();
			const stage = document.getElementById('stage')!.getBoundingClientRect();
			return bounds.left >= stage.left && bounds.right <= stage.right && bounds.top >= stage.top && bounds.bottom <= stage.bottom;
		});
		expect(fits).toBe(true);
		await window.screenshot({ path: testInfo.outputPath('compact-window.png') });

		await test.step('the free collection loads, keeps preferences and remembers its selection', async () => {
			const lastCharm = CHARMS[CHARMS.length - 1];
			expect(lastCharm.name).toBe('Lemon & Chilies');
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			frame = await readyFrame(window);
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			let picker = frame.getByRole('combobox', { name: 'Charm', exact: true });
			await expect(picker.locator('option')).toHaveCount(10);
			await expect(picker.locator('optgroup')).toHaveCount(2);
			await expect(picker.locator('optgroup').nth(0)).toHaveAttribute('label', 'Silicon & Code');
			await expect(picker.locator('optgroup').nth(1)).toHaveAttribute('label', 'Good Luck');
			await frame.evaluate(() => {
				const view = globalThis as unknown as Window & { __charmletRecordPreference: (value: unknown) => Promise<void> };
				const capture = view.__charmletRecordPreference;
				const picker = document.getElementById('charm-select') as HTMLSelectElement;
				const stage = document.getElementById('stage')!;
				const record = (label: string, details: Record<string, unknown> = {}) => {
					void capture({
						time: Date.now(), label, picker: picker.value, charm: stage.dataset.charm,
						persisted: stage.dataset.persisted, focus: (document.activeElement as HTMLElement | null)?.id,
						...details,
					}).catch(() => {});
				};
				for (const type of ['input', 'change', 'blur', 'focus']) {
					picker.addEventListener(type, () => record(type));
				}
				document.addEventListener('keydown', event => {
					if (event.key === 'Escape' || event.target === picker) {
						record('keydown', { key: event.key });
					}
				}, true);
				view.addEventListener('message', event => {
					const message = event.data;
					if (message && ['state', 'saved', 'save-error', 'catalogue'].includes(message.type)) {
						record('host-message', { type: message.type, revision: message.revision, stateCharm: message.state?.charmId });
					}
				});
				record('trace-start');
			});
			for (const entry of CHARMS) {
				await picker.selectOption(entry.id);
				await expect(frame.locator('#stage')).toHaveAttribute('data-charm', entry.id);
				await expect(frame.locator('#charm-name')).toHaveText(entry.name);
				await expect(frame.locator('#charm')).toHaveAttribute('aria-label', `Nudge ${entry.name.toLowerCase()} charm`);
				await expect.poll(() => frame.locator('#charm-image').evaluate(image => {
					const img = image as HTMLImageElement;
					return img.complete && img.naturalWidth === 72;
				})).toBe(true);
				await expect.poll(() => frame.locator('#charm-image').getAttribute('src')).toMatch(new RegExp(`${entry.file.replace('.', '\\.')}$`));
				await expect(frame.locator('#cord-length')).toHaveValue('146');
				const visibleCord = Number(await frame.locator('#stage').getAttribute('data-cord'));
				expect(visibleCord).toBeGreaterThanOrEqual(48);
				expect(visibleCord).toBeLessThanOrEqual(146);
				await expect.poll(() => frame.locator('#charm').evaluate(charm => {
					const bounds = charm.getBoundingClientRect();
					const stage = document.getElementById('stage')!.getBoundingClientRect();
					return bounds.left >= stage.left - 1 && bounds.right <= stage.right + 1
						&& bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1;
				})).toBe(true);
				await expect(frame.locator('#stage')).toHaveAttribute('data-size', '100');
				await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
				await frame.locator('#charm').screenshot({ path: testInfo.outputPath(`phase-2-${entry.id}.png`) });
			}
			await picker.focus();
			if (process.platform === 'darwin') {
				await picker.pressSequentially('Terminal', { delay: 20 });
			} else {
				await picker.press('Home');
			}
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'terminal');
			if (process.platform === 'darwin') {
				await picker.press('Tab');
				await picker.focus();
				await picker.pressSequentially('Lemon', { delay: 20 });
			} else {
				await picker.press('End');
			}
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', lastCharm.id);
			await window.screenshot({ path: testInfo.outputPath('phase-2-collection.png') });
			await picker.press('Escape');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', lastCharm.id);
			await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true', { timeout: 10000 });
			const preferencesPath = join(profile, 'user', 'User', 'globalStorage', 'gautham-nvidia.charmlet', 'preferences.json');
			const storedPreferences = JSON.parse(readFileSync(preferencesPath, 'utf8'));
			expect(storedPreferences.charmId).toBe(lastCharm.id);
			expect(storedPreferences.cordLength).toBe(146);
			expect(storedPreferences.reducedMotion).toBe(true);
			preferenceEvents.push({ time: Date.now(), label: 'after-escape-assertion' });
			frame = await reloadCharm(window);
			preferenceEvents.push({
				time: Date.now(), label: 'after-reload-ready',
				restoredCharm: await frame.locator('#stage').getAttribute('data-charm'),
				selectedOption: await frame.locator('#charm-select').inputValue(),
			});
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', lastCharm.id);
			expect(JSON.parse(readFileSync(preferencesPath, 'utf8')).charmId).toBe(lastCharm.id);
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
			await command(window, 'Charmlet: Reset Charm');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', lastCharm.id);
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
			await frame.getByRole('button', { name: 'Hide charm', exact: true }).click();
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			picker = frame.getByRole('combobox', { name: 'Charm', exact: true });
			await picker.selectOption('chip');
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'chip');
			await picker.selectOption('terminal');
			await picker.press('Escape');
			await frame.locator('#restore').click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'terminal');
		});

		await test.step('size and cord controls persist across reload', async () => {
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			frame = await readyFrame(window);
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			const defaultMaximumCord = (await frame.getByRole('slider', { name: 'Cord', exact: true }).getAttribute('max'))!;
			expect(Number(defaultMaximumCord)).toBeGreaterThanOrEqual(320);
			const defaultCharmWidth = await frame.locator('#charm').evaluate(charm => charm.getBoundingClientRect().width);
			await frame.getByRole('slider', { name: 'Size', exact: true }).focus();
			await frame.getByRole('slider', { name: 'Size', exact: true }).press('End');
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect.poll(() => frame.locator('#charm').evaluate(charm => charm.getBoundingClientRect().width)).toBeGreaterThan(defaultCharmWidth);
			await frame.getByRole('slider', { name: 'Cord', exact: true }).focus();
			const maximumCord = (await frame.getByRole('slider', { name: 'Cord', exact: true }).getAttribute('max'))!;
			expect(Number(maximumCord)).toBeGreaterThan(48);
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('End');
			await expect(frame.getByRole('slider', { name: 'Cord', exact: true })).toHaveValue(maximumCord);
			expect(Number(await frame.locator('#stage').getAttribute('data-cord'))).toBeLessThanOrEqual(Number(maximumCord));
			await expect.poll(() => frame.locator('#charm').evaluate(charm => {
				const bounds = charm.getBoundingClientRect();
				const stage = document.getElementById('stage')!.getBoundingClientRect();
				return bounds.left >= stage.left - 1 && bounds.right <= stage.right + 1
					&& bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1;
			})).toBe(true);
			await expectBalancedSwingRoom(frame);
			await window.screenshot({ path: testInfo.outputPath('phase-1-settings.png') });
			const settingsVisibleCord = Number(await frame.locator('#stage').getAttribute('data-cord'));
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('Escape');
			await expect(frame.locator('#settings')).toBeHidden();
			const expandedCordAfterClose = Number(await frame.locator('#stage').getAttribute('data-cord'));
			expect(expandedCordAfterClose).toBeGreaterThanOrEqual(settingsVisibleCord);
			expect(expandedCordAfterClose).toBeLessThanOrEqual(Number(maximumCord));
			const expandedVisibleCord = (await frame.locator('#stage').getAttribute('data-cord'))!;
			frame = await reloadCharm(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', expandedVisibleCord);
			await expect(frame.locator('#cord-length')).toHaveValue(maximumCord);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 500));
			frame = await readyFrame(window);
			await expect(frame.locator('#cord-length')).toHaveValue(maximumCord);
			await expect.poll(() => frame.locator('#charm').evaluate(charm => {
				const bounds = charm.getBoundingClientRect();
				const stage = document.getElementById('stage')!.getBoundingClientRect();
				return bounds.left >= stage.left - 1 && bounds.right <= stage.right + 1
					&& bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1;
			})).toBe(true);
			await expect.poll(async () => Number(await frame.locator('#stage').getAttribute('data-cord'))).toBeLessThan(Number(expandedVisibleCord));
			await expectBalancedSwingRoom(frame);
			await window.screenshot({ path: testInfo.outputPath('phase-1-compact-large-charm.png') });
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', expandedVisibleCord);
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			await frame.getByRole('slider', { name: 'Cord', exact: true }).focus();
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('Home');
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('ArrowRight');
			await expect(frame.getByRole('slider', { name: 'Cord', exact: true })).toHaveValue('50');
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('Escape');
			await expect(frame.locator('#settings-toggle')).toBeFocused();
			await expect(frame.locator('#settings')).toBeHidden();
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
		});

		await test.step('cancelled and lost-capture drags restore the parked state', async () => {
			for (const cancellation of ['pointercancel', 'capture', 'blur']) {
				const before = Number(await frame.locator('#charm').getAttribute('data-position-x'));
				await beginDrag(window, frame, -20, 40);
				await expect.poll(async () => Number(await frame.locator('#charm').getAttribute('data-position-x'))).toBeLessThan(before - 10);
				const pointerId = Number(await frame.locator('#charm').getAttribute('data-test-pointer'));
				if (cancellation === 'capture') {
					await frame.locator('#charm').evaluate((charm, id) => charm.releasePointerCapture(id), pointerId);
				} else if (cancellation === 'blur') {
					await frame.evaluate(() => globalThis.dispatchEvent(new Event('blur')));
				} else {
					await frame.locator('#charm').dispatchEvent('pointercancel', { pointerId });
				}
				await window.mouse.up();
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
				await expect(frame.locator('#phase')).toHaveText('Parked');
				expect(await frame.locator('#charm').evaluate((charm, id) => charm.hasPointerCapture(id), pointerId)).toBe(false);
			}
		});

		await test.step('resizing during a drag cancels it without saving the temporary length', async () => {
			const expandedViewport = await window.evaluate(() => ({ width: innerWidth, height: innerHeight }));
			const expandedStage = await frame.locator('#stage').evaluate(stage => ({ width: stage.clientWidth, height: stage.clientHeight }));
			await beginDrag(window, frame, -20, 40);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 650));
			await expect(frame.locator('#phase')).toHaveText('Parked');
			await window.mouse.up();
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
			await expect(frame.locator('#charm')).not.toHaveClass(/dragging/);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			await expect.poll(() => window.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual(expandedViewport);
			await expect.poll(() => frame.locator('#stage').evaluate(stage => ({ width: stage.clientWidth, height: stage.clientHeight }))).toEqual(expandedStage);
			await frame.evaluate(() => new Promise<void>(resolveFrames => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolveFrames()));
			}));
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
		});

		await test.step('collapsing the view during a drag preserves preferences', async () => {
			await beginDrag(window, frame, 0, 40);
			await window.keyboard.press(`${primaryModifier}+Alt+B`);
			await window.mouse.up();
			await expect.poll(async () => {
				try {
					return frame.isDetached() || !(await frame.locator('#stage').isVisible());
				} catch (error) {
					if (frame.isDetached()) {
						return true;
					}
					throw error;
				}
			}).toBe(true);
			await window.keyboard.press(`${primaryModifier}+Alt+B`);
			frame = await readyFrame(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
			await expect(frame.locator('#phase')).toHaveText('Parked');
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		});

		await test.step('system reduced motion overrides animation and high contrast keeps focus visible', async () => {
			await frame.getByRole('switch', { name: 'Motion', exact: true }).click();
			await frame.locator('#charm').click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'true');
			await window.emulateMedia({ reducedMotion: 'reduce' });
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toBeDisabled();
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
			const stoppedFrames = await frame.locator('#stage').getAttribute('data-frames');
			await frame.locator('#charm').click();
			await browserFrames(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-frames', stoppedFrames!);
			const restingCord = (await frame.locator('#stage').getAttribute('data-cord'))!;
			await dragCharm(window, frame, 0, 90);
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
			await expect(frame.locator('#stage')).toHaveAttribute('data-frames', stoppedFrames!);
			await command(window, 'Preferences: Color Theme');
			const themeInput = commandInput(window);
			await themeInput.fill('Dark High Contrast');
			await window.locator('.quick-input-list').getByText('Dark High Contrast', { exact: true }).click();
			await expect(frame.locator('body')).toHaveClass(/vscode-high-contrast/);
			await frame.locator('#charm').focus();
			await frame.locator('#charm').press('ArrowRight');
			await expect(frame.locator('#charm')).toHaveCSS('outline-style', 'solid');
			await window.screenshot({ path: testInfo.outputPath('phase-1-high-contrast.png') });
			await window.emulateMedia({ reducedMotion: 'no-preference' });
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toBeEnabled();
		});

		await test.step('keyboard hiding and restoring leave focus on usable controls', async () => {
			await frame.locator('#charm').focus();
			await frame.locator('#charm').press('Escape');
			await expect(frame.locator('#toggle')).toBeFocused();
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
			await frame.locator('#restore').focus();
			await frame.locator('#restore').press('Enter');
			await expect(frame.locator('#charm')).toBeFocused();
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
		});

		await test.step('downward pulls return to the selected resting length without saving the stretch', async () => {
			for (const reset of [false, true]) {
				if (reset) {
					await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
				}
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				const restingCord = reset ? '126' : '50';
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
				const originalX = Number(await frame.locator('#charm').getAttribute('data-position-x'));
				const originalY = Number(await frame.locator('#charm').getAttribute('data-position-y'));
				const stageBounds = await frame.locator('#stage').boundingBox();
				const charmBounds = await frame.locator('#charm').boundingBox();
				if (!stageBounds || !charmBounds) {
					throw new Error('Return test requires a visible charm and stage.');
				}
				await beginDrag(window, frame, 0, stageBounds.y + stageBounds.height - charmBounds.y - charmBounds.height);
				await expect.poll(async () => Number(await frame.locator('#stage').getAttribute('data-cord'))).toBeGreaterThan(Number(restingCord) + 100);
				await window.screenshot({ path: testInfo.outputPath(`phase-1-stretched-${restingCord}.png`) });
				await window.mouse.up();
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				await expect(frame.locator('#phase')).toHaveText('Parked');
				await expect.poll(async () => Math.abs(Number(await frame.locator('#charm').getAttribute('data-position-x')) - originalX)).toBeLessThan(1);
				await expect.poll(async () => Math.abs(Number(await frame.locator('#charm').getAttribute('data-position-y')) - originalY)).toBeLessThan(1);
				await window.screenshot({ path: testInfo.outputPath(`phase-1-returned-${restingCord}.png`) });
				frame = await reloadCharm(window);
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
				await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
			}
		});

		await test.step('circular drags release and recover without refreshing the editor', async () => {
			const layoutToggle = frame.getByRole('button', { name: 'Orbit layout', exact: true });
			if (await layoutToggle.getAttribute('aria-pressed') !== 'true') {
				await layoutToggle.click();
			}
			await expect(frame.locator('#stage')).toHaveAttribute('data-layout', 'orbit');
			for (const direction of [-1, 1]) {
				await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
				const start = await beginDrag(window, frame, 0, 0, 0.1);
				const stageBounds = await frame.locator('#stage').boundingBox();
				if (!stageBounds) {
					throw new Error('Circular-drag test requires a visible stage.');
				}
				const radius = Math.min(100, stageBounds.width * 0.4, stageBounds.height * 0.2);
				for (let step = 1; step <= 24; step++) {
					const theta = direction * 2 * Math.PI * step / 24;
					await window.mouse.move(start.x + radius * (Math.cos(theta) - 1), start.y + radius * Math.sin(theta));
					await browserFrames(window, 1);
				}
				await window.mouse.move(start.x, start.y);
				await window.mouse.up();
				await expect(frame.locator('#phase')).toHaveText('Parked', { timeout: 20000 });
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
				await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
				await expect(frame.locator('#charm')).not.toHaveClass(/dragging/);
				const pointerId = Number(await frame.locator('#charm').getAttribute('data-test-pointer'));
				expect(await frame.locator('#charm').evaluate((charm, id) => charm.hasPointerCapture(id), pointerId)).toBe(false);
				const inside = await frame.locator('#charm').evaluate(charm => {
					const bounds = charm.getBoundingClientRect();
					const stage = document.getElementById('stage')!.getBoundingClientRect();
					return bounds.left >= stage.left - 1 && bounds.right <= stage.right + 1
						&& bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1;
				});
				expect(inside).toBe(true);
			}
			await window.screenshot({ path: testInfo.outputPath('phase-1-circle-recovered.png') });
		});

		await test.step('compact hanging layout keeps pull room, hide/restore and messages usable', async () => {
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 340));
			frame = await readyFrame(window);
			await expect.poll(() => frame.locator('#stage').evaluate(stage => stage.clientHeight)).toBeLessThan(200);
			const layoutToggle = frame.getByRole('button', { name: 'Orbit layout', exact: true });
			if (await layoutToggle.getAttribute('aria-pressed') === 'true') {
				await layoutToggle.click();
			}
			await expect(frame.locator('#stage')).toHaveAttribute('data-layout', 'hanging');
			await expect(frame.locator('#settings')).toBeHidden();
			await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect(frame.locator('#message-card')).toBeVisible();
			const messagePlacement = () => frame.locator('#message-card').evaluate(card => {
				const stage = document.getElementById('stage')!.getBoundingClientRect();
				const message = card.getBoundingClientRect();
				const tools = document.querySelector('.tools')!.getBoundingClientRect();
				return { stageBottom: stage.bottom, messageTop: message.top, messageBottom: message.bottom, toolsTop: tools.top };
			});
			let placement = await messagePlacement();
			expect(placement.messageTop).toBeGreaterThanOrEqual(placement.stageBottom - 1);
			expect(placement.messageBottom).toBeLessThanOrEqual(placement.toolsTop + 1);
			await expect(frame.locator('#message-card')).toHaveAttribute('data-rotation', 'active');
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			await expect(frame.locator('#settings')).toBeVisible();
			await expect(frame.locator('#message-card')).toHaveAttribute('data-rotation', 'paused');
			placement = await messagePlacement();
			expect(placement.messageTop).toBeGreaterThanOrEqual(placement.stageBottom - 1);
			expect(placement.messageBottom).toBeLessThanOrEqual(placement.toolsTop + 1);
			const rotateMessages = frame.getByRole('checkbox', { name: 'Rotate messages automatically', exact: true });
			await expect(rotateMessages).toBeChecked();
			await rotateMessages.uncheck();
			await rotateMessages.press('Escape');
			await expect(frame.locator('#settings')).toBeHidden();
			frame = await reloadCharm(window);
			await expect(frame.locator('#rotate-messages')).not.toBeChecked();
			await expect(frame.locator('#message-card')).toHaveAttribute('data-rotation', 'paused');
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			const restoredRotateMessages = frame.getByRole('checkbox', { name: 'Rotate messages automatically', exact: true });
			await restoredRotateMessages.check();
			await restoredRotateMessages.press('Escape');
			await expect(frame.locator('#settings')).toBeHidden();
			const parkedCharm = await frame.locator('#charm').boundingBox();
			if (!parkedCharm) { throw new Error('Message rotation test requires a visible charm.'); }
			await window.mouse.move(parkedCharm.x + parkedCharm.width / 2, parkedCharm.y + parkedCharm.height / 2);
			await expect(frame.locator('#message-card')).toHaveAttribute('data-rotation', 'active');
			const restingCord = Number(await frame.locator('#stage').getAttribute('data-cord'));
			const restingBounds = await frame.locator('#charm').boundingBox();
			if (!restingBounds) { throw new Error('Compact feedback test requires a visible charm.'); }
			await beginDrag(window, frame, 0, 80);
			const pulledBounds = await frame.locator('#charm').boundingBox();
			if (!pulledBounds) { throw new Error('Compact feedback pull lost the visible charm.'); }
			expect(pulledBounds.y - restingBounds.y).toBeGreaterThan(8);
			await expect.poll(async () => Number(await frame.locator('#stage').getAttribute('data-cord'))).toBeGreaterThan(restingCord + 10);
			await window.mouse.up();
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', String(restingCord));
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect.poll(async () => {
				const bounds = await frame.locator('#charm').boundingBox();
				return bounds ? Math.abs(bounds.y - restingBounds.y) : Number.POSITIVE_INFINITY;
			}).toBeLessThan(1);
			await beginDrag(window, frame, 8, -70, 0.5, 'Retracted');
			await window.mouse.up();
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
			await expect(frame.locator('#restore')).toBeVisible();
			const restoreBounds = await frame.locator('#restore').boundingBox();
			expect(restoreBounds!.width).toBeGreaterThanOrEqual(26);
			expect(restoreBounds!.height).toBeGreaterThanOrEqual(24);
			await frame.locator('#restore').click();
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect.poll(() => frame.locator('#hanging').evaluate(node => node.getAnimations().every(animation => animation.playState === 'finished'))).toBe(true);
			const heldPoint = await beginDrag(window, frame, -20, 0);
			const compactStageBounds = await frame.locator('#stage').boundingBox();
			if (!compactStageBounds) { throw new Error('Missed-release recovery requires a visible stage.'); }
			await window.mouse.move(compactStageBounds.x - 20, heldPoint.y);
			await window.mouse.up();
			await window.mouse.move(compactStageBounds.x + 10, heldPoint.y);
			await expect(frame.locator('#charm')).not.toHaveClass(/dragging/);
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', String(restingCord));
			await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
			const originalMessage = await frame.locator('#message-text').textContent();
			await frame.getByRole('button', { name: 'Next coding message', exact: true }).click();
			await expect(frame.locator('#message-text')).not.toHaveText(originalMessage!);
			const chosenMessage = await frame.locator('#message-text').textContent();
			frame = await reloadCharm(window);
			await expect(frame.locator('#message-text')).toHaveText(chosenMessage!);
			await expect(frame.locator('#settings')).toBeHidden();
			await expect(frame.locator('#message-card')).toBeVisible();
			await window.screenshot({ path: testInfo.outputPath('compact-feedback.png') });
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			frame = await readyFrame(window);
			await expect.poll(() => frame.locator('#stage').evaluate(stage => stage.clientHeight)).toBeGreaterThan(350);
		});

		await test.step('charm and cord complete peg orbits and recover from an upper release', async () => {
			const layoutToggle = frame.getByRole('button', { name: 'Orbit layout', exact: true });
			if (await layoutToggle.getAttribute('aria-pressed') !== 'true') {
				await layoutToggle.click();
			}
			await expect(frame.locator('#stage')).toHaveAttribute('data-layout', 'orbit');
			frame = await reloadCharm(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-layout', 'orbit');
			const observations = [];
			for (const direction of [-1, 1]) {
				await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				const geometry = await frame.locator('#stage').evaluate(stage => {
					const rig = document.getElementById('rig')!;
					const bounds = stage.getBoundingClientRect();
					const scale = rig.getBoundingClientRect().width / Number.parseFloat(rig.style.width);
					return { left: bounds.left, top: bounds.top, scale, anchorX: Number((stage as HTMLElement).dataset.anchorX), anchorY: Number((stage as HTMLElement).dataset.anchorY), radius: Number((stage as HTMLElement).dataset.orbitRadius) };
				});
				const outer = await frame.locator('#stage').boundingBox();
				if (!outer) { throw new Error('Orbit requires a visible stage.'); }
				// Frame-local DOM coordinates become page coordinates through the stage's page bounding box.
				const pegX = outer.x + geometry.anchorX * geometry.scale;
				const pegY = outer.y + geometry.anchorY * geometry.scale;
				const radius = geometry.radius * geometry.scale;
				await beginDrag(window, frame, 0, 0);
				await window.mouse.move(pegX, pegY + radius, { steps: 8 });
				await browserFrames(window, 12);
				const samples = [];
				let previous = Number(await frame.locator('#charm').getAttribute('data-angle'));
				let travel = 0;
				const quadrants = new Set<number>();
				for (let step = 1; step <= 96; step++) {
					const theta = direction * 3 * Math.PI * step / 96;
					await window.mouse.move(pegX + Math.sin(theta) * radius, pegY + Math.cos(theta) * radius);
					await browserFrames(window, 2);
					const sample = await frame.locator('#charm').evaluate(charm => {
						const element = charm as HTMLElement;
						const stage = document.getElementById('stage')!;
						const bounds = charm.getBoundingClientRect();
						const area = stage.getBoundingClientRect();
						return { angle: Number(element.dataset.angle), x: Number(element.dataset.positionX), y: Number(element.dataset.positionY), anchorX: Number(stage.dataset.anchorX), anchorY: Number(stage.dataset.anchorY), inside: bounds.left >= area.left - 1 && bounds.right <= area.right + 1 && bounds.top >= area.top - 1 && bounds.bottom <= area.bottom + 1 };
					});
					const delta = sample.angle - previous;
					travel += Math.atan2(Math.sin(delta), Math.cos(delta));
					previous = sample.angle;
					quadrants.add((sample.x >= geometry.anchorX ? 1 : 0) + (sample.y >= geometry.anchorY ? 2 : 0));
					expect(sample.inside).toBe(true);
					expect(sample.anchorX).toBe(geometry.anchorX);
					expect(sample.anchorY).toBe(geometry.anchorY);
					samples.push({ step, ...sample });
					if (step === 32 || step === 64 || step === 96) {
						await window.screenshot({ path: testInfo.outputPath(`orbit-${direction}-${step}.png`) });
					}
				}
				expect(-direction * travel).toBeGreaterThan(3 * Math.PI - 0.25);
				expect(quadrants.size).toBe(4);
				await browserFrames(window, 60);
				expect(Number(await frame.locator('#charm').getAttribute('data-position-y'))).toBeLessThan(geometry.anchorY);
				await expect(frame.locator('#phase')).toHaveText('Held');
				await window.mouse.up();
				await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
				await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				await expect(frame.locator('#phase')).toHaveText('Parked');
				await expect(frame.locator('#cord-length')).toHaveValue('126');
				observations.push({ direction, geometry, travel, quadrants: [...quadrants], samples });
			}
			const path = testInfo.outputPath('orbit-observations.json');
			writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, hostVersion: await app.evaluate(({ app: host }) => host.getVersion()), observations }, null, 2)}\n`);
			await testInfo.attach('orbit-observations.json', { path, contentType: 'application/json' });
			await window.screenshot({ path: testInfo.outputPath('orbit-returned.png') });
		});

		await test.step('a downloaded PNG pack imports, persists and removes through supported commands', async () => {
			const sourcePack = resolve('../website/packs/probe-card.charmlet.json');
			const selectedPack = join(profile, 'probe-card.charmlet.json');
			copyFileSync(sourcePack, selectedPack);
			const restingCord = (await frame.locator('#stage').getAttribute('data-cord'))!;
			const layout = (await frame.locator('#stage').getAttribute('data-layout'))!;
			const message = (await frame.locator('#message-text').textContent())!;
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'true');
			await app.evaluate(({ dialog }, path) => {
				const holder = globalThis as typeof globalThis & { __charmletOpenDialog?: typeof dialog.showOpenDialog };
				holder.__charmletOpenDialog = dialog.showOpenDialog;
				dialog.showOpenDialog = (() => Promise.resolve({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog;
			}, selectedPack);
			try {
				await command(window, 'Charmlet: Import Charm Pack');
				await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'pack:probe-card:probe-card');
			} finally {
				await app.evaluate(({ dialog }) => {
					const holder = globalThis as typeof globalThis & { __charmletOpenDialog?: typeof dialog.showOpenDialog };
					if (holder.__charmletOpenDialog) {
						dialog.showOpenDialog = holder.__charmletOpenDialog;
						delete holder.__charmletOpenDialog;
					}
				});
			}
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			const importedPicker = frame.getByRole('combobox', { name: 'Charm', exact: true });
			await expect(importedPicker).toHaveValue('pack:probe-card:probe-card');
			await expect(importedPicker.locator('option')).toHaveCount(11);
			await importedPicker.press('Escape');
			await expect(frame.locator('#settings')).toBeHidden();
			await expect(frame.locator('#charm-name')).toHaveText('Probe Card');
			await expect(frame.locator('#charm-image')).toHaveAttribute('src', /^data:image\/png;base64,/);
			await expect.poll(() => frame.locator('#charm-image').evaluate(image => {
				const img = image as HTMLImageElement;
				return img.complete && img.naturalWidth === 288;
			})).toBe(true);
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
			await expect(frame.locator('#stage')).toHaveAttribute('data-layout', layout);
			await expect(frame.locator('#message-text')).toHaveText(message);
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'true');
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect.poll(() => frame.locator('#hanging').evaluate(node => node.getAnimations().every(animation => animation.playState === 'finished'))).toBe(true);
			const startX = Number(await frame.locator('#charm').getAttribute('data-position-x'));
			await frame.locator('#charm').click();
			await expect.poll(async () => Math.abs(Number(await frame.locator('#charm').getAttribute('data-position-x')) - startX)).toBeGreaterThan(3);
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
			await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true', { timeout: 10000 });
			frame = await reloadCharm(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'pack:probe-card:probe-card');
			await expect(frame.locator('#charm-name')).toHaveText('Probe Card');
			await expect(frame.locator('#charm-image')).toHaveAttribute('src', /^data:image\/png;base64,/);
			await expect.poll(() => frame.locator('#charm-image').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(288);
			await window.screenshot({ path: testInfo.outputPath('imported-probe-card.png') });
			await command(window, 'Charmlet: Remove Charm Pack');
			await window.locator('.quick-input-list').getByText('Probe Card', { exact: true }).click();
			await expect(frame.locator('#charm-select option')).toHaveCount(10);
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'terminal');
			await expect(frame.locator('#charm-name')).toHaveText('Terminal');
		});

		await test.step('record visible, settled and hidden resource snapshots', async () => {
			const sampleDurationMs = 2000;
			const captureMetrics = () => app.evaluate(({ app: host }) => {
				const processes = host.getAppMetrics().map((metric: {
					pid: number;
					creationTime: number;
					type: string;
					cpu: { percentCPUUsage: number };
					memory: { workingSetSize: number };
				}) => ({
					pid: metric.pid,
					creationTime: metric.creationTime,
					type: metric.type,
					cpuPercent: metric.cpu.percentCPUUsage,
					workingSetKB: metric.memory.workingSetSize,
				}));
				return { monotonicMs: performance.now(), processes };
			});
			const samples = [];
			for (const mode of ['active', 'settled', 'hidden']) {
				if (mode === 'active') {
					await frame.locator('#charm').click();
					await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'true');
				} else if (mode === 'settled') {
					await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
				} else {
					await frame.getByRole('button', { name: 'Hide charm', exact: true }).click();
					await expect(frame.locator('#hanging')).toBeHidden();
					await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
				}
				const beforeFrames = Number(await frame.locator('#stage').getAttribute('data-frames'));
				const runningBefore = await frame.locator('#stage').getAttribute('data-running');
				// Prime Electron's interval counters, then wait without driving workbench animation frames.
				const before = await captureMetrics();
				await new Promise(resolveSample => setTimeout(resolveSample, sampleDurationMs));
				const after = await captureMetrics();
				const afterFrames = Number(await frame.locator('#stage').getAttribute('data-frames'));
				const runningAfter = await frame.locator('#stage').getAttribute('data-running');
				const frameDelta = afterFrames - beforeFrames;
				if (mode === 'active') {
					expect(frameDelta).toBeGreaterThan(0);
				} else {
					expect(frameDelta).toBe(0);
				}
				for (const process of after.processes) {
					expect(Number.isFinite(process.cpuPercent)).toBe(true);
					expect(process.cpuPercent).toBeGreaterThanOrEqual(0);
					expect(Number.isFinite(process.workingSetKB)).toBe(true);
					expect(process.workingSetKB).toBeGreaterThanOrEqual(0);
				}
				samples.push({
					mode,
					intervalMs: after.monotonicMs - before.monotonicMs,
					beforeFrames,
					afterFrames,
					frameDelta,
					runningBefore,
					runningAfter,
					before,
					after,
				});
			}
			const report = {
				schemaVersion: 2,
				hostName: await app.evaluate(({ app: host }) => host.getName()),
				recordedAt: new Date().toISOString(),
				hostVersion: await app.evaluate(({ app: host }) => host.getVersion()),
				electronVersion: await app.evaluate(() => process.versions.electron),
				platform: process.platform,
				arch: process.arch,
				requestedHost: process.env.CHARMLET_TEST_HOST || process.env.VSCODE_TEST_VERSION || 'installed',
				scope: 'All processes reported by the isolated editor host, including editor and automation overhead. Not extension-only CPU or memory.',
				cpuMeaning: 'Electron percentCPUUsage since the preceding metrics call. Process identity is pid plus creationTime; a new process has no baseline.',
				memoryMeaning: 'Electron workingSetSize in KB, per process. Shared pages can occur in multiple processes; do not sum as unique memory.',
				sampleDurationMs,
				samples,
			};
			const reportPath = testInfo.outputPath('resource-profile.json');
			writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
			await testInfo.attach('resource-profile.json', { path: reportPath, contentType: 'application/json' });
		});
	} catch (error) {
		await window.screenshot({ path: testInfo.outputPath('failure.png') });
		throw error;
	} finally {
		try {
			await app.close();
		} finally {
			try {
				writeFileSync(testInfo.outputPath('preference-events.json'), `${JSON.stringify(preferenceEvents, null, 2)}\n`);
			} catch {
				// Keep the original test result if optional diagnostic writing fails.
			}
			try {
				const editorLogs = join(profile, 'user', 'logs');
				if (existsSync(editorLogs)) {
					cpSync(editorLogs, testInfo.outputPath('editor-logs'), { recursive: true });
				}
			} catch {
				// Keep the original test result if optional diagnostic copying fails.
			}
		}
	}
});
