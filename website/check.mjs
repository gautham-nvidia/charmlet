import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension', 'package.json'));
const { chromium } = require('@playwright/test');
const { parseCharmPack } = require('./out/charm-packs.js');
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const output = join(repo, 'extension', 'test-results', 'website-check');
await mkdir(output, { recursive: true });
const base = process.env.CHARMLET_GALLERY_URL || 'http://127.0.0.1:4173/';
const errors = [];
let browser;
const checkOverflow = async page => page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
const decodeImages = async page => page.locator('img').evaluateAll(async images => {
  await Promise.all(images.map(image => image.decode()));
  return images.map(image => ({ alt: image.alt, width: image.naturalWidth, height: image.naturalHeight, complete: image.complete }));
});
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.location().url}: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  const response = await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  await page.locator('.charm-card').first().waitFor();
  assert.equal(await page.locator('.charm-card').count(), 6);
  assert.equal(await page.locator('#extra-count').textContent(), '6');
  assert.equal(await page.locator('#included-count').textContent(), '10');
  const desktopImages = await decodeImages(page);
  assert.ok(desktopImages.every(image => image.complete && image.width > 0 && image.height > 0));
  const desktopOverflow = await checkOverflow(page);
  assert.ok(desktopOverflow.scroll <= desktopOverflow.width);
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true });

  const goodLuck = page.getByRole('button', { name: 'Good Luck', exact: true });
  await goodLuck.focus();
  await page.keyboard.press('Enter');
  assert.equal((await page.evaluate(() => document.activeElement?.textContent))?.trim(), 'Good Luck');
  assert.equal(await page.locator('.charm-card').count(), 1);
  assert.equal(await page.locator('.charm-card').getAttribute('data-charm-id'), 'lotus');
  const focusStyle = await goodLuck.evaluate(element => getComputedStyle(element).outlineStyle);
  assert.notEqual(focusStyle, 'none');
  await page.screenshot({ path: join(output, 'filtered.png'), fullPage: true });

  await page.locator('#search').fill('no-such-charm');
  assert.equal(await page.locator('.charm-card').count(), 0);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  assert.equal(await page.locator('.charm-card').count(), 6);
  assert.equal(await page.locator('#search').inputValue(), '');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'search');

  await page.getByRole('button', { name: /Included with Charmlet/ }).click();
  assert.equal(await page.locator('.charm-card').count(), 10);
  assert.equal(await page.locator('.included-label').count(), 10);
  const includedImages = await decodeImages(page);
  assert.ok(includedImages.every(image => image.complete && image.width > 0 && image.height > 0));

  await page.getByRole('button', { name: /Extra downloads/ }).click();
  const [packDownload] = await Promise.all([page.waitForEvent('download'), page.locator('.download-link').first().click()]);
  const packPath = join(output, 'downloaded-probe-card.charmlet.json');
  await packDownload.saveAs(packPath);
  const parsed = parseCharmPack(await readFile(packPath));
  assert.equal(parsed.id, 'probe-card');
  assert.equal(parsed.charms[0].id, 'probe-card');

  const [vsixDownload] = await Promise.all([page.waitForEvent('download'), page.locator('.extension-download').first().click()]);
  const vsixPath = join(output, `downloaded-charmlet-${manifest.version}.vsix`);
  await vsixDownload.saveAs(vsixPath);
  const sourceVsix = await readFile(join(repo, 'extension', `charmlet-${manifest.version}.vsix`));
  const downloadedVsix = await readFile(vsixPath);
  assert.ok(downloadedVsix.length > 1000);
  assert.ok(downloadedVsix.equals(sourceVsix));

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.charm-card').first().waitFor();
  assert.equal(await page.locator('.charm-card').count(), 6);
  const mobileImages = await decodeImages(page);
  assert.ok(mobileImages.every(image => image.complete && image.width > 0 && image.height > 0));
  const mobileOverflow = await checkOverflow(page);
  assert.ok(mobileOverflow.scroll <= mobileOverflow.width);
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  const result = {
    url: base,
    extras: 6,
    included: 10,
    downloadedPack: parsed.id,
    packBytes: (await stat(packPath)).size,
    vsixBytes: (await stat(vsixPath)).size,
    desktopOverflow,
    mobileOverflow,
    imageCounts: { desktop: desktopImages.length, included: includedImages.length, mobile: mobileImages.length },
    errors,
  };
  await writeFile(join(output, 'results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
}
