import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(repo, 'website');
const require = createRequire(join(repo, 'extension/package.json'));
const { chromium, expect } = require('@playwright/test');
const { PNG } = require('pngjs');
const { parseCharmPack } = require('./out/charm-packs.js');
const review = JSON.parse(await readFile(join(root, 'art-review.json'), 'utf8'));
const version = JSON.parse(await readFile(join(repo, 'extension/package.json'), 'utf8')).version;
const output = join(repo, 'extension/test-results', `art-review-${version}`);
await mkdir(output, { recursive: true });
assert.equal(review.expected, 95);
assert.equal(review.items.length, 95);
assert.equal(new Set(review.items.map(item => item.key)).size, 95);
const counts = { starters: 10, classics: 60, flowers: 12, 'new-worlds': 13 };
for (const [family, count] of Object.entries(counts)) assert.equal(review.items.filter(item => item.family === family).length, count);
for (const item of review.items) {
  const bytes = await readFile(join(root, item.image));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.pngSha256);
  const png = PNG.sync.read(bytes);
  assert.equal(png.width, 216); assert.equal(png.height, 252);
  assert.equal(png.data[3], 0); assert.equal(png.data[(216 * 252 - 1) * 4 + 3], 0);
  assert.ok(bytes.length <= 256 * 1024);
  if (item.family === 'flowers') assert.equal(item.download, null);
  else {
    const pack = parseCharmPack(await readFile(join(root, item.download)));
    assert.equal(pack.charms[0].name, item.name);
    assert.equal(pack.charms[0].group, item.group);
  }
}
for (const bundle of review.bundles) {
  const pack = parseCharmPack(await readFile(join(root, bundle.download)));
  assert.equal(pack.charms.length, bundle.count);
  assert.ok(pack.charms.length <= 12);
  assert.ok(pack.charms.every(charm => !charm.id.startsWith('flower-')));
}
const decode = page => page.locator('img[src]').evaluateAll(async images => {
  for (const image of images) image.loading = 'eager';
  await Promise.all(images.map(image => image.decode()));
});
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173/review.html', { waitUntil: 'networkidle' });
  await expect(page.locator('.review-card')).toHaveCount(95);
  await page.locator('img[src]').evaluateAll(async images => { for (const image of images) image.loading = 'eager'; await Promise.all(images.map(image => image.decode())); });
  for (const [family, count] of Object.entries(counts)) {
    await page.locator(`[data-family="${family}"]`).click();
    await expect(page.locator('.review-card')).toHaveCount(count);
    if (family === 'flowers') assert.equal(await page.locator('.review-card a').count(), 0);
  }
  await page.locator('[data-family="all"]').click();
  await page.locator('#review-search').fill('red panda');
  await expect(page.locator('.review-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Enlarge Red Panda', exact: true }).click();
  await expect(page.locator('#review-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#review-dialog')).not.toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download Red Panda review pack', exact: true }).click()]);
  const downloaded = join(output, 'red-panda.charmlet.json'); await download.saveAs(downloaded);
  const pack = parseCharmPack(await readFile(downloaded));
  assert.equal(pack.charms[0].name, 'Red Panda');
  await page.locator('#review-search').fill('');
  await page.locator('[data-family="starters"]').click();
  await page.locator('#view-compare').click();
  await page.locator('img[src]').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: join(output, 'starter-comparison.png'), fullPage: true });
  await page.locator('#view-new').click();
  await page.locator('#view-dark').click();
  await decode(page);
  await page.screenshot({ path: join(output, 'starter-dark.png'), fullPage: true });
  await page.locator('[data-family="new-worlds"]').click();
  await decode(page);
  await page.screenshot({ path: join(output, 'new-worlds-dark.png'), fullPage: true });
  await page.locator('#view-dark').click();
  await page.setViewportSize({ width: 375, height: 812 });
  await decode(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(output, 'review-mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  const result = { designs: 95, counts, downloadableDesigns: 83, bundles: review.bundles.length, pngsValidated: 95,
    transparentCorners: true, parsedBrowserDownload: pack.id, mobileOverflow: false, errors };
  await writeFile(join(output, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
