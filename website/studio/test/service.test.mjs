import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createStudioHandler, studioConfigFromEnvironment } from '../studio-service.mjs';
import { verifyStudioResponses, STUDIO_SESSION_MS } from '../studio-entitlement.mjs';

const KEY = 'test-license-key-only';
const NOW = Date.parse('2026-10-08T19:00:00Z');

test('environment activation is explicit and incomplete live settings remain disabled', () => {
  assert.equal(studioConfigFromEnvironment({}), undefined);
  const environment = {
    CHARMLET_STUDIO_ENABLED: '1', CHARMLET_STUDIO_MODE: 'test', CHARMLET_STUDIO_STORE_ID: '11',
    CHARMLET_STUDIO_PRODUCT_ID: '22', CHARMLET_STUDIO_VARIANT_ID: '33',
    CHARMLET_STUDIO_ORIGIN: 'http://127.0.0.1:4173', LEMONSQUEEZY_API_KEY: 'fake-key',
    CHARMLET_STUDIO_SESSION_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
  };
  assert.equal(studioConfigFromEnvironment(environment).productId, 22);
  assert.equal(studioConfigFromEnvironment({ ...environment, CHARMLET_STUDIO_MODE: 'live' }), undefined);
  assert.equal(studioConfigFromEnvironment({ ...environment, CHARMLET_STUDIO_PRODUCT_ID: '22;run' }), undefined);
  assert.equal(studioConfigFromEnvironment({ ...environment, LEMONSQUEEZY_API_KEY: '' }), undefined);
});
async function fixture(context, configured = true) {
  const clock = { value: NOW };
  const calls = [];
  const config = {
    storeId: 11, productId: 22, variantId: 33, testMode: true, origin: 'http://127.0.0.1:1',
    apiKey: 'fake-api-key', secret: 'test-only-secret-with-more-than-thirty-two-characters',
    checkoutUrl: 'https://example.lemonsqueezy.com/checkout/buy/fake-product',
  };
  let handler;
  const server = createServer({ requestTimeout: 15000, headersTimeout: 15000 }, async (request, response) => {
    const path = new URL(request.url, config.origin).pathname;
    if (!await handler(request, response, path)) { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  config.origin = `http://127.0.0.1:${server.address().port}`;
  handler = createStudioHandler(configured ? config : undefined, {
    now: () => clock.value,
    verify: async (_config, key, _fetcher, at) => {
      calls.push(key);
      if (key !== KEY) throw new Error('invalid test key');
      return verifyStudioResponses({
        valid: true, license_key: { id: 44, status: 'inactive', key, expires_at: null },
        meta: { store_id: 11, product_id: 22, variant_id: 33, order_id: 55 },
      }, {
        data: { type: 'orders', id: '55', attributes: { store_id: 11, status: 'paid', refunded: false, test_mode: true } },
      }, config, key, at);
    },
  });
  const request = (path, options) => fetch(`${config.origin}${path}`, options);
  const unlock = (body = { key: KEY }, headers = {}) => request('/api/studio/unlock', {
    method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  return { config, calls, clock, request, unlock };
}

test('unconfigured Photo Studio is unavailable without making a provider request', async context => {
  const f = await fixture(context, false);
  const configResponse = await f.request('/api/studio/config');
  assert.deepEqual(await configResponse.json(), { available: false, checkoutUrl: null, testMode: false });
  const unlock = await f.unlock();
  assert.equal(unlock.status, 503);
  assert.equal(f.calls.length, 0);
});

test('unlock issues a scoped HttpOnly session without exposing the key or buyer information', async context => {
  const f = await fixture(context);
  const response = await f.unlock();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { entitled: true, expiresAt: NOW + STUDIO_SESSION_MS, testMode: true });
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.equal(cookie.includes(KEY), false);
  const session = await f.request('/api/studio/session', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal((await session.json()).entitled, true);
  f.clock.value += STUDIO_SESSION_MS;
  const expired = await f.request('/api/studio/session', { headers: { Cookie: cookie.split(';')[0] } });
  assert.deepEqual(await expired.json(), { entitled: false });
});

test('cross-origin unknown or oversized bodies never reach the licence verifier', async context => {
  const f = await fixture(context);
  assert.equal((await f.unlock({ key: KEY }, { Origin: 'https://other.example.invalid' })).status, 403);
  assert.equal((await f.unlock({ key: KEY, photo: 'Do not accept image data here' })).status, 400);
  assert.equal((await f.unlock({ key: 'x'.repeat(5000) })).status, 413);
  assert.equal(f.calls.length, 0);
  const wrongType = await f.request('/api/studio/unlock', { method: 'POST', headers: { Origin: f.config.origin }, body: KEY });
  assert.equal(wrongType.status, 415);
});

test('forged sessions are rejected and lock expires the existing browser cookie', async context => {
  const f = await fixture(context);
  assert.deepEqual(await (await f.request('/api/studio/session', { headers: { Cookie: 'charmlet-studio-dev=fake.forged' } })).json(), { entitled: false });
  const locked = await f.request('/api/studio/lock', { method: 'POST', headers: { Origin: f.config.origin } });
  assert.equal(locked.status, 200);
  assert.match(locked.headers.get('set-cookie'), /Max-Age=0/);
});

test('unlock attempts are bounded and reset only after the owned rate window', async context => {
  const f = await fixture(context);
  for (let index = 0; index < 10; index++) {
    assert.equal((await f.unlock({ key: 'invalid-test-key' })).status, 403);
  }
  assert.equal((await f.unlock()).status, 429);
  assert.equal(f.calls.length, 10);
  f.clock.value += 60000;
  assert.equal((await f.unlock()).status, 200);
});
