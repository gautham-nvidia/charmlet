import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateDistribution } from './distribution.mjs';
import { validateLaunch } from './launch.mjs';
import { validateAudience } from './audience.mjs';
import { securityHeaders } from './security-headers.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { chromium, expect } = require('@playwright/test');
const { PNG } = require('pngjs');
const manifest = JSON.parse(await readFile(join(repo, 'extension/package.json'), 'utf8'));
const data = JSON.parse(await readFile(join(root, 'dist/catalogue.json'), 'utf8'));
const output = join(repo, 'extension/test-results', `website-check-${manifest.version}`);
await mkdir(output, { recursive: true });
const base = process.env.CHARMLET_GALLERY_URL || 'http://127.0.0.1:4173/';
const gallery = new URL('charms.html', base).href;
const counts = { coding: 1, live: 15, stress: 18, music: 12, 'music-icons': 34, 'sports-icons': 14,
  california: 12, 'us-cities': 13, animals: 13, silicon: 15, parks: 6, space: 13, zodiac: 12, gemstones: 8, culture: 25,
  sports: 5, seasonal: 24, flowers: 18 };
assert.equal(data.charms.length, 258);
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
const noAudience = { provider: 'brevo', formUrl: null, contactEmail: null };
assert.deepEqual(validateAudience(noAudience), noAudience);
const publicAudience = { provider: 'brevo', formUrl: 'https://example.sibforms.com/serve/public-form-token', contactEmail: 'hello@example.test' };
assert.deepEqual(validateAudience(publicAudience), publicAudience);
assert.throws(() => validateAudience({ ...noAudience, apiKey: 'must-not-be-public' }));
assert.throws(() => validateAudience({ ...publicAudience, contactEmail: null }));
for (const formUrl of [
  'http://example.sibforms.com/serve/token',
  'https://example.sibforms.com.invalid/serve/token',
  'https://user:secret@example.sibforms.com/serve/token',
  'https://example.sibforms.com/serve/token?email=private@example.test',
  'https://example.sibforms.com:8443/serve/token',
]) assert.throws(() => validateAudience({ ...publicAudience, formUrl }));

const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
});
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const publicCommerce = JSON.parse(await readFile(join(root, 'dist/commerce-public.json'), 'utf8'));
// These checks remain isolated after real provider addresses are configured.
await page.route('**/commerce-public.json', route => route.fulfill({
  json: { ...publicCommerce, apiOrigin: null, salesEnabled: false },
}));
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
async function chooseTheme(mode) {
  for (let step = 0; step < 3 && await page.locator('html').getAttribute('data-theme-mode') !== mode; step++) {
    await page.locator('[data-theme-toggle]').click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
}
try {
  console.log('Checking the approved homepage, placement, reactions, email gate and garden.');
  const homepage = await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(homepage.status(), 200);
  assert.equal(homepage.headers()['x-frame-options'], 'DENY');
  assert.equal(homepage.headers()['referrer-policy'], 'no-referrer');
  assert.ok(homepage.headers()['content-security-policy'].includes("script-src 'self'"));
  await expect(page.locator('html')).toHaveAttribute('data-design-ready', 'true');
  const offers = page.locator('#offers-popup');
  await expect(offers).toBeVisible();
  await expect(offers.locator('[type=submit]')).toBeDisabled();
  await expect(offers.locator('[data-signup-message]')).toContainText('does not send or collect email');
  await page.screenshot({ path: join(output, 'offers-desktop.png') });
  await page.keyboard.press('Escape');
  await expect(offers).toBeHidden();
  await expect(page.locator('.header-get')).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'auto');
  for (const mode of ['light', 'dark', 'auto']) {
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', mode);
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme('light');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(offers).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const themeBounds = await page.locator('[data-theme-toggle]').boundingBox();
  assert.equal(themeBounds.width, 44); assert.equal(themeBounds.height, 44);
  await chooseTheme('auto');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#demo-name')).toHaveText('Cali');
  await expect(page.locator('#live-smiley')).toHaveAttribute('data-art-ready', /^cali:/);
  await expect(page.locator('.shelf-item')).toHaveCount(8);
  assert.equal(await page.locator('a[href="./studio/"]').count(), 0);
  for (const name of ['Sunny', 'Nimbus', 'Byte', 'Cali']) {
    await page.getByRole('button', { name: `Try ${name}`, exact: true }).click();
    await expect(page.locator('#demo-name')).toHaveText(name);
    await expect(page.locator('#live-smiley')).toBeVisible();
  }
  await page.getByRole('button', { name: 'VS Code', exact: true }).click();
  await expect(page.locator('#playground')).toHaveAttribute('data-workspace', 'vscode');
  await page.getByRole('button', { name: 'Desktop', exact: true }).click();
  await expect(page.locator('#playground')).toHaveAttribute('data-workspace', 'desktop');
  await page.getByRole('button', { name: '✦ Cheer', exact: true }).click();
  await expect(page.locator('#demo-charm .win-sparkles[data-kind="confetti"] i')).toHaveCount(28);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '✦ Cheer', exact: true }).click();
  await expect(page.locator('#demo-charm .win-sparkles')).toHaveAttribute('data-still', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await chooseTheme('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme('light');
  await page.locator('#email-download').click();
  await expect(page.locator('#signup-preview')).toBeVisible();
  await expect(page.locator('#download-signup button[type="submit"]')).toBeDisabled();
  await expect(page.locator('#download-signup input[name="offers"]')).not.toBeChecked();
  assert.equal(await page.locator('input[type="password"], input[name="username"]').count(), 0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#email-download')).toBeFocused();
  await page.locator('[data-growth="sunflower"]').click();
  await expect(page.locator('[data-growth="sunflower"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#memory-locket').click();
  await expect(page.locator('#memory-locket')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#memory-locket').click();
  await decodeImages(); await revealPage();
  assert.equal(await overflow(), false);
  await page.screenshot({ path: join(output, 'home-desktop.png'), fullPage: true });

  console.log('Checking collection filters, search, preview focus and protected download boundaries.');
  await page.goto(gallery, { waitUntil: 'networkidle' });
  await expect(page.locator('.charm-card')).toHaveCount(258);
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
  await expect(page.locator('.charm-card')).toHaveCount(258);
  const artistButton = page.locator('.charm-card[data-charm-id="artist-travis-scott"] .card-art');
  await artistButton.click();
  await expect(page.locator('#preview-dialog')).toBeVisible();
  const scrollBeforeClose = await page.evaluate(() => scrollY);
  await expect(page.locator('#optional-pack')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(artistButton).toBeFocused();
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeClose) < 2);
  const oldPacks = ['music-icons-review', 'music-icons-legends-review', 'music-icons-current-review',
    'sports-icons-pro-preview-1', 'sports-icons-pro-preview-2'];
  for (const id of oldPacks) {
    const response = await page.request.get(new URL(`packs/review/${id}.charmlet.json`, base).href);
    assert.equal(response.status(), 404);
  }
  const oldExtras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
  for (const item of oldExtras) {
    const response = await page.request.get(new URL(`packs/${item.id}.charmlet.json`, base).href);
    assert.equal(response.status(), 404);
  }
  for (const path of ['downloads/charmlet.vsix', '.env.local', '.git/config', 'service/catalogue.json']) {
    assert.equal((await page.request.get(new URL(path, base).href)).status(), 404);
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

  console.log('Checking information pages, shop, disabled service and mobile layouts.');
  for (const path of ['about.html', 'about-us.html', 'press.html', 'privacy.html', 'shop.html', 'download.html']) {
    assert.equal((await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' })).status(), 200);
    await expect(page.locator('h1')).toBeVisible();
    assert.equal(await overflow(), false, `Page overflow: ${path}`);
  }
  await expect(page.locator('#portal-signup button[type="submit"]')).toBeDisabled();
  await page.goto(new URL('shop.html', base).href, { waitUntil: 'networkidle' });
  await page.locator('#store-collection').selectOption('Sports Icons');
  await expect(page.locator('.store-card')).toHaveCount(14);
  await expect(page.locator('.store-price')).toHaveText(Array(14).fill('Included with Charmlet Pro'));
  await expect(page.locator('.store-card button')).toHaveCount(0);
  await page.locator('#store-price').selectOption('0');
  await expect(page.locator('.store-card')).toHaveCount(0);
  await page.locator('#store-price').selectOption('');
  await expect(page.locator('#choose-pro')).toBeEnabled();
  await page.locator('#choose-pro').click();
  await expect(page.locator('#basket-total')).toContainText('7.49');
  await page.goto(new URL('studio/', base).href, { waitUntil: 'networkidle' });
  await expect(page.locator('#studio')).toHaveAttribute('data-studio-state', 'unavailable');
  assert.equal(await page.locator('input[type=file], input[type=password]').count(), 0);
  assert.equal((await page.request.get(new URL('not-a-page', base).href)).status(), 404);
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#open-offers').click();
    await expect(offers).toBeVisible();
    assert.equal(await offers.evaluate(dialog => dialog.scrollWidth > dialog.clientWidth), false);
    if (width === 320) await page.screenshot({ path: join(output, 'offers-mobile.png') });
    await offers.getByRole('button', { name: /Maybe later/ }).click();
    await expect(page.locator('#open-offers')).toBeFocused();
    await decodeImages(); await revealPage();
    assert.equal(await overflow(), false, `Homepage overflow at ${width}`);
    if (width === 390) await page.screenshot({ path: join(output, 'home-mobile.png'), fullPage: true });
    await page.goto(`${gallery}?collection=music-icons`, { waitUntil: 'networkidle' });
    await expect(page.locator('.charm-card')).toHaveCount(34);
    await decodeImages();
    assert.equal(await overflow(), false, `Gallery overflow at ${width}`);
    await preview('artist-whitney-houston');
    assert.equal(await overflow(), false, `Preview overflow at ${width}`);
    await page.locator('#preview-close').click();
    if (width === 390) await page.screenshot({ path: join(output, 'gallery-mobile.png') });
    for (const path of ['about.html', 'about-us.html', 'press.html', 'privacy.html', 'shop.html', 'download.html']) {
      await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' });
      assert.equal(await overflow(), false, `Overflow: ${path} at ${width}`);
    }
  }
  console.log('Checking email, trial, delivery and checkout-return UI with isolated provider fixtures.');
  const apiOrigin = 'https://access.fixture.charmlet.test';
  const installer = publicCommerce.products.find(product => product.sku === 'app-vscode');
  const fixtureCommerce = { ...publicCommerce, apiOrigin, salesEnabled: true, turnstileSiteKey: 'fixture-site-key',
    products: publicCommerce.products.map(product => product.kind === 'installer' ? { ...product, available: false } : product) };
  const calls = [], session = 'b'.repeat(64), proof = 'a'.repeat(64);
  let paid = false, offersRequested = false;
  let access = { edition: 'items', license: 'fixture-signature', items: [], trial: { used: false } };
  const apiHeaders = { 'access-control-allow-origin': new URL(base).origin,
    'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
  await page.unroute('**/commerce-public.json');
  await page.route('**/commerce-public.json', route => route.fulfill({ json: fixtureCommerce }));
  // Apply exactly the policy that the production build generates when an API
  // origin is configured. Keep CSP enabled throughout the browser checks.
  await page.route(url => url.origin === new URL(base).origin
    && (url.pathname === '/' || url.pathname.endsWith('.html')), async route => {
    const response = await route.fetch(), headers = response.headers();
    for (const [name, value] of Object.entries(securityHeaders(apiOrigin))) headers[name.toLowerCase()] = value;
    await route.fulfill({ response, headers });
  });
  await page.route('https://challenges.cloudflare.com/turnstile/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile = { render: (_, options) => { options.callback(); return 'fixture'; },
      getResponse: () => 'fixture-human-response', reset: () => {} };`,
  }));
  await page.route(`${apiOrigin}/**`, async route => {
    const request = route.request(), path = decodeURIComponent(new URL(request.url()).pathname.slice(4));
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: apiHeaders }); return; }
    const body = request.postDataJSON();
    calls.push({ path, body });
    const respond = data => route.fulfill({ json: data, headers: apiHeaders });
    if (path === 'status') return respond({ configured: true, checkout: true, marketing: true, testMode: true,
      installers: [{ sku: installer.sku, available: true, filename: installer.filename }] });
    if (path === 'email/start') {
      offersRequested = body.email === 'offers@charmlet.test';
      assert.deepEqual(body, { email: offersRequested ? 'offers@charmlet.test' : 'review@charmlet.test',
        purpose: 'download', offers: offersRequested,
        humanToken: 'fixture-human-response' });
      return respond({ message: 'Check your inbox for a confirmation link.' });
    }
    if (path === 'email/verify') {
      assert.equal(body.token, proof);
      return respond({ ...access, session, offersRequested, offersSubscribed: offersRequested });
    }
    assert.equal(request.headers().authorization, `Bearer ${session}`);
    if (path === 'library') {
      if (paid) access = { ...access, edition: 'pro', license: 'fixture-pro-signature' };
      return respond(access);
    }
    if (path === 'trial/start') {
      access = { ...access, edition: 'trial', trial: { used: true, startedAt: Date.now(), expiresAt: Date.now() + 30 * 86400000 } };
      return respond(access);
    }
    if (path === 'claim') {
      const product = fixtureCommerce.products.find(item => item.sku === body.sku);
      assert.equal(product.priceCents, 0);
      access = { ...access, items: [...new Set([...access.items, ...product.items])] };
      return respond(access);
    }
    if (path.startsWith('download/')) {
      return route.fulfill({ body: Buffer.from('isolated-download-fixture'), contentType: 'application/octet-stream', headers: apiHeaders });
    }
    if (path === 'checkout') {
      assert.deepEqual(body, { skus: ['pro'] });
      return respond({ url: 'https://charmlet-test.lemonsqueezy.com/checkout/fixture' });
    }
    throw new Error(`Unexpected fixture API request: ${path}`);
  });
  await page.route('https://charmlet-test.lemonsqueezy.com/**', route => route.fulfill({
    contentType: 'text/html', body: '<title>Isolated checkout fixture</title><p>Test checkout</p>',
  }));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#open-offers').click();
  await expect(offers.locator('[type=submit]')).toBeEnabled();
  await offers.locator('[name=email]').fill('offers@charmlet.test');
  await offers.locator('[type=submit]').click();
  await expect(offers.locator('[data-signup-message]')).toContainText('Check your inbox');
  await expect(offers.locator('[name=email]')).toHaveValue('');
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('offers@charmlet.test')), false);
  assert.equal(calls.some(call => call.path === 'trial/start'), false);
  await page.goto(new URL(`download.html#verify=${proof}`, base).href, { waitUntil: 'networkidle' });
  await expect(page.locator('#download-status')).toContainText('subscribed to Charmlet');
  await expect(page.locator('#edition-detail')).toContainText('trial has not started');
  await page.locator('#close-downloads').click();
  await page.goto(new URL('download.html?checkout=1', base).href, { waitUntil: 'networkidle' });
  await expect(page.locator('#portal-signup [name=offers]')).not.toBeChecked();
  await page.locator('#portal-signup [name=email]').fill('review@charmlet.test');
  await page.locator('#portal-signup [type=submit]').click();
  await expect(page.locator('#portal-signup [data-signup-message]')).toContainText('Check your inbox');
  await expect(page.locator('#your-downloads')).toBeHidden();
  await page.goto(new URL(`download.html?checkout=1#verify=${proof}`, base).href, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(new URL('download.html?checkout=1', base).href);
  await expect(page.locator('#your-downloads')).toBeVisible();
  await expect(page.locator('#continue-checkout')).toBeEnabled();
  assert.equal(calls.filter(call => call.path === 'library').length, 0, 'Entering from a basket must not poll for a payment');
  await page.locator('#start-trial').click();
  await expect(page.locator('#edition-name')).toContainText('30-day Pro trial');
  await expect(page.locator('#start-trial')).toBeHidden();
  const [activation] = await Promise.all([page.waitForEvent('download'), page.locator('#save-access').click()]);
  const activationPath = join(output, 'fixture-access.charmlet.json');
  await activation.saveAs(activationPath);
  assert.deepEqual(JSON.parse(await readFile(activationPath, 'utf8')),
    { format: 'charmlet-access', version: 1, token: 'fixture-signature' });
  const freePick = fixtureCommerce.products.find(product => product.kind === 'item'
    && product.available && !product.starter && product.priceCents === 0);
  const freeCard = page.locator('#owned-downloads .download-card').filter({
    has: page.getByRole('heading', { name: freePick.name, exact: true }),
  });
  await Promise.all([page.waitForEvent('download'), freeCard.locator('button').click()]);
  assert.deepEqual(calls.filter(call => call.path === 'claim').map(call => call.body), [{ sku: freePick.sku }]);
  await Promise.all([page.waitForEvent('download'), freeCard.locator('button').click()]);
  assert.equal(calls.filter(call => call.path === 'claim').length, 1);
  const [appDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#app-downloads button').click()]);
  assert.equal(appDownload.suggestedFilename(), installer.filename);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#your-downloads')).toBeVisible();
  assert.equal(calls.filter(call => call.path === 'library').length, 1);
  await page.locator('#continue-checkout').click();
  await page.waitForURL('https://charmlet-test.lemonsqueezy.com/checkout/fixture');
  await page.goto(new URL('download.html?checkout=complete', base).href, { waitUntil: 'networkidle' });
  await expect(page.locator('#continue-checkout')).toBeDisabled();
  paid = true;
  await expect(page.locator('#edition-name')).toContainText('Charmlet Pro', { timeout: 12000 });
  await expect(page.locator('#checkout-section')).toBeHidden();
  assert.equal(calls.filter(call => call.path === 'checkout').length, 1);
  assert.equal(await page.evaluate(() => localStorage.getItem('charmlet-basket-v1')), '[]');
  await page.locator('#close-downloads').click();
  await expect(page.locator('#confirm-email')).toBeVisible();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('charmlet-download-session-v1')), null);
  assert.deepEqual(errors, []);
  const result = { version: manifest.version, charms: 258, artists: 34, athletes: 14, skylines: 13, collections: 18,
    desktop: true, mobileWidths: [390, 320, 768], liveCompanions: 15, puzzleBoards: 3,
    publicDownloadsGated: true, rawPackUrlsExcluded: true, reducedMotion: true,
    checkoutDisabledByDefault: true, connectedPortalFixture: true, offersVerifiedWithoutTrial: true,
    popupDismissal: true, compactAutoTheme: true, consoleErrors: errors };
  await writeFile(join(output, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
