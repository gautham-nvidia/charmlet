import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  STUDIO_SESSION_MS, MAX_VENDOR_JSON_BYTES, validateStudioConfig, verifyStudioResponses,
  verifyLemonStudioLicense, issueStudioSession, readStudioSession,
} from '../studio-entitlement.mjs';
import { cropRectangle, inspectPhotoHeader, makePhotoPack, PHOTO_WIDTH, PHOTO_HEIGHT } from '../photo-core.mjs';

const NOW = Date.parse('2026-10-08T18:00:00Z');
const KEY = 'test-licence-key-only';
const config = {
  storeId: 11, productId: 22, variantId: 33, testMode: true,
  origin: 'http://127.0.0.1:4173', apiKey: 'fake-server-api-key',
  secret: 'only-a-test-secret-with-at-least-thirty-two-characters',
};
const validation = (status = 'active') => ({
  valid: true, error: null,
  license_key: { id: 44, status, key: KEY, expires_at: null },
  meta: { store_id: 11, product_id: 22, variant_id: 33, order_id: 55, customer_email: 'private@example.invalid' },
});
const order = () => ({
  data: { type: 'orders', id: '55', attributes: { store_id: 11, status: 'paid', refunded: false, test_mode: true, user_email: 'private@example.invalid' } },
});

test('configuration fails closed without exact identity, secret and safe origin', () => {
  assert.equal(validateStudioConfig(config), true);
  assert.equal(validateStudioConfig({ ...config, testMode: false }), false);
  assert.equal(validateStudioConfig({ ...config, origin: 'https://studio.example.invalid', testMode: false }), true);
  for (const changes of [{ secret: 'short' }, { apiKey: '' }, { storeId: 0 }, { productId: '22' },
    { origin: 'https://user:password@site.example/' }, { origin: 'https://site.example/path' }, { origin: 'http://evil.example/' }]) {
    assert.equal(validateStudioConfig({ ...config, ...changes }), false);
  }
});

test('valid active and inactive licences receive only sanitized scoped grants', () => {
  for (const status of ['active', 'inactive']) {
    const grant = verifyStudioResponses(validation(status), order(), config, KEY, NOW);
    assert.equal(grant.licenseId, 44);
    assert.equal(grant.orderId, 55);
    assert.equal(grant.expiresAt, NOW + STUDIO_SESSION_MS);
    assert.equal(JSON.stringify(grant).includes(KEY), false);
    assert.equal(JSON.stringify(grant).includes('private@example'), false);
  }
});

test('other product/store/variant keys and rejected licences cannot grant access', () => {
  for (const key of ['store_id', 'product_id', 'variant_id']) {
    const value = validation();
    value.meta[key]++;
    assert.throws(() => verifyStudioResponses(value, order(), config, KEY, NOW), /does not grant/);
  }
  for (const status of ['expired', 'disabled', 'unknown']) {
    assert.throws(() => verifyStudioResponses(validation(status), order(), config, KEY, NOW), /does not grant/);
  }
  assert.throws(() => verifyStudioResponses({ ...validation(), valid: false }, order(), config, KEY, NOW), /does not grant/);
  assert.throws(() => verifyStudioResponses(validation(), order(), config, 'somebody-elses-key', NOW), /does not grant/);
});

test('unpaid refunded test/live mismatch and unrelated orders fail closed', () => {
  for (const change of [{ status: 'pending' }, { status: 'refunded' }, { refunded: true }, { test_mode: false }, { store_id: 12 }]) {
    const value = order();
    Object.assign(value.data.attributes, change);
    assert.throws(() => verifyStudioResponses(validation(), value, config, KEY, NOW), /does not grant/);
  }
  const wrongOrder = order();
  wrongOrder.data.id = '56';
  assert.throws(() => verifyStudioResponses(validation(), wrongOrder, config, KEY, NOW), /does not grant/);
});

test('licence expiration bounds the session and timestamps without an explicit timezone are rejected', () => {
  const value = validation();
  value.license_key.expires_at = new Date(NOW + 30000).toISOString();
  assert.equal(verifyStudioResponses(value, order(), config, KEY, NOW).expiresAt, NOW + 30000);
  value.license_key.expires_at = new Date(NOW).toISOString();
  assert.throws(() => verifyStudioResponses(value, order(), config, KEY, NOW));
  value.license_key.expires_at = '2026-10-09 18:00:00';
  assert.throws(() => verifyStudioResponses(value, order(), config, KEY, NOW));
});

test('session signatures reject modification expiry future issuance and another product scope', () => {
  const grant = verifyStudioResponses(validation(), order(), config, KEY, NOW);
  const token = issueStudioSession(grant, config, NOW);
  assert.deepEqual(readStudioSession(token, config, NOW), grant);
  const [payload, signature] = token.split('.');
  const changed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  changed.productId = 999;
  const modified = `${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`;
  assert.equal(readStudioSession(modified, config, NOW), null);
  assert.equal(readStudioSession(token, config, NOW + STUDIO_SESSION_MS), null);
  assert.equal(readStudioSession(token, config, NOW - 1), null);
  assert.equal(readStudioSession(token, { ...config, productId: 999 }, NOW), null);
  assert.equal(readStudioSession(`${payload}.short`, config, NOW), null);
  assert.equal(readStudioSession(token, { ...config, secret: 'another-test-secret-with-at-least-thirty-two-characters' }, NOW), null);
});

test('remote adapter makes exactly the authored validate/order requests and no activation or payment', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify(requests.length === 1 ? validation('inactive') : order()), { status: 200 });
  };
  const grant = await verifyLemonStudioLicense(config, KEY, fetcher, NOW);
  assert.equal(grant.licenseId, 44);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.lemonsqueezy.com/v1/licenses/validate');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body, `license_key=${KEY}`);
  assert.equal(requests[0].options.headers.Authorization, undefined);
  assert.equal(requests[1].url, 'https://api.lemonsqueezy.com/v1/orders/55');
  assert.equal(requests[1].options.method, 'GET');
  assert.equal(requests[1].options.headers.Authorization, 'Bearer fake-server-api-key');
});

test('unrelated or oversized provider replies cannot trigger an authenticated order lookup', async () => {
  let calls = 0;
  const unrelated = validation();
  unrelated.meta.product_id = 999;
  await assert.rejects(verifyLemonStudioLicense(config, KEY, async () => {
    calls++;
    return new Response(JSON.stringify(unrelated));
  }, NOW));
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(verifyLemonStudioLicense(config, KEY, async () => {
    calls++;
    return new Response('x'.repeat(MAX_VENDOR_JSON_BYTES + 1));
  }, NOW), /too large/);
  assert.equal(calls, 1);
});

test('cover cropping stays within wide/tall sources and honors zoom and edge positions', () => {
  assert.deepEqual(cropRectangle(400, 200, 200, 200), { x: 100, y: 0, width: 200, height: 200 });
  assert.deepEqual(cropRectangle(200, 400, 200, 200), { x: 0, y: 100, width: 200, height: 200 });
  assert.deepEqual(cropRectangle(400, 200, 200, 200, 2), { x: 150, y: 50, width: 100, height: 100 });
  assert.equal(cropRectangle(400, 200, 200, 200, 1, 0, 0).x, 0);
  assert.equal(cropRectangle(400, 200, 200, 200, 1, 1, 1).x, 200);
  assert.throws(() => cropRectangle(99999, 99999, 200, 200));
  assert.throws(() => cropRectangle(400, 200, 200, 200, 0.5));
  assert.equal(PHOTO_WIDTH, 216);
  assert.equal(PHOTO_HEIGHT, 252);
});

test('image headers reject oversized decoded dimensions before creating a bitmap', () => {
  const png = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.write('IHDR', 12); png.writeUInt32BE(400, 16); png.writeUInt32BE(200, 20);
  assert.deepEqual(inspectPhotoHeader(png, 'image/png'), { width: 400, height: 200 });
  png.writeUInt32BE(100000, 16);
  assert.throws(() => inspectPhotoHeader(png, 'image/png'), /8192/);
  png.writeUInt32BE(8192, 16); png.writeUInt32BE(8192, 20);
  assert.throws(() => inspectPhotoHeader(png, 'image/png'), /16 million/);
  assert.throws(() => inspectPhotoHeader(new Uint8Array([1,2]), 'image/png'));
});

test('JPEG and WebP dimension variants are read without trusting arbitrary metadata', () => {
  const jpeg = Uint8Array.from([255,216,255,192,0,11,8,0,200,1,144,1,1,17,0,255,217]);
  assert.deepEqual(inspectPhotoHeader(jpeg, 'image/jpeg'), { width: 400, height: 200 });
  const webp = Buffer.alloc(30); webp.write('RIFF'); webp.write('WEBP', 8); webp.write('VP8X', 12);
  webp[24] = 143; webp[25] = 1; webp[27] = 199;
  assert.deepEqual(inspectPhotoHeader(webp, 'image/webp'), { width: 400, height: 200 });
  webp.write('VP8 ', 12); webp[23] = 157; webp[24] = 1; webp[25] = 42;
  webp.writeUInt16LE(400, 26); webp.writeUInt16LE(200, 28);
  assert.deepEqual(inspectPhotoHeader(webp, 'image/webp'), { width: 400, height: 200 });
  webp.write('VP8L', 12); webp[20] = 47; webp[21] = 143; webp[22] = 193; webp[23] = 49; webp[24] = 0;
  assert.deepEqual(inspectPhotoHeader(webp, 'image/webp'), { width: 400, height: 200 });
  assert.throws(() => inspectPhotoHeader(webp, 'image/jpeg'));
});

test('photo pack metadata matches the open importer without allowing inherited frame names or oversize payloads', () => {
  const value = { id: 'photo-test', name: '  A keepsake  ', frame: 'mint', png: 'AAAA' };
  const pack = makePhotoPack(value);
  assert.equal(pack.format, 'charmlet-pack');
  assert.equal(pack.charms[0].name, 'A keepsake');
  assert.equal(pack.charms[0].group, 'Personal Keepsakes');
  assert.throws(() => makePhotoPack({ ...value, frame: '__proto__' }));
  assert.throws(() => makePhotoPack({ ...value, frame: 'constructor' }));
  assert.throws(() => makePhotoPack({ ...value, name: 'bad\nname' }));
  assert.throws(() => makePhotoPack({ ...value, name: 'x'.repeat(49) }));
  assert.equal(makePhotoPack({ ...value, name: 'x'.repeat(48) }).name.length, 48);
  assert.throws(() => makePhotoPack({ ...value, png: Buffer.alloc(256 * 1024 + 1).toString('base64') }));
});
