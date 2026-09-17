import { test, expect, _electron as electron, type Frame, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

async function command(window: Page, title: string) {
	await window.keyboard.press('Control+Shift+P');
	const input = window.locator('.quick-input-widget input');
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

async function dragCharm(window: Page, frame: Frame, deltaX: number, deltaY: number) {
	await expect(frame.locator('#charm')).toBeVisible();
	const bounds = await frame.locator('#charm').boundingBox();
	if (!bounds) {
		throw new Error('Cannot drag an invisible charm.');
	}
	const startX = bounds.x + bounds.width / 2;
	const startY = bounds.y + bounds.height / 2;
	await window.mouse.move(startX, startY);
	await window.mouse.down();
	for (let step = 1; step <= 12; step++) {
		await window.mouse.move(startX + deltaX * step / 12, startY + deltaY * step / 12);
		await browserFrames(window, 1);
	}
	await expect(frame.locator('#phase')).toHaveText('Held');
	await window.mouse.up();
}

test('real-editor charm supports docking, gestures, focus, persistence and reduced motion', async ({}, testInfo) => {
	const profile = mkdtempSync(join(tmpdir(), 'charmlet-ui-'));
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
			resolve('src/charm-state.ts'),
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
		await expect(window.locator('.part.editor .view-lines').first()).toContainText('export interface CharmState', { timeout: 30000 });
		await window.keyboard.press('Control+Shift+P');
		const input = window.locator('.quick-input-widget input');
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
		await window.locator('.quick-input-list').getByText('Charmlet', { exact: true }).click();
		await input.fill('New Secondary Side Bar');
		await expect(window.locator('.quick-input-list')).toContainText('New Secondary Side Bar');
		await window.keyboard.press('Enter');
		await expect(window.locator('.quick-input-widget')).toBeHidden();
		let frame = await readyFrame(window);
		await expect.poll(() => frame.locator('#stage').evaluate(stage => stage.clientHeight)).toBeGreaterThan(350);
		await frame.getByRole('button', { name: 'Reset position', exact: true }).click();
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '126');
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await expect.poll(() => frame.locator('#hanging').evaluate(node => node.getAnimations().every(animation => animation.playState === 'finished'))).toBe(true);
		const startX = Number(await frame.locator('#charm').getAttribute('data-position-x'));
		await frame.locator('#charm').click();
		await expect.poll(async () => Math.abs(Number(await frame.locator('#charm').getAttribute('data-position-x')) - startX)).toBeGreaterThan(3);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false', { timeout: 20000 });
		await dragCharm(window, frame, 0, 90);
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '216');
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
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '236');
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
		await expect(frame.locator('#stage')).toHaveAttribute('data-cord', '236');
		await frame.locator('#charm').click();
		await browserFrames(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-running', 'false');
		await command(window, 'Charmlet: Show Charm');
		await expect(window.locator('.part.editor .monaco-editor.focused')).toBeVisible();
		await window.keyboard.press('Control+N');
		await window.keyboard.type('const charmletTrial = true;');
		await expect(window.locator('.part.editor .monaco-editor.focused .view-lines')).toContainText('const charmletTrial = true;');
		await window.keyboard.press('Control+Z');
		await window.keyboard.press('Control+F4');
		await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 650));
		frame = await readyFrame(window);
		const fits = await frame.locator('#charm').evaluate(charm => {
			const bounds = charm.getBoundingClientRect();
			const stage = document.getElementById('stage')!.getBoundingClientRect();
			return bounds.left >= stage.left && bounds.right <= stage.right && bounds.top >= stage.top && bounds.bottom <= stage.bottom;
		});
		expect(fits).toBe(true);
		await window.screenshot({ path: testInfo.outputPath('compact-window.png') });
	} catch (error) {
		await window.screenshot({ path: testInfo.outputPath('failure.png') });
		throw error;
	} finally {
		await app.close();
	}
});
