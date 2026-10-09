import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateDistribution } from './distribution.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension', 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { parseCharmPack } = require('./out/charm-packs.js');
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const target = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const output = join(repo, 'extension', 'test-results', `website-check-${manifest.version}`);
await mkdir(output, { recursive: true });
const base = process.env.CHARMLET_GALLERY_URL || 'http://127.0.0.1:4173/';
const marketplace = `https://marketplace.visualstudio.com/items?itemName=${manifest.publisher}.${manifest.name}`;
const openVsx = `https://open-vsx.org/extension/${manifest.publisher}/${manifest.name}`;
const expectedCollections = { 'Compute & Silicon': 18, 'Test Bench': 12, 'AI & Code': 14, 'Places & Nature': 16 };
const legacyIds = ['probe-card', 'logic-gate', 'finfet', 'photon-link', 'lotus', 'sunrise'];
assert.equal(target.length, 60);
assert.deepEqual(validateDistribution({ marketplace: null, openVsx: null }, manifest), { marketplace: null, openVsx: null });
assert.deepEqual(validateDistribution({ marketplace, openVsx }, manifest), { marketplace, openVsx });
assert.throws(() => validateDistribution({ marketplace: 'https://marketplace.visualstudio.com/items?itemName=wrong.charmlet', openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: marketplace.replace('https:', 'http:'), openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: 'javascript:alert(1)', openVsx: null }, manifest));
assert.throws(() => validateDistribution({ marketplace: null, openVsx: `https://example.com/extension/${manifest.publisher}/${manifest.name}` }, manifest));
assert.throws(() => validateDistribution({ marketplace: `${marketplace}&unexpected=true`, openVsx: null }, manifest));
for (const [collection, count] of Object.entries(expectedCollections)) assert.equal(target.filter(item => item.collection === collection).length, count);
const errors = [];
let browser;
const checkOverflow = async page => page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
const twoFrames = async page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const decodeImages = async page => page.locator('img').evaluateAll(async images => {
  for (const image of images) image.loading = 'eager';
  await Promise.all(images.map(image => image.decode()));
  return images.map(image => ({ alt: image.alt, width: image.naturalWidth, height: image.naturalHeight, complete: image.complete }));
});
async function downloadPack(page, id) {
  const card = page.locator(`.charm-card[data-charm-id="${id}"]`);
  const [download] = await Promise.all([page.waitForEvent('download'), card.locator('.download-link').click()]);
  const path = join(output, `downloaded-${id}.charmlet.json`);
  await download.saveAs(path);
  const parsed = parseCharmPack(await readFile(path));
  assert.equal(parsed.id, id);
  assert.equal(parsed.charms[0].id, id);
  return { parsed, path };
}
async function renderCollectionSheet(browser, collection, theme) {
  const items = target.filter(item => item.collection === collection && !legacyIds.includes(item.id));
  const columns = items.length > 15 ? 6 : 5;
  const background = theme === 'dark' ? '#20262a' : '#f6f4ed';
  const foreground = theme === 'dark' ? '#edf3ef' : '#183c35';
  const border = theme === 'dark' ? '#65736d' : '#cbd7cc';
  const page = await browser.newPage({ viewport: { width: columns * 152 + 32, height: Math.ceil(items.length / columns) * 160 + 78 } });
  try {
    const cards = items.map(item => `<figure><img src="${new URL(`assets/extras/${item.file}`, base)}" alt="${item.name}"><figcaption>${item.name}</figcaption></figure>`).join('');
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:16px;background:${background};color:${foreground};font:13px system-ui}
      h1{height:30px;margin:0 0 12px;font:600 20px Georgia,serif}.sheet{display:grid;grid-template-columns:repeat(${columns},144px);gap:8px}
      figure{width:144px;height:152px;margin:0;display:grid;grid-template-rows:112px 1fr;place-items:center;padding:4px;border:1px solid ${border};border-radius:8px;background:${theme === 'dark' ? '#293136' : '#fffdf7'}}
      img{width:96px;height:112px;object-fit:contain}figcaption{max-width:136px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style><h1>${collection} — ${items.length} new designs</h1><section class="sheet">${cards}</section>`);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const slug = collection.toLowerCase().replaceAll('&', 'and').replaceAll(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    await page.locator('body').screenshot({ path: join(output, `phase-4c-${slug}-${theme}.png`) });
  } finally { await page.close(); }
}
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.location().url}: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  const response = await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  await page.locator('.charm-card').first().waitFor();
  assert.equal(await page.locator('.charm-card').count(), 60);
  assert.equal(await page.locator('#extra-count').textContent(), '60');
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

  for (const [collection, count] of Object.entries(expectedCollections)) {
    const filter = page.getByRole('button', { name: collection, exact: true });
    await filter.focus();
    await page.keyboard.press('Enter');
    assert.equal((await page.evaluate(() => document.activeElement?.textContent))?.trim(), collection);
    assert.equal(await page.locator('.charm-card').count(), count);
    assert.notEqual(await filter.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
  }
  await page.getByRole('button', { name: 'All', exact: true }).click();
  assert.equal(await page.locator('.charm-card').count(), 60);

  await page.locator('#search').fill('golden die');
  assert.equal(await page.locator('.charm-card').count(), 1);
  assert.equal(await page.locator('.charm-card').getAttribute('data-charm-id'), 'golden-die');
  await page.locator('#search').fill('');
  assert.equal(await page.locator('.charm-card').count(), 60);
  await page.locator('#search').fill('GPU');
  assert.ok(await page.locator('.charm-card[data-charm-id="gpu-tile"]').isVisible());
  await page.locator('#search').fill('no-such-charm');
  assert.equal(await page.locator('.charm-card').count(), 0);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  assert.equal(await page.locator('.charm-card').count(), 60);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'search');

  for (const collection of Object.keys(expectedCollections)) {
    await renderCollectionSheet(browser, collection, 'light');
    await renderCollectionSheet(browser, collection, 'dark');
  }
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByRole('button', { name: /Included with Charmlet/ }).click();
  assert.equal(await page.locator('.charm-card').count(), 10);
  assert.equal(await page.locator('.included-label').count(), 10);
  const includedImages = await decodeImages(page);
  assert.ok(includedImages.every(image => image.complete && image.width > 0 && image.height > 0));
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.locator('.charm-card[data-charm-id="evil-eye"]').getByRole('button', { name: /Preview Evil Eye/ }).click();
  await page.locator('.hero-demo').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#demo-name').textContent(), 'Evil Eye');
  assert.match(await page.locator('#demo-image').getAttribute('src'), /evil-eye\.svg$/);
  await page.getByRole('button', { name: /Extra downloads/ }).click();
  const oldPack = await downloadPack(page, 'probe-card');
  const newPack = await downloadPack(page, 'gpu-tile');

  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.locator('.charm-card[data-charm-id="gpu-tile"]').getByRole('button', { name: /Preview GPU Tile/ }).click();
  const hero = page.locator('.hero');
  const demo = page.locator('#demo-stage');
  const demoButton = page.locator('#demo-charm');
  await page.locator('.hero-demo').scrollIntoViewIfNeeded();
  await page.locator('#demo-stage[data-ready="true"]').waitFor();
  await page.locator('#demo-image').evaluate(image => image.decode());
  assert.equal(await page.locator('#demo-name').textContent(), 'GPU Tile');
  const demoStage = await demo.boundingBox();
  const restingCharm = await demoButton.boundingBox();
  assert.ok(demoStage && restingCharm);
  const restingCenterX = restingCharm.x + restingCharm.width / 2;

  await page.mouse.click(restingCenterX, restingCharm.y + restingCharm.height / 2);
  await page.locator('#demo-stage[data-running="true"]').waitFor();
  await expect.poll(async () => {
    const bounds = await demoButton.boundingBox();
    return bounds ? Math.abs(bounds.x + bounds.width / 2 - restingCenterX) : 0;
  }).toBeGreaterThan(2);
  await hero.screenshot({ path: join(output, 'phase-4c-hero.png') });
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });
  assert.equal(await demo.getAttribute('data-cord'), '126');

  const keyboardFrames = Number(await demo.getAttribute('data-frames'));
  await demoButton.focus();
  await demoButton.press('Enter');
  await page.locator('#demo-stage[data-running="true"]').waitFor();
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });
  assert.ok(Number(await demo.getAttribute('data-frames')) > keyboardFrames);

  let bounds = await demoButton.boundingBox();
  assert.ok(bounds);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 50, bounds.y + bounds.height / 2 + 70, { steps: 10 });
  await page.mouse.up();
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });
  assert.equal(await demo.getAttribute('data-cord'), '126');
  let returned = await demoButton.boundingBox();
  assert.ok(returned.x >= demoStage.x - 1 && returned.x + returned.width <= demoStage.x + demoStage.width + 1
    && returned.y >= demoStage.y - 1 && returned.y + returned.height <= demoStage.y + demoStage.height + 1);

  bounds = await demoButton.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 35, bounds.y + bounds.height / 2 + 45, { steps: 6 });
  assert.equal(await demo.getAttribute('data-dragging'), 'true');
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect.poll(() => demo.getAttribute('data-dragging')).toBe('false');
  assert.equal(await demoButton.evaluate((button, pointerId) => button.hasPointerCapture(pointerId), 1), false);
  await page.mouse.up();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.hero-demo').scrollIntoViewIfNeeded();
  await twoFrames(page);
  bounds = await demoButton.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 25, bounds.y + bounds.height / 2 + 30, { steps: 5 });
  assert.equal(await demo.getAttribute('data-dragging'), 'true');
  await page.mouse.up();
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });

  bounds = await demoButton.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 - 30, bounds.y + bounds.height / 2 + 35, { steps: 5 });
  await demoButton.dispatchEvent('pointercancel', { pointerId: 1 });
  assert.equal(await demo.getAttribute('data-dragging'), 'false');
  assert.equal(await demo.getAttribute('data-cord'), '126');
  await page.mouse.up();
  returned = await demoButton.boundingBox();
  await page.mouse.click(returned.x + returned.width / 2, returned.y + returned.height / 2);
  await page.locator('#demo-stage[data-running="true"]').waitFor();
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });

  bounds = await demoButton.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2 + 20, { steps: 4 });
  await page.getByRole('button', { name: 'Reset demo', exact: true }).dispatchEvent('click');
  assert.equal(await demo.getAttribute('data-dragging'), 'false');
  assert.equal(await demoButton.evaluate((button, pointerId) => button.hasPointerCapture(pointerId), 1), false);
  await page.mouse.up();

  const tapRest = await demoButton.boundingBox();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(tapRest.x + tapRest.width / 2, tapRest.y + tapRest.height / 2);
  await page.mouse.down();
  await page.mouse.move(tapRest.x + tapRest.width / 2 + 2, tapRest.y + tapRest.height / 2 + 2);
  await page.mouse.up();
  assert.equal(await demo.getAttribute('data-dragging'), 'false');
  assert.equal(await demo.getAttribute('data-running'), 'false');
  assert.equal(await demo.getAttribute('data-cord'), '126');
  let tapReturned = await demoButton.boundingBox();
  assert.ok(Math.abs(tapReturned.x - tapRest.x) < 1 && Math.abs(tapReturned.y - tapRest.y) < 1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(tapReturned.x + tapReturned.width / 2, tapReturned.y + tapReturned.height / 2);
  await page.mouse.down();
  await page.mouse.move(tapReturned.x + tapReturned.width / 2 + 2, tapReturned.y + tapReturned.height / 2 + 2);
  await page.mouse.up();
  await page.locator('#demo-stage[data-running="false"]').waitFor({ timeout: 20000 });
  assert.equal(await demo.getAttribute('data-cord'), '126');
  tapReturned = await demoButton.boundingBox();
  assert.ok(Math.abs(tapReturned.x - tapRest.x) < 1 && Math.abs(tapReturned.y - tapRest.y) < 1);

  bounds = await demoButton.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2 + 30, { steps: 4 });
  assert.equal(await demo.getAttribute('data-dragging'), 'true');
  await page.locator('#catalogue').scrollIntoViewIfNeeded();
  await expect.poll(() => demo.getAttribute('data-dragging')).toBe('false');
  assert.equal(await demoButton.evaluate((button, pointerId) => button.hasPointerCapture(pointerId), 1), false);
  assert.equal(await demo.getAttribute('data-running'), 'false');
  const hiddenFrames = Number(await demo.getAttribute('data-frames'));
  await twoFrames(page);
  assert.equal(Number(await demo.getAttribute('data-frames')), hiddenFrames);
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.hero-demo').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Try a swing', exact: true }).click();
  assert.equal(await demo.getAttribute('data-running'), 'false');
  assert.equal(await demo.getAttribute('data-dragging'), 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const [vsixDownload] = await Promise.all([page.waitForEvent('download'), page.locator('.extension-download').first().click()]);
  const vsixPath = join(output, `downloaded-charmlet-${manifest.version}.vsix`);
  await vsixDownload.saveAs(vsixPath);
  const sourceVsix = await readFile(join(repo, 'extension', `charmlet-${manifest.version}.vsix`));
  const downloadedVsix = await readFile(vsixPath);
  assert.ok(downloadedVsix.length > 1000);
  assert.ok(downloadedVsix.equals(sourceVsix));

  const actualCatalogue = JSON.parse(await readFile(join(root, 'dist', 'catalogue.json'), 'utf8'));
  assert.equal(new Set(actualCatalogue.charms.map(item => item.id)).size, 70);
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
  assert.equal(await page.locator('.charm-card').count(), 60);
  const mobileImages = await decodeImages(page);
  assert.ok(mobileImages.every(image => image.complete && image.width > 0 && image.height > 0));
  const mobileOverflow = await checkOverflow(page);
  assert.ok(mobileOverflow.scroll <= mobileOverflow.width);
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  const result = {
    url: base,
    extras: 60,
    included: 10,
    uniqueIds: 70,
    collections: expectedCollections,
    downloadedPacks: [oldPack.parsed.id, newPack.parsed.id],
    demo: 'swing, drag-return, offscreen-stop, reduced-motion-stop',
    distributionFixture: 'validated matching URLs rendered without navigation',
    oldPackBytes: (await stat(oldPack.path)).size,
    newPackBytes: (await stat(newPack.path)).size,
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
