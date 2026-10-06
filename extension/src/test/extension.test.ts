import { test, expect, _electron as electron, type Frame, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { CHARMS } from '../charm-catalog';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function commandInput(window: Page) {
	const widget = window.locator('.quick-input-widget');
	return widget.getByRole('combobox').or(widget.getByRole('textbox'));
}

async function command(window: Page, title: string) {
	await window.keyboard.press('Control+Shift+P');
	const input = commandInput(window);
	await expect(input).toBeVisible();
	await input.fill('>');
	await input.pressSequentially(title, { delay: 15 });
	await window.locator('.quick-input-list').getByText(title, { exact: true }).click();
}

async function readyFrame(window: Page): Promise<Frame> {
	let result: Frame | undefined;
	await expect.poll(async () => {
		for (const frame of window.frames()) {
			if (!frame.isDetached() && await frame.locator('#stage[data-ready="true"]').isVisible()) {
				result = frame;
				return true;
			}
		}
		return false;
	}, { timeout: 30000 }).toBe(true);
	if (!result) {
		throw new Error('Charmlet did not create a ready webview.');
	}
	return result;
}

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

async function beginDrag(window: Page, frame: Frame, deltaX: number, deltaY: number, grabFraction = 0.5) {
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
	await expect(frame.locator('#phase')).toHaveText('Held');
	return { x: startX, y: startY };
}

async function dragCharm(window: Page, frame: Frame, deltaX: number, deltaY: number) {
	await beginDrag(window, frame, deltaX, deltaY);
	await window.mouse.up();
}

test('real-editor charm supports docking, gestures, focus, persistence and reduced motion', async ({}, testInfo) => {
	test.setTimeout(180000);
	const profile = mkdtempSync(join(tmpdir(), 'charmlet-ui-'));
	const scratchFile = join(profile, 'charmlet-trial.ts');
	writeFileSync(scratchFile, "export const greeting = 'Hello, Charmlet!';\n");
	const environment: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') {
			environment[key] = value;
		}
	}
	const app = await electron.launch({
		executablePath: process.env.VSCODE_EXECUTABLE ?? 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
		args: [
			`--user-data-dir=${join(profile, 'user')}`,
			`--extensions-dir=${join(profile, 'extensions')}`,
			`--extensionDevelopmentPath=${resolve('.')}`,
			'--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
			'--disable-telemetry', '--disable-updates',
			scratchFile,
		],
		env: environment,
		timeout: 45000,
	});
	const window = await app.firstWindow();
	try {
		await app.evaluate(({ BrowserWindow }) => {
			const testWindow = BrowserWindow.getAllWindows()[0];
			testWindow.setIgnoreMouseEvents(true);
			testWindow.setSize(1400, 900);
		});
		await window.waitForLoadState('domcontentloaded');
		await expect(window.locator('.monaco-workbench')).toBeVisible({ timeout: 30000 });
		await expect(window.locator('.part.editor .view-lines').first()).toContainText('Hello, Charmlet!', { timeout: 30000 });
		await window.keyboard.press('Control+Shift+P');
		const input = commandInput(window);
		await expect(input).toBeVisible();
		await input.fill('>');
		await input.pressSequentially('Charmlet: Show Charm', { delay: 30 });
		await expect(window.locator('.quick-input-list')).toContainText('Charmlet: Show Charm', { timeout: 15000 });
		await window.keyboard.press('Enter');
		await expect.poll(() => window.frames().map(frame => frame.url()).join('\n'), { timeout: 30000 })
			.toContain('vscode-webview');
		let charmFrame: Frame | undefined;
		await expect.poll(async () => {
			for (const frame of window.frames()) {
				if (await frame.locator('#stage[data-ready="true"]').count()) {
					charmFrame = frame;
					return true;
				}
			}
			return false;
		}, { timeout: 30000 }).toBe(true);
		if (!charmFrame) {
			throw new Error('Charmlet did not create a ready webview.');
		}
		const charmImage = charmFrame.locator('#charm img');
		await expect(charmImage).toBeVisible();
		await expect.poll(() => charmImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(72);
		await window.keyboard.press('Control+Shift+P');
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
		await dragCharm(window, frame, 0, -80);
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
		await Promise.all([
			window.waitForEvent('domcontentloaded'),
			command(window, 'Developer: Reload Window'),
		]);
		frame = await readyFrame(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'true');
		await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
		await frame.locator('#restore').click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
		await frame.locator('#charm').click();
		await browserFrames(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		await command(window, 'Charmlet: Show Charm');
		await expect(window.locator('.part.editor .monaco-editor.focused')).toBeVisible();
		await window.keyboard.press('Control+End');
		await window.keyboard.press('Enter');
		await window.keyboard.type('const charmletTrial = true;');
		await expect(window.locator('.part.editor .monaco-editor.focused .view-lines')).toContainText('const charmletTrial = true;');
		await window.keyboard.press('Control+S');
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
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			frame = await readyFrame(window);
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			let picker = frame.getByRole('combobox', { name: 'Charm', exact: true });
			await expect(picker.locator('option')).toHaveCount(4);
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
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
				await expect(frame.locator('#stage')).toHaveAttribute('data-size', '100');
				await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
				await frame.locator('#charm').screenshot({ path: testInfo.outputPath(`phase-2-${entry.id}.png`) });
			}
			await picker.focus();
			await picker.press('Home');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'terminal');
			await picker.press('End');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'circuit');
			await window.screenshot({ path: testInfo.outputPath('phase-2-collection.png') });
			await picker.press('Escape');
			await Promise.all([
				window.waitForEvent('domcontentloaded'),
				command(window, 'Developer: Reload Window'),
			]);
			frame = await readyFrame(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'circuit');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '146');
			await expect(frame.getByRole('switch', { name: 'Motion', exact: true })).toHaveAttribute('aria-checked', 'false');
			await command(window, 'Charmlet: Reset Charm');
			await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'circuit');
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
			await frame.getByRole('slider', { name: 'Size', exact: true }).focus();
			await frame.getByRole('slider', { name: 'Size', exact: true }).press('End');
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect.poll(() => frame.locator('#charm').evaluate(charm => charm.getBoundingClientRect().width)).toBeGreaterThan(95);
			await frame.getByRole('slider', { name: 'Cord', exact: true }).focus();
			const maximumCord = (await frame.getByRole('slider', { name: 'Cord', exact: true }).getAttribute('max'))!;
			expect(Number(maximumCord)).toBeGreaterThan(320);
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('End');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', maximumCord);
			await expectBalancedSwingRoom(frame);
			await window.screenshot({ path: testInfo.outputPath('phase-1-settings.png') });
			await Promise.all([
				window.waitForEvent('domcontentloaded'),
				command(window, 'Developer: Reload Window'),
			]);
			frame = await readyFrame(window);
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', maximumCord);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 500));
			frame = await readyFrame(window);
			await expect.poll(() => frame.locator('#charm').evaluate(charm => {
				const bounds = charm.getBoundingClientRect();
				const stage = document.getElementById('stage')!.getBoundingClientRect();
				return bounds.left >= stage.left - 1 && bounds.right <= stage.right + 1
					&& bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1;
			})).toBe(true);
			await expect.poll(async () => Number(await frame.locator('#stage').getAttribute('data-cord'))).toBeLessThan(Number(maximumCord));
			await expectBalancedSwingRoom(frame);
			await window.screenshot({ path: testInfo.outputPath('phase-1-compact-large-charm.png') });
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', maximumCord);
			await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
			await frame.getByRole('slider', { name: 'Cord', exact: true }).focus();
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('Home');
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('ArrowRight');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
			await frame.getByRole('slider', { name: 'Cord', exact: true }).press('Escape');
			await expect(frame.locator('#settings-toggle')).toBeFocused();
			await expect(frame.locator('#settings')).toBeHidden();
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
			await beginDrag(window, frame, -20, 40);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 650));
			await expect(frame.locator('#phase')).toHaveText('Parked');
			await window.mouse.up();
			await expect(frame.locator('#stage')).toHaveAttribute('data-size', '140');
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
			await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
			await expect(frame.locator('#charm')).not.toHaveClass(/dragging/);
			await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1400, 900));
			await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '50');
		});

		await test.step('collapsing the view during a drag preserves preferences', async () => {
			await beginDrag(window, frame, 0, 40);
			await window.keyboard.press('Control+Alt+B');
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
			await window.keyboard.press('Control+Alt+B');
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
				await Promise.all([
					window.waitForEvent('domcontentloaded'),
					command(window, 'Developer: Reload Window'),
				]);
				frame = await readyFrame(window);
				await expect(frame.locator('#stage')).toHaveAttribute('data-cord', restingCord);
				await expect(frame.locator('#stage')).toHaveAttribute('data-hidden', 'false');
			}
		});

		await test.step('circular drags release and recover without refreshing the editor', async () => {
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
				schemaVersion: 1,
				recordedAt: new Date().toISOString(),
				hostVersion: await app.evaluate(({ app: host }) => host.getVersion()),
				electronVersion: await app.evaluate(() => process.versions.electron),
				platform: process.platform,
				arch: process.arch,
				requestedHost: process.env.VSCODE_TEST_VERSION ?? 'installed',
				scope: 'All processes reported by the isolated VS Code host, including editor and automation overhead. Not extension-only CPU or memory.',
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
		await app.close();
	}
});
