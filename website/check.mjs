import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateDistribution } from './distribution.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension', 'package.json'));
const { chromium } = require('@playwright/test');
const { parseCharmPack } = require('./out/charm-packs.js');
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const output = join(repo, 'extension', 'test-results', `website-check-${manifest.version}`);
await mkdir(output, { recursive: true });
const base = process.env.CHARMLET_GALLERY_URL || 'http://127.0.0.1:4173/';
const marketplace = `https://marketplace.visualstudio.com/items?itemName=${manifest.publisher}.${manifest.name}`;
const openVsx = `https://open-vsx.org/extension/${manifest.publisher}/${manifest.name}`;
assert.deepEqual(validateDistribution({ marketplace: null, openVsx: null }, manifest), { marketplace: null, openVsx: null });
assert.deepEqual(validateDistribution({ marketplace, openVsx }, manifest), { marketplace, openVsx });
assert.throws(() => validateDistribution({ marketplace: 'https://marketplace.visualstudio.com/items?itemName=wrong.charmlet', openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: marketplace.replace('https:', 'http:'), openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: 'javascript:alert(1)', openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: null, openVsx: `https://example.com/extension/${manifest.publisher}/${manifest.name}` }, manifest));
assert.throws(() => validateDistribution({ marketplace: `${marketplace}&unexpected=true`, openVsx: null }, manifest));
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
  assert.equal(await page.locator('.site-header a[href="#install"]').last().getAttribute('href'), '#install');
  const installation = page.locator('#install');
  const manualCard = installation.getByRole('article', { name: 'Install the extension file', exact: true });
  const storeCard = installation.getByRole('article', { name: 'Install from an extension store', exact: true });
  await manualCard.getByRole('link', { name: /Download Charmlet \.vsix/ }).waitFor();
  await manualCard.getByText('Extensions: Install from VSIX…', { exact: true }).waitFor();
  await manualCard.getByText('Charmlet: Show Charm', { exact: true }).waitFor();
  await storeCard.getByText('Charmlet: Show Charm', { exact: true }).waitFor();
  for (const label of ['Ctrl', 'Shift', 'P', 'Cmd']) assert.ok(await installation.getByText(label, { exact: true }).count());
  await assert.doesNotReject(async () => page.locator('#store-links').waitFor({ state: 'hidden' }));
  assert.equal((await page.locator('#store-availability').textContent())?.trim(), 'After publication');
  const howToText = await page.locator('#how-to').textContent();
  assert.ok(howToText?.includes('.charmlet.json'));
  assert.ok(howToText?.includes('not an extension installer'));
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

  const actualCatalogue = JSON.parse(await readFile(join(root, 'dist', 'catalogue.json'), 'utf8'));
  await page.route('**/catalogue.json', route => route.fulfill({ json: { ...actualCatalogue, distribution: { marketplace, openVsx } } }));
  await page.reload({ waitUntil: 'networkidle' });
  const storeLinks = page.locator('#store-links a');
  assert.equal(await storeLinks.count(), 2);
  assert.equal(await storeLinks.nth(0).getAttribute('href'), marketplace);
  assert.equal(await storeLinks.nth(1).getAttribute('href'), openVsx);
  assert.equal(await storeLinks.nth(0).getAttribute('target'), '_blank');
  assert.equal(await storeLinks.nth(0).getAttribute('rel'), 'noopener noreferrer');
  assert.equal((await page.locator('#store-availability').textContent())?.trim(), 'Store links available');
  await page.unroute('**/catalogue.json');
  await page.reload({ waitUntil: 'networkidle' });
  await assert.doesNotReject(async () => page.locator('#store-links').waitFor({ state: 'hidden' }));
  assert.equal((await page.locator('#store-availability').textContent())?.trim(), 'After publication');

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
    distributionFixture: 'validated matching URLs rendered without navigation',
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
