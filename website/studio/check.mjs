import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createGalleryServer } from '../server.mjs';
import { verifyStudioResponses, STUDIO_SESSION_MS } from './studio-entitlement.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const website = join(root, '..');
const repo = join(website, '..');
const require = createRequire(join(repo, 'extension', 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { PNG } = require('pngjs');
const { parseCharmPack } = require('./out/charm-packs.js');
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const output = join(repo, 'extension', 'test-results', `studio-check-${manifest.version}`);
await mkdir(output, { recursive: true });
const KEY = 'test-license-key-only';
const NOW = Date.parse('2026-10-08T20:00:00Z');
const errors = [];

function createPhoto() {
  const png = new PNG({ width: 400, height: 200 });
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const offset = (y * png.width + x) * 4;
    png.data[offset] = x < 200 ? 255 : 0;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = x < 200 ? 0 : 255;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png);
}
async function startServer(options) {
  const server = createGalleryServer({ staticRoot: join(website, 'dist'), ...options });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }),
  };
}
async function centerPixel(page) {
  return page.locator('#studio-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(108, 138, 1, 1).data]);
}

let browser;
let unavailable;
let configured;
try {
  let unavailableVerifierCalls = 0;
  unavailable = await startServer({ studioConfig: undefined, verifyLicense: async () => { unavailableVerifierCalls++; } });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (message.location().url.includes('/api/studio/unlock') && message.text().includes('403')) return;
    errors.push(`console ${message.location().url}: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page ${error.message}`));
  await page.goto(`${unavailable.origin}/studio/`, { waitUntil: 'networkidle' });
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unavailable');
  await expect(page.getByRole('heading', { name: 'Photo Studio is coming soon.' })).toBeVisible();
  assert.equal(await page.locator('input[type=file]').count(), 0);
  assert.equal(await page.locator('input[type=password]').count(), 0);
  assert.equal(await page.getByRole('link', { name: /checkout|buy/i }).count(), 0);
  assert.equal(unavailableVerifierCalls, 0);
  await page.screenshot({ path: join(output, 'studio-unavailable.png'), fullPage: true });
  await unavailable.close(); unavailable = undefined;

  const clock = { value: NOW };
  const verifierCalls = [];
  const config = {
    storeId: 11, productId: 22, variantId: 33, testMode: true, origin: 'http://127.0.0.1:1',
    apiKey: 'fake-api-key', secret: 'test-only-secret-with-more-than-thirty-two-characters',
    checkoutUrl: 'https://example.lemonsqueezy.com/checkout/buy/fake-product',
  };
  configured = await startServer({
    studioConfig: config,
    clock: () => clock.value,
    verifyLicense: async (_config, key, _fetcher, at) => {
      verifierCalls.push(key);
      if (key !== KEY) throw new Error('invalid test key');
      return verifyStudioResponses({
        valid: true, license_key: { id: 44, status: 'inactive', key, expires_at: null },
        meta: { store_id: 11, product_id: 22, variant_id: 33, order_id: 55 },
      }, {
        data: { type: 'orders', id: '55', attributes: { store_id: 11, status: 'paid', refunded: false, test_mode: true } },
      }, config, key, at);
    },
  });
  config.origin = configured.origin;
  const requests = [];
  let downloads = 0;
  page.on('request', request => {
    if (request.url().startsWith(configured.origin)) requests.push({ url: request.url(), method: request.method(), body: request.postData() });
  });
  page.on('download', () => downloads++);
  await page.goto(`${configured.origin}/studio/`, { waitUntil: 'networkidle' });
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  assert.equal(await page.locator('input[type=file]').count(), 0);
  await page.screenshot({ path: join(output, 'studio-locked.png'), fullPage: true });

  const keyInput = page.locator('#studio-key');
  await keyInput.fill('invalid-test-key');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio-status')).toContainText('could not be verified');
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  await keyInput.fill(KEY);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  await expect(page.locator('.test-banner')).toContainText('Test-mode access');
  assert.equal(await page.locator('#studio-key').count(), 0);
  assert.ok((await page.context().cookies()).some(cookie => cookie.name === 'charmlet-studio-dev' && cookie.httpOnly && cookie.sameSite === 'Strict'));
  await page.screenshot({ path: join(output, 'studio-unlocked.png'), fullPage: true });

  const photo = createPhoto();
  await writeFile(join(output, 'red-blue.png'), photo);
  await page.locator('#studio-file').setInputFiles({ name: 'red-blue.png', mimeType: 'image/png', buffer: photo });
  await expect(page.locator('#studio-status')).toContainText('Photo loaded locally');
  await page.locator('#studio-x').fill('0');
  await page.locator('#studio-x').dispatchEvent('input');
  assert.deepEqual(await centerPixel(page), [255, 0, 0, 255]);
  const safePixel = await centerPixel(page);
  await page.locator('#studio-file').setInputFiles({ name: 'wrong.png', mimeType: 'image/png', buffer: Buffer.from('not a png') });
  await expect(page.locator('#studio-status')).toContainText('does not match');
  assert.deepEqual(await centerPixel(page), safePixel);
  await page.locator('#studio-file').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
  await expect(page.locator('#studio-status')).toContainText('no larger than 8 MiB');
  assert.deepEqual(await centerPixel(page), safePixel);
  const oversizedHeader = Buffer.from(photo);
  oversizedHeader.writeUInt32BE(100000, 16);
  await page.locator('#studio-file').setInputFiles({ name: 'oversized-dimensions.png', mimeType: 'image/png', buffer: oversizedHeader });
  await expect(page.locator('#studio-status')).toContainText('8192 pixels');
  assert.deepEqual(await centerPixel(page), safePixel);
  await page.locator('#studio-x').fill('100');
  await page.locator('#studio-x').dispatchEvent('input');
  assert.deepEqual(await centerPixel(page), [0, 0, 255, 255]);

  const name = page.locator('#studio-name');
  await name.evaluate(input => { input.value = 'x'.repeat(49); input.dispatchEvent(new Event('input', { bubbles: true })); });
  const beforeInvalidName = downloads;
  await page.getByRole('button', { name: 'Download pack', exact: true }).click();
  await expect(page.locator('#studio-status')).toContainText('could not be exported');
  assert.equal(downloads, beforeInvalidName);
  await name.fill('x'.repeat(48));

  const exports = [];
  for (const frame of ['mint', 'copper', 'paper']) {
    await page.locator('#studio-frame').selectOption(frame);
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: 'Download pack', exact: true }).click(),
    ]);
    const path = join(output, `${frame}.charmlet.json`);
    await download.saveAs(path);
    const parsed = parseCharmPack(await readFile(path));
    assert.match(parsed.id, /^photo-/);
    assert.equal(parsed.name, 'x'.repeat(48));
    assert.equal(parsed.charms[0].name, 'x'.repeat(48));
    assert.equal(parsed.charms[0].group, 'Personal Keepsakes');
    const bytes = Buffer.from(parsed.charms[0].png, 'base64');
    assert.equal(bytes.readUInt32BE(16), 216);
    assert.equal(bytes.readUInt32BE(20), 252);
    exports.push({ frame, id: parsed.id, bytes: (await stat(path)).size });
  }

  await page.getByRole('button', { name: 'Lock Studio', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  assert.equal((await page.context().cookies()).some(cookie => cookie.name === 'charmlet-studio-dev'), false);
  await page.locator('#studio-key').fill(KEY);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  await page.locator('#studio-file').setInputFiles({ name: 'red-blue.png', mimeType: 'image/png', buffer: photo });
  await page.locator('#studio-x').fill('0'); await page.locator('#studio-x').dispatchEvent('input');
  assert.deepEqual(await centerPixel(page), [255, 0, 0, 255]);
  await page.locator('#studio-name').fill('A private crop draft');
  await page.locator('#studio-frame').selectOption('copper');
  clock.value += STUDIO_SESSION_MS;
  const beforeExpired = downloads;
  await page.getByRole('button', { name: 'Download pack', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  assert.equal(downloads, beforeExpired);
  await page.locator('#studio-key').fill(KEY);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  assert.deepEqual(await centerPixel(page), [255, 0, 0, 255]);
  assert.equal(await page.locator('#studio-x').inputValue(), '0');
  assert.equal(await page.locator('#studio-name').inputValue(), 'A private crop draft');
  assert.equal(await page.locator('#studio-frame').inputValue(), 'copper');
  assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${configured.origin}/studio/`, { waitUntil: 'networkidle' });
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  await page.locator('#studio-name').focus();
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'studio-name');
  const overflow = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(overflow.scroll <= overflow.width);
  await page.screenshot({ path: join(output, 'studio-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Lock Studio', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  assert.equal(await page.locator('#studio-canvas').count(), 0);
  await page.locator('#studio-key').fill(KEY);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  await page.evaluate(() => {
    const original = window.createImageBitmap.bind(window);
    window.restoreBitmapDecoder = () => { window.createImageBitmap = original; };
    window.createImageBitmap = async (...args) => {
      await new Promise(resolve => { window.releasePhotoDecode = resolve; });
      const decoded = await original(...args);
      window.photoDecodeFinished = true;
      return decoded;
    };
  });
  await page.locator('#studio-file').setInputFiles({ name: 'delayed-photo.png', mimeType: 'image/png', buffer: photo });
  await expect.poll(() => page.evaluate(() => typeof window.releasePhotoDecode)).toBe('function');
  await page.getByRole('button', { name: 'Lock Studio', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');
  await page.evaluate(() => window.releasePhotoDecode());
  await expect.poll(() => page.evaluate(() => window.photoDecodeFinished)).toBe(true);
  await page.evaluate(() => window.restoreBitmapDecoder());
  await page.locator('#studio-key').fill(KEY);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unlocked');
  assert.deepEqual(await centerPixel(page), [220, 232, 220, 255]);
  assert.equal(await page.locator('#studio-name').inputValue(), 'My keepsake');
  await page.getByRole('button', { name: 'Lock Studio', exact: true }).click();
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'locked');

  const requestText = JSON.stringify(requests);
  assert.equal(requestText.includes('red-blue.png'), false);
  assert.equal(requestText.includes('x'.repeat(48)), false);
  assert.equal(requestText.includes('iVBOR'), false);
  assert.ok(requests.filter(request => request.body).every(request => request.url.endsWith('/api/studio/unlock') && Object.keys(JSON.parse(request.body)).join(',') === 'key'));
  assert.ok(requests.every(request => request.url.startsWith(configured.origin)));
  assert.deepEqual(errors, []);
  const result = {
    unavailableVerifierCalls, verifierCalls: verifierCalls.length, testMode: true,
    exports, cropPixels: { left: [255, 0, 0, 255], right: [0, 0, 255, 255] },
    requestCount: requests.length, photoDataInRequests: false, webStorage: { local: 0, session: 0 },
    mobileOverflow: overflow, errors,
  };
  await writeFile(join(output, 'results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  if (unavailable) await unavailable.close();
  if (configured) await configured.close();
}
