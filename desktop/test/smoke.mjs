import { createRequire } from 'node:module';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '..');
const require = createRequire(import.meta.url);
const { _electron: electron, expect } = require(join(repo, 'extension', 'node_modules', '@playwright', 'test'));
const packaged = process.argv.includes('--packaged');
const mode = packaged ? 'packaged' : 'dev';
const arch = process.arch;
const executablePath = packaged
  ? process.platform === 'win32'
    ? join(root, 'release', `Charmlet-win32-${arch}`, 'Charmlet.exe')
    : process.platform === 'darwin'
      ? join(root, 'release', `Charmlet-darwin-${arch}`, 'Charmlet.app', 'Contents', 'MacOS', 'Charmlet')
      : (() => { throw new Error(`Packaged smoke supports only win32/darwin, not ${process.platform}.`); })()
  : require('electron');
const launchArgs = packaged ? [] : [root];
const output = join(root, 'test-results', mode);
await mkdir(output, { recursive: true });
if (packaged && !existsSync(executablePath)) throw new Error(`Packaged executable is missing: ${executablePath}`);

function focusText(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

test(`desktop ${mode} host keeps shared state in its owned profile`, { timeout: 180000 }, async context => {
  const applications = new Set();
  const profile = mkdtempSync(join(tmpdir(), `charmlet-desktop-${mode}-`));
  mkdirSync(join(profile, 'window'), { recursive: true });
  const preferencesPath = join(profile, 'preferences.json');
  const companionPath = join(profile, 'companion.json');
  const pausedRemainder = 47000;
  writeFileSync(preferencesPath, `${JSON.stringify({
    version: 1, charmId: 'garden:hibiscus', layoutMode: 'hanging', showMessages: true, rotateMessages: false,
    messageIndex: 0, cordLength: 126, size: 100, hidden: false, reducedMotion: true,
  })}\n`);
  writeFileSync(companionPath, `${JSON.stringify({
    version: 2, revision: 7,
    settings: { focusMinutes: 1, breakMinutes: 1, intent: 'Desktop beta' },
    focus: { phase: 'focus', status: 'paused', durationMs: 60000, remainingMs: pausedRemainder, startedAt: null, deadlineAt: null, notice: null },
    learning: { mode: 'trivia', cardId: 'trivia-branch-pointer', encouragementId: 'encouragement-0', revealed: false },
    garden: {
      plant: { id: 'desktop-hibiscus', flowerId: 'hibiscus', waterings: 11, plantedAt: Date.now() - 20 * 86400000 },
      collection: [{ id: 'hibiscus', blooms: 1, firstBloomAt: Date.now() - 86400000, lastBloomAt: Date.now() - 86400000 }],
      lastWateredDay: null, lastWateredAt: null,
    },
    care: {
      deferWhileFocusing: true,
      water: { enabled: false, intervalMinutes: 60, dueAt: null, pendingAt: null },
      move: { enabled: false, intervalMinutes: 50, dueAt: null, pendingAt: null },
    },
  })}\n`);
  writeFileSync(join(profile, 'window', 'preferences.json'), `${JSON.stringify({ x: 40, y: 40, width: 340, height: 620 })}\n`);
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  environment.CHARMLET_DESKTOP_PROFILE = profile;
  environment.CHARMLET_DESKTOP_TEST = '1';

  async function launch() {
    const application = await electron.launch({ executablePath, args: launchArgs, env: environment, timeout: 45000 });
    applications.add(application);
    try {
      const window = await application.firstWindow({ timeout: 45000 });
      await window.locator('#stage[data-ready="true"][data-companion-ready="true"]').waitFor({ timeout: 30000 });
      return { application, window };
    } catch (error) {
      await quit(application);
      throw error;
    }
  }
  async function diagnostic(application) {
    return application.evaluate(() => globalThis.__charmletDesktopDiagnostic?.());
  }
  async function quit(application) {
    applications.delete(application);
    try { await application.evaluate(({ app }) => app.quit()); } catch { /* Process may already be closing. */ }
    await application.close().catch(() => undefined);
  }
  context.after(async () => {
    await Promise.all([...applications].map(application => quit(application)));
    const logs = join(profile, 'logs');
    if (existsSync(logs)) cpSync(logs, join(output, 'logs'), { recursive: true });
  });

  let first = await launch();
  const { application, window } = first;
  const start = await diagnostic(application);
  assert.equal(start.appName, 'Charmlet');
  assert.equal(realpathSync(start.profile), realpathSync(profile));
  assert.equal(start.focusable, false);
  assert.equal(start.configuredWindowFlags.frame, false);
  assert.equal(start.configuredWindowFlags.transparent, true);
  assert.equal(start.configuredWindowFlags.skipTaskbar, true);
  assert.equal(start.measuredWindowState.resizable, false);
  assert.equal(start.measuredWindowState.alwaysOnTop, true);
  assert.equal(start.webPreferences.nodeIntegration, false);
  assert.equal(start.webPreferences.contextIsolation, true);
  assert.equal(start.webPreferences.sandbox, true);
  assert.equal(start.webPreferences.webSecurity, true);
  assert.deepEqual(await window.evaluate(() => ({ require: typeof globalThis.require, process: typeof globalThis.process })), { require: 'undefined', process: 'undefined' });
  assert.deepEqual(await window.evaluate(() => ({
    app: getComputedStyle(document.getElementById('app')).backgroundColor,
    stage: getComputedStyle(document.getElementById('stage')).backgroundColor,
  })), { app: 'rgba(0, 0, 0, 0)', stage: 'rgba(0, 0, 0, 0)' });
  const areas = await application.evaluate(({ screen }) => screen.getAllDisplays().map(display => display.workArea));
  assert.ok(areas.some(area => start.bounds.x >= area.x && start.bounds.y >= area.y
    && start.bounds.x + start.bounds.width <= area.x + area.width && start.bounds.y + start.bounds.height <= area.y + area.height));

  assert.equal(await window.locator('#stage').getAttribute('data-charm'), 'garden:hibiscus');
  await window.locator('#charm-image').evaluate(image => image.decode());
  assert.equal(await window.locator('#charm-image').evaluate(image => image.naturalWidth), 72);
  await window.evaluate(() => globalThis.acquireVsCodeApi().postMessage({ type: 'desktop-hit-test', ignore: false }));
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(false);
  await window.evaluate(() => globalThis.acquireVsCodeApi().postMessage({ type: 'desktop-hit-test', ignore: true }));
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(true);

  await window.getByRole('button', { name: 'Companion tools', exact: true }).click();
  await window.getByRole('tab', { name: 'Focus', exact: true }).click();
  assert.equal((await diagnostic(application)).focusable, true);
  await window.getByRole('button', { name: 'Resume', exact: true }).focus();
  assert.equal(await window.evaluate(() => document.activeElement?.id), 'focus-resume');
  assert.equal(await window.locator('#focus-status').textContent(), 'Paused');
  assert.equal(await window.locator('#focus-time').textContent(), '0:47');
  await window.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).focus.status, { timeout: 5000 }).toBe('running');

  await window.getByRole('button', { name: 'Hide Charmlet to tray', exact: true }).click();
  await expect.poll(async () => (await diagnostic(application)).visible, { timeout: 5000 }).toBe(false);
  await application.evaluate(({ powerMonitor }) => powerMonitor.emit('suspend'));
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).focus.status, { timeout: 5000 }).toBe('paused');
  const paused = JSON.parse(readFileSync(companionPath, 'utf8')).focus.remainingMs;
  assert.ok(paused > 0 && paused <= pausedRemainder);
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].showInactive());
  await expect.poll(async () => (await diagnostic(application)).visible, { timeout: 5000 }).toBe(true);
  await expect.poll(() => window.locator('#focus-status').textContent(), { timeout: 5000 }).toBe('Paused');
  assert.equal(await window.locator('#focus-time').textContent(), focusText(paused));
  await window.screenshot({ path: join(output, 'desktop-focus.png') });

  const generation = (await diagnostic(application)).rendererGeneration;
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.reload());
  await window.locator('#stage[data-ready="true"][data-companion-ready="true"]').waitFor({ timeout: 30000 });
  await expect.poll(async () => (await diagnostic(application)).rendererGeneration, { timeout: 5000 }).toBeGreaterThan(generation);
  await window.getByRole('button', { name: 'Companion tools', exact: true }).click();
  assert.equal(await window.locator('#focus-status').textContent(), 'Paused');
  assert.equal(JSON.parse(readFileSync(companionPath, 'utf8')).focus.remainingMs, paused);
  await window.getByRole('tab', { name: 'Garden', exact: true }).click();
  assert.match(await window.locator('#garden-status').textContent(), /Hibiscus bloomed/);
  await window.screenshot({ path: join(output, 'desktop-garden.png') });
  await quit(application);
  first = undefined;

  const second = await launch();
  const restarted = await diagnostic(second.application);
  assert.equal(restarted.state.charmId, 'garden:hibiscus');
  assert.equal(restarted.companion.state.focus.status, 'paused');
  assert.equal(restarted.companion.state.focus.remainingMs, paused);
  await second.window.evaluate(() => globalThis.acquireVsCodeApi().postMessage({ type: 'desktop-hit-test', ignore: false }));
  await expect.poll(async () => (await diagnostic(second.application)).ignored, { timeout: 5000 }).toBe(false);
  await second.window.getByRole('button', { name: 'Companion tools', exact: true }).click();
  await second.window.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).focus.status, { timeout: 5000 }).toBe('idle');
  await second.window.getByRole('tab', { name: 'Learn', exact: true }).click();
  await second.window.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).learning.revealed, { timeout: 5000 }).toBe(true);
  assert.ok((await second.window.locator('#message-answer').textContent())?.includes('commit'));
  console.log(JSON.stringify({
    mode, profile: realpathSync(profile), startupFocusable: start.focusable, security: start.webPreferences,
    activeCharm: restarted.state.charmId, pausedRemainder: paused, placement: restarted.bounds,
    clickThroughProof: 'validated restricted IPC and BrowserWindow ignored-state configuration; native OS click-through remains manual',
  }));
  await quit(second.application);
});
