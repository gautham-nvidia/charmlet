import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateDistribution } from './distribution.mjs';
import { validateLaunch } from './launch.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { chromium, expect } = require('@playwright/test');
const { PNG } = require('pngjs');
const { parseCharmPack } = require('./out/charm-packs.js');
const manifest = JSON.parse(await readFile(join(repo, 'extension/package.json'), 'utf8'));
const data = JSON.parse(await readFile(join(root, 'dist/catalogue.json'), 'utf8'));
const output = join(repo, 'extension/test-results', `website-check-${manifest.version}`);
await mkdir(output, { recursive: true });
const base = process.env.CHARMLET_GALLERY_URL || 'http://127.0.0.1:4173/';
const gallery = new URL('charms.html', base).href;
const counts = { coding: 1, live: 15, stress: 18, music: 12, 'music-icons': 34, california: 12,
  animals: 13, silicon: 15, parks: 7, space: 15, zodiac: 12, gemstones: 8, culture: 25,
  sports: 5, seasonal: 24, flowers: 18 };
assert.equal(data.charms.length, 234);
assert.equal(data.version, manifest.version);
assert.deepEqual(Object.fromEntries(data.collections.map(item => [item.id, item.charmIds.length])), counts);
const marketplace = `https://marketplace.visualstudio.com/items?itemName=${manifest.publisher}.${manifest.name}`;
const openVsx = `https://open-vsx.org/extension/${manifest.publisher}/${manifest.name}`;
assert.deepEqual(validateDistribution({ marketplace, openVsx }, manifest), { marketplace, openVsx });
assert.throws(() => validateDistribution({ marketplace: marketplace.replace('https:', 'http:'), openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: marketplace.replace(manifest.publisher, 'other'), openVsx: null }, manifest));
const desktop = {
  windows: 'https://github.com/gautham-nvidia/charmlet/releases/download/trial-0.12.0/Charmlet-desktop-0.9.0-win32-x64.zip',
  macos: 'https://github.com/gautham-nvidia/charmlet/releases/download/trial-0.12.0/Charmlet-desktop-0.9.0-darwin-arm64.tar.gz',
};
const enabled = validateLaunch({ desktop, shop: { provider: 'shopify', url: 'https://charmlet-test.myshopify.com/' } });
assert.deepEqual(validateLaunch({ desktop: {}, shop: null }), { desktop: { windows: null, macos: null }, shop: null });
assert.throws(() => validateLaunch({ desktop: { windows: desktop.windows.replace('github.com', 'github.com.invalid') } }));
assert.throws(() => validateLaunch({ desktop: { macos: desktop.windows } }));
assert.throws(() => validateLaunch({ shop: { provider: 'shopify', url: 'http://shop.example.test/' } }));
assert.throws(() => validateLaunch({ shop: { provider: 'shopify', url: 'https://user:secret@shop.example.test/' } }));
assert.throws(() => validateLaunch({ secretKey: 'must-not-be-public' }));
for (const provider of ['stripe', 'square']) assert.equal(validateLaunch({ shop: { provider, url: 'https://shop.example.test/' } }).shop.provider, provider);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
async function decodeImages() {
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode()));
    await document.fonts.ready;
  });
}
async function preview(id) {
  if (await page.locator('#preview-dialog').evaluate(dialog => dialog.open)) await page.keyboard.press('Escape');
  const button = page.locator(`.charm-card[data-charm-id="${id}"] .preview-link`);
  await button.click();
  await expect(page.locator('#preview-dialog')).toBeVisible();
  await page.locator('#demo-image').evaluate(image => image.decode());
  return button;
}
async function revealPage() {
  for (const section of await page.locator('[data-reveal]').all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS('opacity', '1');
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
}
try {
  console.log('Checking homepage, installation, downloads and garden.');
  assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
  await expect(page.locator('#demo-name')).toHaveText('Cali');
  await expect(page.locator('#live-smiley')).toHaveAttribute('data-art-ready', /^cali:/);
  await expect(page.locator('.collection-card')).toHaveCount(6);
  assert.equal(await page.locator('a[href="./studio/"]').count(), 0);
  await expect(page.locator('[data-shop-link]').first()).toBeHidden();
  for (const name of ['Sunny', 'Nimbus', 'Byte', 'Cali']) {
    await page.locator(`[data-demo-name="${name}"]`).click();
    await expect(page.locator('#demo-name')).toHaveText(name);
    await expect(page.locator('#live-smiley')).toBeVisible();
  }
  await page.locator('#tab-editor').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-desktop')).toBeFocused();
  await expect(page.locator('#install-desktop')).toBeVisible();
  await expect(page.locator('[data-desktop-download="windows"]')).toBeHidden();
  await expect(page.locator('#desktop-unavailable')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.locator('#install-editor')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.extension-download').click()]);
  const vsix = join(output, 'downloaded.vsix');
  await download.saveAs(vsix);
  assert.ok((await readFile(vsix)).equals(await readFile(join(repo, 'extension', `charmlet-${manifest.version}.vsix`))));
  await page.locator('[data-garden-stage="4"]').click();
  await expect(page.locator('#garden-demo-copy')).toContainText('eleven');
  await page.locator('[data-garden-stage="2"]').click();
  await expect(page.locator('#garden-demo-copy')).toContainText('Missing a day');
  await page.locator('a[href="#garden-help"]').click();
  await expect(page.locator('#garden-help')).toHaveAttribute('open', '');
  await decodeImages(); await revealPage();
  assert.equal(await overflow(), false);
  await page.screenshot({ path: join(output, 'home-desktop.png'), fullPage: true });

  console.log('Checking all collection filters, search, preview focus and retained pack URLs.');
  await page.goto(gallery, { waitUntil: 'networkidle' });
  await expect(page.locator('.charm-card')).toHaveCount(234);
  await expect(page.locator('.charm-card').nth(0)).toHaveAttribute('data-charm-id', 'terminal');
  await expect(page.locator('.charm-card').nth(1)).toHaveAttribute('data-charm-id', 'live:cali');
  for (const collection of data.collections) {
    await page.locator(`[data-group="${collection.id}"]`).click();
    await expect(page.locator('.charm-card')).toHaveCount(counts[collection.id]);
    await expect(page.locator('#collection-story')).toContainText(collection.name);
  }
  await page.locator('[data-group="music-icons"]').click();
  await page.locator('#search').fill('beyonce');
  await expect(page.locator('.charm-card')).toHaveCount(1);
  await expect(page.locator('.charm-card h3')).toHaveText('Beyoncé inspired');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#search')).toHaveValue('beyonce');
  await expect(page.locator('.charm-card')).toHaveCount(1);
  await page.locator('#search').fill('no-matching-artwork');
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.locator('#reset-filters').click();
  await expect(page.locator('#search')).toBeFocused();
  await expect(page.locator('.charm-card')).toHaveCount(234);
  const artistButton = page.locator('.charm-card[data-charm-id="artist-travis-scott"] .card-art');
  await artistButton.click();
  await expect(page.locator('#preview-dialog')).toBeVisible();
  const scrollBeforeClose = await page.evaluate(() => scrollY);
  const [packDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#preview-download').click()]);
  const packPath = join(output, 'artist-download.charmlet.json');
  await packDownload.saveAs(packPath);
  const pack = parseCharmPack(await readFile(packPath));
  assert.equal(pack.charms[0].id, 'artist-travis-scott');
  await page.keyboard.press('Escape');
  await expect(artistButton).toBeFocused();
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeClose) < 2);
  const oldPacks = ['music-icons-review', 'music-icons-legends-review', 'music-icons-current-review'];
  for (const id of oldPacks) {
    const response = await page.request.get(new URL(`packs/review/${id}.charmlet.json`, base).href);
    assert.equal(response.status(), 200);
    assert.ok((await response.body()).equals(await readFile(join(root, 'packs/review', `${id}.charmlet.json`))));
  }
  const oldExtras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
  for (const item of oldExtras) {
    const response = await page.request.get(new URL(`packs/${item.id}.charmlet.json`, base).href);
    assert.equal(response.status(), 200);
    parseCharmPack(await response.body());
  }

  console.log('Checking dragging, keyboard feedback, live artwork, puzzles and Reduced Motion.');
  await preview('terminal');
  const stage = page.locator('#demo-stage'), charm = page.locator('#demo-charm');
  const rest = await charm.boundingBox();
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2);
  await page.mouse.down();
  await page.mouse.move(rest.x + rest.width / 2 + 70, rest.y + rest.height / 2 + 70, { steps: 10 });
  await expect(stage).toHaveAttribute('data-dragging', 'true');
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-running', 'false', { timeout: 20000 });
  await expect(stage).toHaveAttribute('data-dragging', 'false');
  const returned = await charm.boundingBox();
  assert.ok(Math.abs(returned.x - rest.x) < 1 && Math.abs(returned.y - rest.y) < 1);
  // Reset and closing a preview must also release an unfinished pointer drag.
  await page.mouse.move(returned.x + returned.width / 2, returned.y + returned.height / 2);
  await page.mouse.down();
  await page.mouse.move(returned.x + returned.width / 2 + 20, returned.y + returned.height / 2 + 20);
  await page.locator('#demo-reset').dispatchEvent('click');
  await expect(stage).toHaveAttribute('data-dragging', 'false');
  assert.equal(await charm.evaluate(button => button.hasPointerCapture(1)), false);
  await page.mouse.up();
  await page.mouse.move(returned.x + returned.width / 2, returned.y + returned.height / 2);
  await page.mouse.down();
  await page.mouse.move(returned.x + returned.width / 2 + 25, returned.y + returned.height / 2 + 25);
  await expect(stage).toHaveAttribute('data-dragging', 'true');
  await page.keyboard.press('Escape');
  await expect(stage).toHaveAttribute('data-dragging', 'false');
  await expect(stage).toHaveAttribute('data-running', 'false');
  assert.equal(await charm.evaluate(button => button.hasPointerCapture(1)), false);
  const hiddenFrames = await stage.getAttribute('data-frames');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await stage.getAttribute('data-frames'), hiddenFrames);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await preview('new-stress-ball');
  await charm.focus();
  await page.keyboard.down('Space');
  assert.ok(await page.locator('#demo-image').evaluate(image => new DOMMatrix(getComputedStyle(image).transform).d < .9));
  await expect(page.locator('#demo-image')).toHaveCSS('transition-duration', '0s');
  await page.keyboard.up('Space');
  await expect(page.locator('#demo-image')).toHaveCSS('transform', 'none');
  await expect(stage).toHaveAttribute('data-running', 'false');
  for (const item of data.charms.filter(item => item.id.startsWith('live:'))) {
    await preview(item.id);
    const face = page.locator('#live-smiley');
    await expect(face).toBeVisible();
    await expect(face).toHaveAttribute('data-renderer', /^(webgl|canvas)$/);
    if (!['live:smiley', 'live:cloud', 'live:robot'].includes(item.id)) {
      await expect(face).toHaveAttribute('data-art-ready', item.id === 'live:cali' ? /^cali:/ : `${item.id.slice(5)}:`);
    }
    if (item.id === 'live:whale') {
      const contact = await face.evaluate(canvas => {
        const path = document.getElementById('demo-thread'), bounds = canvas.getBoundingClientRect();
        const point = path.getPointAtLength(path.getTotalLength());
        const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
        return { png: canvas.toDataURL(), x: Math.round((screen.x - bounds.x) / bounds.width * canvas.width),
          y: Math.round((screen.y - bounds.y) / bounds.height * canvas.height) };
      });
      const pixels = PNG.sync.read(Buffer.from(contact.png.split(',')[1], 'base64'));
      assert.ok(pixels.data[(contact.y * pixels.width + contact.x) * 4 + 3] > 80);
    }
  }
  for (const kind of ['cube', 'tiles', 'lights']) {
    await preview(`fidget:${kind}`);
    await expect(page.locator('#live-fidget')).toHaveAttribute('data-kind', kind);
    await page.locator('#demo-puzzle').click();
    await expect(page.locator('#puzzle-editor')).toBeVisible();
    await page.locator('#puzzle-shuffle').click();
    await expect(page.locator('#puzzle-editor')).toHaveAttribute('data-solved', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('#puzzle-editor')).toBeHidden();
    await expect(page.locator('#preview-dialog')).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(stage).toHaveAttribute('data-running', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await decodeImages();
  assert.equal(await overflow(), false);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: join(output, 'gallery-desktop.png') });

  console.log('Checking configured store/download visibility, disabled Studio and mobile layouts.');
  await page.route('**/catalogue.json', route => route.fulfill({ json: { ...data,
    distribution: { marketplace, openVsx }, launch: enabled } }));
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('#store-links a')).toHaveCount(2);
  await expect(page.locator('[data-shop-link]').first()).toHaveAttribute('href', enabled.shop.url);
  await page.locator('#tab-desktop').click();
  await expect(page.locator('[data-desktop-download="windows"]')).toHaveAttribute('href', desktop.windows);
  await expect(page.locator('[data-desktop-download="macos"]')).toHaveAttribute('href', desktop.macos);
  await expect(page.locator('[data-desktop-download="macos"]')).toContainText('Apple silicon');
  await expect(page.locator('#desktop-unavailable')).toBeHidden();
  await page.unroute('**/catalogue.json');
  await page.goto(new URL('studio/', base).href, { waitUntil: 'networkidle' });
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unavailable');
  assert.equal(await page.locator('input[type=file], input[type=password]').count(), 0);
  assert.equal((await page.request.get(new URL('not-a-page', base).href)).status(), 404);
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await decodeImages(); await revealPage();
    assert.equal(await overflow(), false, `Homepage overflow at ${width}`);
    await expect(page.locator('[data-shop-link]').first()).toBeHidden();
    if (width === 390) await page.screenshot({ path: join(output, 'home-mobile.png'), fullPage: true });
    await page.goto(`${gallery}?collection=music-icons`, { waitUntil: 'networkidle' });
    await expect(page.locator('.charm-card')).toHaveCount(34);
    await decodeImages();
    assert.equal(await overflow(), false, `Gallery overflow at ${width}`);
    await preview('artist-whitney-houston');
    assert.equal(await overflow(), false, `Preview overflow at ${width}`);
    await page.locator('#preview-close').click();
    if (width === 390) await page.screenshot({ path: join(output, 'gallery-mobile.png') });
  }
  assert.deepEqual(errors, []);
  const result = { version: manifest.version, charms: 234, artists: 34, collections: 16,
    desktop: true, mobileWidths: [390, 320, 768], liveCompanions: 15, puzzleBoards: 3,
    downloadedVsixMatches: true, oldPackUrlsRetained: true, reducedMotion: true,
    checkoutDisabledByDefault: true, consoleErrors: errors };
  await writeFile(join(output, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
