import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = join(root, '..');
const require = createRequire(import.meta.url);
const { _electron: electron, expect } = require(join(repo, 'extension', 'node_modules', '@playwright', 'test'));
const packaged = process.argv.includes('--packaged');
const nativeInput = process.env.CHARMLET_DESKTOP_NATIVE_INPUT === '1';
if (nativeInput && (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true')) {
  throw new Error('Native pointer checks require the isolated Windows CI desktop.');
}
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const trial = JSON.parse(readFileSync(join(repo, 'extension', 'src', 'trial-charms.json'), 'utf8'));
const bundleRoot = process.env.CHARMLET_DESKTOP_BUNDLE_ROOT
  ? resolve(process.env.CHARMLET_DESKTOP_BUNDLE_ROOT) : join(root, 'release', manifest.version);
const mode = packaged ? process.env.CHARMLET_DESKTOP_BUNDLE_ROOT ? 'archive' : 'packaged' : 'dev';
const arch = process.arch;
const executablePath = packaged
  ? process.platform === 'win32'
    ? join(bundleRoot, `Charmlet-win32-${arch}`, 'Charmlet.exe')
    : process.platform === 'darwin'
      ? join(bundleRoot, `Charmlet-darwin-${arch}`, 'Charmlet.app', 'Contents', 'MacOS', 'Charmlet')
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
      await window.evaluate(() => {
        globalThis.__charmletTestEvents = [];
        const record = value => {
          globalThis.__charmletTestEvents.push(value);
          if (globalThis.__charmletTestEvents.length > 60) globalThis.__charmletTestEvents.shift();
        };
        for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'click']) {
          document.addEventListener(type, event => record({
            type, target: event.target?.id, x: event.clientX, y: event.clientY,
          }), true);
        }
        for (const type of ['focus', 'blur']) window.addEventListener(type, () => record({ type }));
        window.addEventListener('message', event => {
          if (['companion', 'companion-result'].includes(event.data?.type)) {
            record({ type: event.data.type, requestId: event.data.requestId, error: event.data.error,
              learning: event.data.snapshot?.state?.learning });
          }
        });
      });
      return { application, window };
    } catch (error) {
      await quit(application);
      throw error;
    }
  }
  async function diagnostic(application) {
    return application.evaluate(() => globalThis.__charmletDesktopDiagnostic?.());
  }
  async function openTools(window) {
    if (await window.locator('body').getAttribute('data-desktop-tools') === 'true') return;
    await window.locator('#charm').hover();
    await window.getByRole('button', { name: 'Show controls', exact: true }).click();
    await expect(window.locator('#primary-nav')).toBeVisible();
  }
  async function quit(application) {
    applications.delete(application);
    try { await application.evaluate(({ app }) => app.quit()); } catch { /* Process may already be closing. */ }
    await application.close().catch(() => undefined);
  }
  async function verifyNativeInput(application, window) {
    const evidence = { actions: [], samples: [] };
    try {
      // Configure the owned profile through the same controls as a user.
      await window.emulateMedia({ reducedMotion: 'no-preference' });
      await openTools(window);
      await window.getByRole('button', { name: 'Charm settings', exact: true }).click();
      await window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
      if (await window.locator('#motion').getAttribute('aria-checked') === 'false') await window.locator('#motion').click();
      await window.locator('#settings-close').click();
      await window.getByRole('button', { name: 'Charm settings', exact: true }).click();
      for (const id of ['desktop-background', 'desktop-pin-toolbar', 'desktop-pin-messages']) {
        if (await window.locator(`#${id}`).getAttribute('aria-pressed') === 'true') await window.locator(`#${id}`).click();
      }
      await window.locator('#menu-close').click();
      await expect(window.locator('body')).toHaveAttribute('data-desktop-tools', 'false');
      await expect(window.locator('body')).toHaveAttribute('data-desktop-saved', 'true');
      await window.evaluate(() => {
        globalThis.__charmletTestEvents = [];
        globalThis.__charmletNativeMoves = [];
        document.addEventListener('mousemove', event => {
          globalThis.__charmletNativeMoves.push({ x: event.clientX, y: event.clientY, target: event.target?.id, buttons: event.buttons });
          if (globalThis.__charmletNativeMoves.length > 24) globalThis.__charmletNativeMoves.shift();
        }, true);
      });
      evidence.before = await diagnostic(application);
      const handles = await application.evaluate(async ({ BrowserWindow }) => {
        const main = BrowserWindow.getAllWindows().find(item => item.webContents.getURL().startsWith('charmlet:'));
        const surface = new BrowserWindow({
          ...main.getBounds(), title: 'Charmlet native input test', frame: false, alwaysOnTop: true,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
        });
        globalThis.__charmletNativeSurface = surface;
        await surface.loadURL(`data:text/html,${encodeURIComponent('<title>Charmlet native input test</title><style>body{background:#293c55;color:white;font:16px system-ui}p{position:absolute;bottom:20px}</style><p>Owned native test surface</p><script>window.clicks=0;document.addEventListener("click",()=>window.clicks++);</script>')}`);
        surface.show();
        surface.focus();
        main.setAlwaysOnTop(false);
        main.setAlwaysOnTop(true);
        main.showInactive();
        return { main: main.getNativeWindowHandle().readBigUInt64LE().toString(), surface: surface.getNativeWindowHandle().readBigUInt64LE().toString() };
      });
      const canvas = await window.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      evidence.canvas = canvas;
      const center = id => window.locator(`#${id}`).evaluate(node => {
        const box = node.getBoundingClientRect();
        return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
      });
      const mouse = async (action, start, end = start) => {
        const { stdout } = await promisify(execFile)('powershell.exe', [
          '-NoProfile', '-File', join(root, 'test', 'native-input.ps1'), '-Action', action,
          '-StartX', String(start.x), '-StartY', String(start.y), '-EndX', String(end.x), '-EndY', String(end.y),
          '-WindowHandle', handles.main, '-SurfaceHandle', handles.surface,
          '-CanvasWidth', String(canvas.width), '-CanvasHeight', String(canvas.height),
        ], { timeout: 10000, windowsHide: true });
        evidence.actions.push(JSON.parse(stdout));
      };
      const surfaceState = () => application.evaluate(async () => ({
        clicks: await globalThis.__charmletNativeSurface.webContents.executeJavaScript('window.clicks'),
        focused: globalThis.__charmletNativeSurface.isFocused(),
      }));
      console.log('Native Windows input: Move and saved placement.');
      await mouse('hover', await center('charm'));
      await expect(window.locator('body')).toHaveAttribute('data-desktop-reveal', 'true');
      const grip = await center('desktop-move');
      const expected = { x: evidence.before.anchor.x + 120, y: evidence.before.anchor.y + 70 };
      await mouse('drag', grip, { x: grip.x + 120, y: grip.y + 70 });
      await expect.poll(async () => {
        const anchor = (await diagnostic(application)).anchor;
        return Math.max(Math.abs(anchor.x - expected.x), Math.abs(anchor.y - expected.y));
      }).toBeLessThanOrEqual(1);
      evidence.moved = (await diagnostic(application)).anchor;
      await expect.poll(() => JSON.parse(readFileSync(join(profile, 'anchor', 'preferences.json'), 'utf8'))).toEqual(evidence.moved);
      assert.equal((await diagnostic(application)).focusable, true, 'Explicit controls may take focus.');
      console.log('Native Windows input: click-through to the owned background.');
      const beforeClick = await surfaceState();
      await mouse('click', { x: canvas.width - 20, y: canvas.height - 20 });
      await expect.poll(surfaceState).toEqual({ clicks: beforeClick.clicks + 1, focused: true });
      await expect.poll(async () => (await diagnostic(application)).focusable).toBe(false);
      evidence.clickThrough = await surfaceState();
      console.log('Native Windows input: long pull, bounce and settle without taking focus.');
      const origin = await center('charm');
      const target = { x: origin.x, y: canvas.height - 90 };
      let recording = true;
      const sampling = (async () => {
        while (recording) {
          evidence.samples.push(await window.evaluate(() => ({
            at: performance.now(), y: Number(document.getElementById('charm').dataset.positionY),
            phase: document.getElementById('phase').textContent,
          })));
          await delay(60);
        }
      })();
      try {
        await mouse('drag', origin, target);
        await expect(window.locator('#phase')).toHaveText('Parked', { timeout: 10000 });
      } finally { recording = false; await sampling; }
      assert.ok(evidence.samples.some(sample => sample.phase === 'Held' && sample.y > origin.y + Math.min(300, target.y - origin.y - 25)));
      assert.ok(evidence.samples.some(sample => sample.phase === 'Swinging'));
      assert.ok(Math.abs(Number(await window.locator('#charm').getAttribute('data-position-y')) - origin.y) < 3);
      assert.equal((await diagnostic(application)).focusable, false);
      assert.equal((await surfaceState()).focused, true);
      evidence.passed = true;
    } finally {
      evidence.host = await diagnostic(application);
      evidence.events = await window.evaluate(() => globalThis.__charmletTestEvents);
      evidence.moves = await window.evaluate(() => globalThis.__charmletNativeMoves);
      writeFileSync(join(output, 'desktop-native.json'), JSON.stringify(evidence, null, 2));
      await application.evaluate(() => {
        globalThis.__charmletNativeSurface?.destroy();
        delete globalThis.__charmletNativeSurface;
      });
    }
  }
  context.after(async () => {
    for (const application of applications) {
      try {
        const window = await application.firstWindow();
        await window.screenshot({ path: join(output, 'desktop-last-state.png') });
        writeFileSync(join(output, 'desktop-last-state.json'), JSON.stringify({
          host: await diagnostic(application),
          renderer: await window.evaluate(() => ({
            events: globalThis.__charmletTestEvents,
            companionPersisted: document.getElementById('stage')?.dataset.companionPersisted,
            focused: document.activeElement?.id,
            feedback: document.getElementById('companion-feedback')?.textContent,
            reveal: { text: document.getElementById('reveal-answer')?.textContent,
              disabled: document.getElementById('reveal-answer')?.disabled },
          })),
        }, null, 2));
      } catch { /* A closed window must not prevent owned-process cleanup. */ }
    }
    await Promise.all([...applications].map(application => quit(application)));
    const logs = join(profile, 'logs');
    if (existsSync(logs)) cpSync(logs, join(output, 'logs'), { recursive: true });
  });

  let first = await launch();
  const { application, window } = first;
  const start = await diagnostic(application);
  await expect(window.locator('#app-version')).toHaveText(`v${manifest.version}`);
  await expect(window.locator('#primary-nav > button')).toHaveCount(5);
  await expect(window.locator('#primary-nav')).toBeHidden();
  await expect(window.locator('#message-card')).toBeHidden();
  await expect(window.locator('.app-footer')).toBeHidden();
  await expect(window.locator('.readout')).toBeHidden();
  await expect(window.locator('.identity')).toBeHidden();
  assert.deepEqual(start.desktopView, { background: false, toolbarPinned: false, messagesPinned: false });
  assert.equal(start.geometry.frame.height, 300, 'The controls remain compact.');
  assert.deepEqual(start.anchor, { x: 210, y: 80 }, 'The older window position migrates to a peg position.');
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
  await window.locator('#charm').hover();
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(false);
  await window.mouse.move(1, start.bounds.height - 1);
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(true);

  const restingCharm = await window.locator('#charm').boundingBox();
  const grab = { x: restingCharm.x + restingCharm.width / 2, y: restingCharm.y + restingCharm.height / 2 };
  const targetY = Math.min(start.bounds.height - 90, grab.y + 500);
  await window.mouse.move(grab.x, grab.y);
  await window.mouse.down();
  try {
    await window.mouse.move(grab.x, targetY, { steps: 15 });
    await expect(window.locator('#phase')).toHaveText('Held');
    await expect.poll(async () => Number(await window.locator('#charm').getAttribute('data-position-y')))
      .toBeGreaterThan(Math.min(grab.y + 300, targetY - 20));
    assert.equal(Number(await window.locator('#stage').getAttribute('data-anchor-y')), start.geometry.anchor.y);
  } finally { await window.mouse.up(); }
  await expect(window.locator('#charm')).not.toHaveClass(/dragging/);
  await expect.poll(async () => Math.abs(Number(await window.locator('#charm').getAttribute('data-position-y')) - grab.y)).toBeLessThan(2);
  const targetX = Math.min(start.bounds.width - 90, grab.x + 500);
  await window.mouse.move(grab.x, grab.y);
  await window.mouse.down();
  try {
    await window.mouse.move(targetX, grab.y + 60, { steps: 15 });
    await expect.poll(async () => Number(await window.locator('#charm').getAttribute('data-position-x')))
      .toBeGreaterThan(Math.min(grab.x + 300, targetX - 20));
  } finally { await window.mouse.up(); }
  await expect(window.locator('#charm')).not.toHaveClass(/dragging/);

  await openTools(window);
  await window.getByRole('button', { name: 'Move Charmlet', exact: true }).press('Shift+ArrowRight');
  await window.getByRole('button', { name: 'Move Charmlet', exact: true }).press('Shift+ArrowDown');
  await expect.poll(async () => (await diagnostic(application)).anchor).toEqual({ x: start.anchor.x + 20, y: start.anchor.y + 20 });
  const moved = (await diagnostic(application)).anchor;
  const anchorPath = join(profile, 'anchor', 'preferences.json');
  await expect.poll(() => existsSync(anchorPath) ? JSON.parse(readFileSync(anchorPath, 'utf8')) : undefined).toEqual(moved);
  await window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await expect.poll(async () => (await diagnostic(application)).geometry.frame.height).toBe(620);
  await window.locator('#desktop-background').click();
  await expect(window.locator('body')).toHaveAttribute('data-desktop-saved', 'true');
  await window.locator('#menu-close').click();
  await expect(window.locator('#primary-nav')).toBeHidden();
  await expect.poll(async () => (await diagnostic(application)).anchor).toEqual(moved);
  await expect(window.locator('body')).toHaveAttribute('data-desktop-background', 'true');
  await window.screenshot({ path: join(output, 'desktop-soft-background.png') });
  await openTools(window);
  await window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await window.locator('#desktop-pin-toolbar').click();
  await window.locator('#desktop-pin-messages').click();
  await expect(window.locator('body')).toHaveAttribute('data-desktop-saved', 'true');
  await window.locator('#menu-close').click();
  await expect(window.locator('#primary-nav')).toBeVisible();
  await expect(window.locator('#message-card')).toBeVisible();
  await expect.poll(async () => (await diagnostic(application)).geometry.frame.height).toBe(420);
  const savedDisplay = JSON.parse(readFileSync(join(profile, 'desktop-view', 'preferences.json'), 'utf8'));
  assert.deepEqual(savedDisplay, { background: true, toolbarPinned: true, messagesPinned: true });

  const gardenBeforeTrial = JSON.parse(readFileSync(companionPath, 'utf8')).garden;
  await expect(window.locator('#charm-select option[value^="trial:"]')).toHaveCount(trial.length);
  for (const key of ['starter-drishti', 'new-smiley-happy', 'new-drishti-guardian', 'new-earth']) {
    const entry = trial.find(charm => charm.artworkKey === key);
    assert.ok(entry);
    await window.getByRole('button', { name: 'Browse charms', exact: true }).click();
    await window.locator('#charm-search').fill(entry.name);
    await window.getByRole('button', { name: `Select ${entry.name}`, exact: true }).click();
    await expect(window.locator('#stage')).toHaveAttribute('data-charm', entry.id);
    await window.locator('#charm-image').evaluate(image => image.decode());
    assert.equal(await window.locator('#charm-image').evaluate(image => image.naturalWidth), 216);
    await expect(window.locator('#charm-image')).toHaveAttribute('src', new RegExp(`${entry.file.replace('.', '\\.')}$`));
    await expect(window.locator('#stage')).toHaveAttribute('data-persisted', 'true');
    await expect(window.locator('#charm')).toHaveAttribute('data-soft', String(key === 'new-smiley-happy'));
  }
  await window.screenshot({ path: join(output, 'desktop-trial-earth.png') });
  assert.deepEqual(JSON.parse(readFileSync(companionPath, 'utf8')).garden, gardenBeforeTrial);
  await window.getByRole('button', { name: 'Browse charms', exact: true }).click();
  await window.locator('#charm-groups').getByRole('button', { name: 'Grown by you', exact: true }).click();
  await window.locator('#charm-search').fill('Hibiscus');
  await window.getByRole('button', { name: 'Select Hibiscus', exact: true }).click();
  await expect(window.locator('#stage')).toHaveAttribute('data-charm', 'garden:hibiscus');
  await expect(window.locator('#stage')).toHaveAttribute('data-persisted', 'true');

  await window.getByRole('button', { name: 'Focus', exact: true }).click();
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
  await expect(window.locator('body')).toHaveAttribute('data-desktop-pinned-toolbar', 'true');
  await window.getByRole('button', { name: 'Focus', exact: true }).click();
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
  assert.deepEqual(restarted.desktopView, savedDisplay);
  assert.deepEqual(restarted.anchor, moved, 'Open panels must not change the saved peg position.');
  await second.window.evaluate(() => globalThis.acquireVsCodeApi().postMessage({ type: 'desktop-hit-test', ignore: false }));
  await expect.poll(async () => (await diagnostic(second.application)).ignored, { timeout: 5000 }).toBe(false);
  await second.window.getByRole('button', { name: 'Focus', exact: true }).click();
  await second.window.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).focus.status, { timeout: 5000 }).toBe('idle');
  await second.window.getByRole('tab', { name: 'Learn', exact: true }).click();
  await second.window.locator('#companion-close').click();
  await second.window.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).learning.revealed, { timeout: 5000 }).toBe(true);
  assert.ok((await second.window.locator('#message-answer').textContent())?.includes('commit'));
  if (nativeInput) await verifyNativeInput(second.application, second.window);
  console.log(JSON.stringify({
    mode, profile: realpathSync(profile), startupFocusable: start.focusable, security: start.webPreferences,
    activeCharm: restarted.state.charmId, pausedRemainder: paused, placement: restarted.bounds,
    clickThroughProof: nativeInput ? 'native Windows input reached the owned underlying window; see desktop-native.json'
      : 'validated restricted IPC and BrowserWindow ignored-state configuration; native OS click-through remains manual',
  }));
  await quit(second.application);
});
