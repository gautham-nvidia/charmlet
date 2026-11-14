import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
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
const winsToday = (wins, now) => {
  const date = new Date(now);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return wins.day === day ? wins.today : 0;
};
const packaged = process.argv.includes('--packaged');
const nativeInput = process.env.CHARMLET_DESKTOP_NATIVE_INPUT === '1';
if (nativeInput && (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true')) {
  throw new Error('Native pointer checks require the isolated Windows CI desktop.');
}
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const trial = JSON.parse(readFileSync(join(repo, 'extension', 'src', 'trial-charms.json'), 'utf8'));
const beta = JSON.parse(readFileSync(join(repo, 'extension', 'src', 'beta-catalogue.json'), 'utf8'));
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
      const startup = await diagnostic(application);
      assert.equal(startup.measuredWindowState.alwaysOnTop, true, 'Every fresh desktop launch must be topmost.');
      await window.evaluate(() => {
        globalThis.__charmletTestEvents = [];
        const record = value => {
          globalThis.__charmletTestEvents.push(value);
          if (globalThis.__charmletTestEvents.length > 90) globalThis.__charmletTestEvents.shift();
        };
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'click']) {
          document.addEventListener(type, event => record({
            type, target: event.target?.id, x: event.clientX, y: event.clientY,
            buttons: event.buttons, time: event.timeStamp,
            pointerType: event.pointerType,
            phase: document.getElementById('phase')?.textContent,
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
          ...main.getBounds(), title: 'Charmlet native input test', frame: false,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
        });
        globalThis.__charmletNativeSurface = surface;
        await surface.loadURL(`data:text/html,${encodeURIComponent('<title>Charmlet native input test</title><style>body{background:#293c55;color:white;font:16px system-ui}p{position:absolute;bottom:20px}</style><p>Owned native test surface</p><script>window.clicks=0;document.addEventListener("click",()=>window.clicks++);</script>')}`);
        surface.show();
        surface.focus();
        main.showInactive();
        main.moveTop();
        return { main: main.getNativeWindowHandle().readBigUInt64LE().toString(), surface: surface.getNativeWindowHandle().readBigUInt64LE().toString() };
      });
      evidence.handles = handles;
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
        // Include PowerShell startup and Add-Type compilation on a cold runner.
        // The gesture and its position/focus assertions keep their own bounds.
        ], { timeout: 30000, windowsHide: true });
        evidence.actions.push(JSON.parse(stdout));
      };
      const surfaceState = () => application.evaluate(async () => ({
        clicks: await globalThis.__charmletNativeSurface.webContents.executeJavaScript('window.clicks'),
        focused: globalThis.__charmletNativeSurface.isFocused(),
      }));
      console.log('Native Windows input: Move and saved placement.');
      await mouse('hover', await center('charm'));
      await expect(window.locator('body')).toHaveAttribute('data-desktop-reveal', 'true');
      assert.equal(evidence.actions.at(-1).target, handles.main, 'The native charm target must be above the background test window.');
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
          nativeCursor: await application.evaluate(({ screen }) => screen.getCursorScreenPoint()),
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
  await expect(window.locator('#primary-nav > button:not([hidden])')).toHaveCount(5);
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
  assert.equal(await window.locator('#charm-image').evaluate(image => image.naturalWidth), 216);
  await window.locator('#charm').hover();
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(false);
  await window.mouse.move(1, start.bounds.height - 1);
  await expect.poll(async () => (await diagnostic(application)).ignored, { timeout: 5000 }).toBe(true);

  const restingCharm = await window.locator('#charm').boundingBox();
  const grab = { x: restingCharm.x + restingCharm.width / 2, y: restingCharm.y + restingCharm.height / 2 };
  const targetY = Math.min(start.bounds.height - 90, grab.y + 500);
  // A real, unheld mouse move can cancel Chromium's simulated mouse capture on
  // a developer's desktop. Use a separate touch pointer for these geometry
  // checks; verifyNativeWindowsInput still tests real mouse input, unfiltered.
  const touchSession = await window.context().newCDPSession(window);
  await touchSession.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const touch = (type, point) => touchSession.send('Input.dispatchTouchEvent', {
    type, touchPoints: point ? [{ x: point.x, y: point.y, id: 1, radiusX: 1, radiusY: 1, force: 1 }] : [],
  });
  const moveTouch = async target => {
    for (let step = 1; step <= 15; step++) {
      await touch('touchMove', { x: grab.x + (target.x - grab.x) * step / 15, y: grab.y + (target.y - grab.y) * step / 15 });
    }
  };
  await window.locator('#charm').hover();
  await expect.poll(async () => (await diagnostic(application)).ignored).toBe(false);
  await touch('touchStart', grab);
  try {
    await moveTouch({ x: grab.x, y: targetY });
    await expect(window.locator('#phase')).toHaveText('Held');
    await expect.poll(async () => Number(await window.locator('#charm').getAttribute('data-position-y')))
      .toBeGreaterThan(Math.min(grab.y + 300, targetY - 20));
    assert.equal(Number(await window.locator('#stage').getAttribute('data-anchor-y')), start.geometry.anchor.y);
  } finally { await touch('touchEnd'); }
  await expect(window.locator('#charm')).not.toHaveClass(/dragging/);
  await expect.poll(async () => Math.abs(Number(await window.locator('#charm').getAttribute('data-position-y')) - grab.y)).toBeLessThan(2);
  const targetX = Math.min(start.bounds.width - 90, grab.x + 500);
  await window.locator('#charm').hover();
  await expect.poll(async () => (await diagnostic(application)).ignored).toBe(false);
  await touch('touchStart', grab);
  try {
    await moveTouch({ x: targetX, y: grab.y + 60 });
    await expect.poll(async () => Number(await window.locator('#charm').getAttribute('data-position-x')))
      .toBeGreaterThan(Math.min(grab.x + 300, targetX - 20));
  } finally {
    await touch('touchEnd');
    await touchSession.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await touchSession.detach();
  }
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
  await expect(window.locator('#charm-select option[value^="trial:"]')).toHaveCount(beta.filter(id => id.startsWith('trial:')).length);
  await expect(window.locator('#charm-select option[value^="trial:athlete-"]')).toHaveCount(0);
  for (const key of ['starter-drishti', 'new-smiley-happy', 'new-drishti-guardian',
    'new-us-san-francisco-skyline', 'new-cupertino-loop', 'new-earth']) {
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
  await second.window.getByRole('button', { name: 'Focus', exact: true }).hover();
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

  console.log('Desktop personalization: saved cord choices, a quiet win, and a local cropped photo.');
  const personal = second.window;
  await openTools(personal);
  await personal.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await personal.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await personal.locator('#charm-select').selectOption('trial:new-ruby');
  await expect(personal.locator('#cord')).toHaveAttribute('data-style', 'gold-chain');
  await personal.locator('#cord-style').selectOption('silver-chain');
  await expect(personal.locator('#stage')).toHaveAttribute('data-persisted', 'true');
  await personal.locator('#charm-select').selectOption('trial:new-smiley-happy');
  await expect(personal.locator('#cord')).toHaveAttribute('data-style', 'soft');
  await personal.locator('#charm-select').selectOption('trial:new-ruby');
  await expect(personal.locator('#cord')).toHaveAttribute('data-style', 'silver-chain');
  // Also exercise Reduced Motion in the opt-in celebration.
  if (await personal.locator('#motion').getAttribute('aria-checked') === 'true') await personal.locator('#motion').click();
  await personal.locator('#settings-close').click();
  await openTools(personal);
  await personal.getByRole('button', { name: 'Focus', exact: true }).click();
  await personal.locator('#small-wins summary').click();
  await personal.locator('#wins-celebrate').check();
  await expect(personal.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true');
  await personal.locator('#win-label').fill('Finished a small test');
  await personal.locator('#win-add').click();
  await expect(personal.locator('.win-sparkles')).toHaveAttribute('data-still', 'true');
  await expect.poll(async () => {
    const wins = JSON.parse(readFileSync(companionPath, 'utf8')).wins;
    return wins.total === 1 && await personal.locator('#win-count').innerText() === `${winsToday(wins, Date.now())} today`;
  }).toBe(true);
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).wins.total).toBe(1);
  await personal.locator('#companion-close').click();
  await openTools(personal);
  await personal.getByRole('button', { name: 'Browse charms', exact: true }).click();
  await personal.locator('#picker-photo').click();
  await expect(personal.locator('#photo-editor')).toBeVisible();
  const photoRequests = [];
  const observePhoto = request => { if (/^https?:/.test(request.url())) photoRequests.push(request.url()); };
  personal.on('request', observePhoto);
  await personal.locator('#photo-file').focus();
  await personal.locator('#photo-file').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('This is not an image.') });
  await expect(personal.locator('#photo-feedback')).toContainText('header');
  await expect(personal.locator('#photo-save')).toBeDisabled();
  await expect(personal.locator('#photo-file')).toBeFocused();
  const { PNG: PhotoPNG } = require(join(repo, 'extension/node_modules/pngjs'));
  const fixture = new PhotoPNG({ width: 400, height: 200 });
  for (let y = 0; y < fixture.height; y++) for (let x = 0; x < fixture.width; x++) {
    const offset = (y * fixture.width + x) * 4;
    fixture.data[offset] = x < 200 ? 255 : 0;
    fixture.data[offset + 1] = 0;
    fixture.data[offset + 2] = x < 200 ? 0 : 255;
    fixture.data[offset + 3] = 255;
  }
  await personal.locator('#photo-file').setInputFiles({
    name: 'private-fixture.png', mimeType: 'image/png', buffer: PhotoPNG.sync.write(fixture),
  });
  await expect(personal.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'true');
  await expect(personal.locator('#photo-file')).toBeFocused();
  await personal.locator('#photo-preview').click({ position: { x: 6, y: 6 } });
  await personal.keyboard.press('Escape');
  await expect(personal.locator('#photo-editor')).toBeHidden();
  await expect(personal.locator('#stage')).toHaveAttribute('data-charm', 'trial:new-ruby');
  assert.equal(existsSync(join(profile, 'packs')) ? readdirSync(join(profile, 'packs')).filter(file => file.startsWith('photo-')).length : 0, 0,
    'Cancelling a preview must not write a photo.');
  await openTools(personal);
  await personal.getByRole('button', { name: 'Browse charms', exact: true }).click();
  await personal.locator('#picker-photo').click();
  await expect(personal.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'false');
  await personal.locator('#photo-file').setInputFiles({
    name: 'private-fixture.png', mimeType: 'image/png', buffer: PhotoPNG.sync.write(fixture),
  });
  await expect(personal.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'true');
  await personal.getByRole('button', { name: 'Hide controls', exact: true }).click();
  await expect(personal.locator('#photo-editor')).toBeHidden();
  assert.equal(existsSync(join(profile, 'packs')) ? readdirSync(join(profile, 'packs')).filter(file => file.startsWith('photo-')).length : 0, 0);
  await openTools(personal);
  await personal.getByRole('button', { name: 'Browse charms', exact: true }).click();
  await personal.locator('#picker-photo').click();
  await expect(personal.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'false');
  await personal.locator('#photo-file').setInputFiles({
    name: 'private-fixture.png', mimeType: 'image/png', buffer: PhotoPNG.sync.write(fixture),
  });
  await expect(personal.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'true');
  await personal.locator('#photo-x').press('End');
  assert.deepEqual(await personal.locator('#photo-canvas').evaluate(canvas =>
    [...canvas.getContext('2d').getImageData(108, 147, 1, 1).data]), [0, 0, 255, 255], 'The crop must show the chosen side of the source.');
  await personal.locator('#photo-name').fill('Local photo test');
  await personal.locator('#photo-save').click();
  await expect(personal.locator('#photo-editor')).toBeHidden();
  const savedPhoto = await personal.locator('#stage').getAttribute('data-charm');
  assert.match(savedPhoto, /^pack:photo-[a-z0-9-]+:portrait$/);
  await personal.locator('#charm-image').evaluate(image => image.decode());
  assert.equal(await personal.locator('#charm-image').evaluate(image => image.naturalWidth), 216);
  assert.deepEqual(photoRequests, [], 'Native photo creation must make no HTTP requests.');
  personal.off('request', observePhoto);
  const storedPhoto = JSON.parse(readFileSync(join(profile, 'packs', `${savedPhoto.split(':')[1]}.charmlet.json`), 'utf8'));
  assert.equal(storedPhoto.charms[0].name, 'Local photo test');
  assert.ok(Buffer.from(storedPhoto.charms[0].png, 'base64').length < 256 * 1024);
  assert.equal(JSON.stringify(storedPhoto).includes('private-fixture'), false, 'Do not persist the original filename.');
  await personal.screenshot({ path: join(output, 'desktop-photo-charm.png') });
  console.log(JSON.stringify({
    mode, profile: realpathSync(profile), startupFocusable: start.focusable, security: start.webPreferences,
    activeCharm: restarted.state.charmId, pausedRemainder: paused, placement: restarted.bounds,
    clickThroughProof: nativeInput ? 'native Windows input reached the owned underlying window; see desktop-native.json'
      : 'validated restricted IPC and BrowserWindow ignored-state configuration; native OS click-through remains manual',
  }));
  await quit(second.application);
  const third = await launch();
  await expect(third.window.locator('#stage')).toHaveAttribute('data-charm', savedPhoto);
  assert.equal((await diagnostic(third.application)).companion.state.wins.total, 1);
  await expect(third.window.locator('.win-sparkles')).toHaveCount(0);
  assert.equal(JSON.parse(readFileSync(preferencesPath, 'utf8')).cordChoices['trial:new-ruby'], 'silver-chain');
  assert.deepEqual(JSON.parse(readFileSync(companionPath, 'utf8')).garden, gardenBeforeTrial);
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Photo charms', exact: true }).click();
  await third.window.getByRole('button', { name: 'Remove Local photo test', exact: true }).click();
  await third.window.locator('#photo-remove-yes').click();
  await expect(third.window.locator('#stage')).toHaveAttribute('data-charm', 'terminal');
  await expect(third.window.locator('#photo-list')).toContainText('Your saved photo charms will appear here');
  assert.equal(existsSync(join(profile, 'packs', `${savedPhoto.split(':')[1]}.charmlet.json`)), false);
  await third.window.locator('#photo-close').click();
  await openTools(third.window);
  await third.window.emulateMedia({ reducedMotion: 'no-preference' });
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await third.window.locator('#charm-select').selectOption('live:smiley');
  if (await third.window.locator('#motion').getAttribute('aria-checked') === 'false') await third.window.locator('#motion').click();
  await third.window.locator('#settings-close').click();
  const face = third.window.locator('#live-smiley');
  await expect(face).toBeVisible();
  await expect(face).toHaveAttribute('data-renderer', /^(webgl|canvas)$/);
  await expect(face).toHaveAttribute('data-motion', 'live');
  const liveFrames = Number(await face.getAttribute('data-frames'));
  await expect.poll(async () => Number(await face.getAttribute('data-frames'))).toBeGreaterThan(liveFrames);
  await third.window.locator('#charm').focus();
  await third.window.keyboard.down('Space');
  try { await expect(face).toHaveAttribute('data-expression', 'squish'); }
  finally { await third.window.keyboard.up('Space'); }
  await expect(face).not.toHaveAttribute('data-expression', 'squish');
  const orbBounds = await third.window.locator('#charm').boundingBox();
  await third.window.mouse.move(orbBounds.x - 65, orbBounds.y + orbBounds.height / 2);
  await expect.poll(async () => Number(await face.getAttribute('data-gaze-x'))).toBeLessThan(-.1);
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Focus', exact: true }).click();
  await third.window.locator('#small-wins summary').click();
  await third.window.locator('#win-label').fill('A second small step');
  await third.window.locator('#win-add').click();
  await expect(face).toHaveAttribute('data-expression', 'happy');
  await expect.poll(async () => {
    const wins = JSON.parse(readFileSync(companionPath, 'utf8')).wins;
    return wins.total === 2 && await third.window.locator('#win-count').innerText() === `${winsToday(wins, Date.now())} today`;
  }).toBe(true);
  await third.window.locator('#companion-close').click();
  await expect(face).toHaveAttribute('data-expression', 'smile');
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  // Start a greeting and change motion in the same task. This reproduces the
  // unfinished hover reaction that otherwise depends on native cursor timing.
  const priorExpression = await third.window.evaluate(() => {
    document.querySelector('#charm').dispatchEvent(new Event('pointerenter'));
    const expression = document.querySelector('#live-smiley').dataset.expression;
    document.querySelector('#motion').click();
    return expression;
  });
  assert.equal(priorExpression, 'hello');
  await expect(face).toHaveAttribute('data-motion', 'still');
  await expect(face).toHaveAttribute('data-expression', 'smile');
  await third.window.locator('#settings-close').click();
  await third.window.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const stillFrames = await face.getAttribute('data-frames');
  // Closing desktop controls returns focus to the underlying window. That blur
  // must not repaint an already centred, still face.
  await third.window.evaluate(() => window.dispatchEvent(new Event('blur')));
  await delay(600);
  assert.equal(await face.getAttribute('data-frames'), stillFrames, 'Reduced Motion must stay idle when focus leaves the app.');
  await third.window.locator('#charm').screenshot({ path: join(output, 'sunny-live.png') });
  if (await face.getAttribute('data-renderer') === 'webgl') {
    await face.evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await expect(face).toHaveAttribute('data-renderer', 'canvas');
    await expect(face).toBeVisible();
    await third.window.locator('#charm').screenshot({ path: join(output, 'sunny-fallback.png') });
  }
  console.log('Desktop live collection: cloud, robot, bubble presses, spinner friction and quiet motion.');
  const selectInteractive = async id => {
    await openTools(third.window);
    await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
    await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
    await third.window.locator('#charm-select').selectOption(id);
    await third.window.locator('#settings-close').click();
    await expect(third.window.locator('#stage')).toHaveAttribute('data-persisted', 'true');
  };
  for (const [id, character] of [['live:cloud', 'cloud'], ['live:robot', 'robot']]) {
    await selectInteractive(id);
    await expect(face).toHaveAttribute('data-character', character);
    await expect(face).toHaveAttribute('data-art-ready', `${character}:`);
    await expect(face).toHaveAttribute('data-art-error', '');
    await expect(face).toBeVisible();
    await third.window.locator('#charm').focus();
    await third.window.keyboard.down('Space');
    try {
      await expect(face).toHaveAttribute('data-expression', 'squish');
      await expect(third.window.locator('#charm-image')).toHaveCSS('transition-duration', '0s');
    }
    finally { await third.window.keyboard.up('Space'); }
    await expect(face).toHaveAttribute('data-expression', 'smile');
    await third.window.locator('#charm').screenshot({ path: join(output, `live-${character}.png`) });
    const reactions = new Set(), pictures = new Set();
    for (let index = 0; index < 3; index++) {
      await third.window.locator('#charm').focus();
      await third.window.keyboard.press('Enter');
      await expect(face).toHaveAttribute('data-expression', character === 'cloud'
        ? /^(sunrise|rain|lightning)$/ : /^(binary|compile|cursor)$/);
      const expression = await face.getAttribute('data-expression');
      reactions.add(expression); pictures.add(await face.evaluate(canvas => canvas.toDataURL()));
      await third.window.locator('#charm').screenshot({ path: join(output, `live-${character}-${expression}.png`) });
    }
    assert.deepEqual([...reactions].sort(), character === 'cloud'
      ? ['lightning', 'rain', 'sunrise'] : ['binary', 'compile', 'cursor']);
    assert.equal(pictures.size, 3);
  }
  await selectInteractive('fidget:bubbles');
  const toy = third.window.locator('#live-fidget');
  await third.window.locator('#charm').click({ position: { x: 22, y: 33 } });
  await expect(toy).toHaveAttribute('data-bubbles', '100000');
  await third.window.locator('#charm').click({ position: { x: 22, y: 33 } });
  await expect(toy).toHaveAttribute('data-bubbles', '000000');
  await third.window.locator('#charm').focus();
  await third.window.keyboard.press('Space');
  await expect(toy).toHaveAttribute('data-bubbles', '010000');
  await third.window.locator('#charm').screenshot({ path: join(output, 'bubble-pop.png') });
  await selectInteractive('fidget:stone');
  await third.window.locator('#charm').focus();
  await third.window.keyboard.down('Space');
  try { await expect(toy).toHaveAttribute('data-held', 'true'); }
  finally { await third.window.keyboard.up('Space'); }
  await expect(toy).toHaveAttribute('data-held', 'false');
  await third.window.locator('#charm').screenshot({ path: join(output, 'worry-stone.png') });
  await selectInteractive('fidget:spinner');
  await third.window.locator('#charm').focus();
  await third.window.keyboard.press('Space');
  await expect(toy).toHaveAttribute('data-running', 'false');
  assert.ok(Number(await toy.getAttribute('data-angle')) > .5);
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await third.window.locator('#motion').click();
  await third.window.locator('#settings-close').click();
  await third.window.locator('#charm').click();
  await expect(toy).toHaveAttribute('data-running', 'true');
  const spinningAngle = await toy.getAttribute('data-angle');
  await expect.poll(() => toy.getAttribute('data-angle')).not.toBe(spinningAngle);
  await expect(toy).toHaveAttribute('data-running', 'false', { timeout: 8000 });
  await expect(toy).toHaveAttribute('data-velocity', '0.000');
  await third.window.locator('#charm').screenshot({ path: join(output, 'fidget-spinner.png') });
  console.log('Desktop Cali: optional personal encouragement, confetti, pets and saved quiet preferences.');
  await selectInteractive('live:cali');
  await expect(face).toHaveAttribute('data-character', 'cali');
  await expect(face).toHaveAttribute('data-art-ready', /^cali:/);
  await expect(face).toBeVisible();
  await third.window.locator('#charm').click();
  await expect(third.window.locator('#mascot-bubble')).toBeVisible();
  await expect(third.window.locator('#mascot-bubble')).toHaveCSS('pointer-events', 'none');
  await third.window.locator('#charm').screenshot({ path: join(output, 'live-cali.png') });
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Focus', exact: true }).click();
  await third.window.locator('#mascot-settings summary').click();
  await third.window.locator('#mascot-name').fill('River');
  await third.window.locator('#mascot-save').click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).mascot.name).toBe('River');
  await third.window.locator('#wins-celebrate').check();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).wins.celebrate).toBe(true);
  await third.window.locator('#win-label').fill('Another step worth keeping');
  await third.window.locator('#win-add').click();
  await expect(third.window.locator('.win-sparkles[data-kind="confetti"][data-still="false"]')).toHaveCount(1);
  await third.window.locator('#companion-close').click();
  await expect(third.window.locator('#mascot-words')).toContainText('River: That small win counts');
  await third.window.locator('#app').screenshot({ path: join(output, 'desktop-cali-encouragement.png') });
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Focus', exact: true }).click();
  await third.window.locator('#mascot-enabled').uncheck();
  await third.window.locator('#mascot-nudges').uncheck();
  await third.window.locator('#mascot-save').click();
  await expect.poll(() => JSON.parse(readFileSync(companionPath, 'utf8')).mascot)
    .toEqual({ enabled: false, focusNudges: false, name: 'River' });
  await third.window.locator('#companion-close').click();
  await expect(third.window.locator('#mascot-bubble')).toBeHidden();
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await third.window.locator('#motion').click();
  await third.window.locator('#settings-close').click();
  await expect(face).toHaveAttribute('data-motion', 'still');
  const pets = ['giant-panda', 'golden-retriever', 'labrador', 'german-shepherd', 'husky', 'corgi', 'beagle', 'goldendoodle', 'silver-tabby', 'tuxedo-cat'];
  for (const id of pets) {
    await selectInteractive(`trial:new-${id}`);
    await expect(third.window.locator('#stage')).toHaveAttribute('data-charm', `trial:new-${id}`);
    await expect.poll(() => third.window.locator('#charm-image').evaluate(image => image.complete && image.naturalWidth === 216)).toBe(true);
    await expect(face).toBeHidden();
    await third.window.locator('#charm').screenshot({ path: join(output, `pet-${id}.png`) });
  }
  console.log('Desktop California family: eleven rendered companions and saved selections.');
  for (const character of ['redwood', 'yosemite', 'tahoe', 'gull', 'seal', 'golden-gate', 'santa-cruz',
    'whale', 'dolphin', 'condor', 'eagle']) {
    await selectInteractive(`live:${character}`);
    await expect(face).toHaveAttribute('data-art-ready', `${character}:`);
    await expect(face).toBeVisible();
    await expect(third.window.locator('#mascot-bubble')).toBeHidden();
    await third.window.locator('#charm').screenshot({ path: join(output, `california-${character}.png`) });
  }
  await selectInteractive('live:cali');
  await expect(face).toHaveAttribute('data-art-ready', /^cali:/);
  console.log('Desktop playful Cali: tap gestures, attached wiggle, and saved 200 percent size.');
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await third.window.locator('#cali-outfit').selectOption('friday-coast');
  await third.window.locator('#size').focus();
  await third.window.keyboard.press('End');
  await expect(third.window.locator('#size')).toHaveValue('200');
  await third.window.locator('#motion').click();
  await third.window.locator('#settings-close').click();
  await expect(face).toHaveAttribute('data-outfit', 'friday-coast');
  // Returning from the California family starts Cali's own tap sequence again.
  for (const gesture of ['curious', 'wink', 'double-take', 'shimmy']) {
    await third.window.locator('#charm').focus();
    await third.window.keyboard.press('Enter');
    await expect(face).toHaveAttribute('data-expression', gesture);
    await expect(third.window.locator('#charm')).toHaveAttribute('data-tap-motion', 'playing');
    await expect(face).toHaveAttribute('data-expression', 'smile');
  }
  await openTools(third.window);
  await third.window.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await third.window.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await third.window.locator('#motion').click();
  await third.window.locator('#settings-close').click();
  await expect(third.window.locator('#stage')).toHaveAttribute('data-persisted', 'true');
  await expect(face).toHaveAttribute('data-motion', 'still');
  assert.ok(await third.window.locator('#charm').evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return bounds.left >= 0 && bounds.top >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
  }), 'The 200 percent charm must remain inside the desktop.');
  await third.window.locator('#charm').screenshot({ path: join(output, 'cali-200-percent.png') });
  console.log('Desktop puzzles: cube turns, legal tiles, lights, optional panels and saved boards.');
  for (const kind of ['cube', 'tiles', 'lights']) {
    await selectInteractive(`fidget:${kind}`);
    await expect(toy).toHaveAttribute('data-kind', kind);
    await openTools(third.window);
    await third.window.getByRole('button', { name: 'Open puzzle', exact: true }).click();
    await expect(third.window.locator('#puzzle-editor')).toBeVisible();
    await expect(third.window.locator('body')).toHaveAttribute('data-desktop-panel', 'true');
    if (kind === 'cube') {
      await expect(third.window.locator('.cube-net')).toHaveCSS('display', 'grid');
      await third.window.getByRole('button', { name: 'Turn front clockwise', exact: true }).click();
      await expect(third.window.locator('#puzzle-editor')).toHaveAttribute('data-solved', 'false');
      await third.window.locator('#puzzle-undo').click();
      await expect(third.window.locator('#puzzle-editor')).toHaveAttribute('data-solved', 'true');
      await third.window.locator('#puzzle-shuffle').click();
    } else if (kind === 'tiles') {
      await third.window.getByRole('button', { name: 'Move tile 8', exact: true }).click();
      await expect(third.window.locator('#puzzle-editor')).toHaveAttribute('data-solved', 'false');
    } else {
      await third.window.getByRole('button', { name: 'Light row 2, column 2', exact: true }).click();
      await expect(third.window.locator('.puzzle-lights [aria-pressed="true"]')).toHaveCount(5);
    }
    await third.window.locator('#puzzle-editor').screenshot({ path: join(output, `puzzle-${kind}.png`) });
    await third.window.locator('#puzzle-close').click();
    await expect(third.window.locator('#puzzle-editor')).toBeHidden();
    await expect(third.window.locator('#stage')).toHaveAttribute('data-persisted', 'true');
  }
  const savedPuzzles = JSON.parse(readFileSync(preferencesPath, 'utf8')).puzzles;
  assert.equal(savedPuzzles.lights, 186);
  await selectInteractive('live:cali');
  await quit(third.application);
  const fourth = await launch();
  await expect(fourth.window.locator('#stage')).toHaveAttribute('data-charm', 'live:cali');
  await expect(fourth.window.locator('#stage')).toHaveAttribute('data-size', '200');
  assert.equal(JSON.parse(readFileSync(preferencesPath, 'utf8')).size, 200);
  assert.deepEqual(JSON.parse(readFileSync(preferencesPath, 'utf8')).puzzles, savedPuzzles);
  await expect(fourth.window.locator('#live-smiley')).toHaveAttribute('data-outfit', 'friday-coast');
  await expect(fourth.window.locator('#mascot-bubble')).toBeHidden();
  await expect(fourth.window.locator('.win-sparkles')).toHaveCount(0);
  // Native click-through checks explicitly unpin the earlier saved controls.
  // Restart must preserve the choices made by the active scenario.
  await expect(fourth.window.locator('body')).toHaveAttribute('data-desktop-tools', String(!nativeInput));
  await expect(fourth.window.locator('body')).toHaveAttribute('data-desktop-pinned-toolbar', String(!nativeInput));
  assert.deepEqual((await diagnostic(fourth.application)).desktopView,
    { background: !nativeInput, toolbarPinned: !nativeInput, messagesPinned: !nativeInput });
  await openTools(fourth.window);
  await fourth.window.getByRole('button', { name: 'Focus', exact: true }).click();
  await fourth.window.locator('#mascot-settings summary').click();
  await expect(fourth.window.locator('#mascot-name')).toHaveValue('River');
  await expect(fourth.window.locator('#mascot-enabled')).not.toBeChecked();
  await expect(fourth.window.locator('#mascot-nudges')).not.toBeChecked();
  assert.equal(JSON.parse(readFileSync(companionPath, 'utf8')).wins.total, 3);
  assert.equal(JSON.parse(readFileSync(companionPath, 'utf8')).garden.collection[0].id, 'hibiscus');
  await quit(fourth.application);
});
