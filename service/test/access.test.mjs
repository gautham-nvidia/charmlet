import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { currentAccess, verifyAccessGrant } from '../../extension/src/access-grant.ts';
import { createAccessService } from '../access-service.mjs';
import { createProviders } from '../providers.mjs';

const ORIGIN = 'https://charmlet.test';
const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const catalogue = { currency: 'USD', products: [
  { sku: 'free', kind: 'item', priceCents: 0, items: ['trial:free'], available: true, objectKey: 'free.json', filename: 'free.charmlet.json' },
  { sku: 'small-a', kind: 'item', priceCents: 49, items: ['trial:small-a'], available: true },
  { sku: 'small-b', kind: 'item', priceCents: 49, items: ['trial:small-b'], available: true },
  { sku: 'paid', kind: 'item', priceCents: 99, items: ['trial:paid'], available: true, objectKey: 'paid.json', filename: 'paid.charmlet.json' },
  { sku: 'review', kind: 'item', priceCents: 199, items: ['trial:review'], available: false },
  { sku: 'pro-included', kind: 'item', priceCents: 0, proOnly: true, items: ['trial:athlete-sample'],
    available: true, objectKey: 'sports.json', filename: 'sports.charmlet.json' },
  { sku: 'pro', kind: 'pro', priceCents: 749, items: [], available: true },
  { sku: 'app-vscode', kind: 'installer', priceCents: 0, items: [], available: true,
    objectKey: 'apps/test.vsix', filename: 'charmlet-test.vsix', sha256: 'a'.repeat(64), bytes: 512 },
] };

function d1(database) {
  const prepare = (sql, values = []) => ({
    bind: (...bindings) => prepare(sql, bindings),
    first: async () => database.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: database.prepare(sql).all(...values) }),
    run: async () => ({ meta: database.prepare(sql).run(...values) }),
  });
  return { prepare, async batch(statements) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      database.exec('COMMIT');
      return results;
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  } };
}

async function fixture(t, testMode = false) {
  const directory = await mkdtemp(join(tmpdir(), 'charmlet-access-'));
  const file = join(directory, 'access.sqlite');
  let database = new DatabaseSync(file);
  database.exec(schema);
  t.after(async () => { database.close(); await rm(directory, { recursive: true, force: true }); });
  const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const keyring = { test: await crypto.subtle.exportKey('jwk', keys.publicKey) };
  const env = {
    DB: d1(database), WEB_ORIGIN: ORIGIN, TEST_MODE: String(testMode), TURNSTILE_SECRET: 'test-only', CHECKOUT_ENABLED: 'true',
    SIGNING_KEY_ID: 'test', SIGNING_KEY: JSON.stringify(await crypto.subtle.exportKey('jwk', keys.privateKey)),
    EMAIL_HASH_SECRET: randomBytes(32).toString('hex'), BREVO_API_KEY: 'test-only', MAIL_FROM: 'hello@charmlet.test',
    LEMON_API_KEY: 'test-only', LEMON_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
    LEMON_STORE_ID: '1', LEMON_PRO_VARIANT_ID: '10', LEMON_CART_VARIANT_ID: '11',
    ASSETS: { get: async key => ({ size: 7, body: `file:${key.slice(0, 2)}` }) },
  };
  let time = Date.UTC(2026, 10, 12, 12);
  const emails = [], carts = [], subscriptions = [];
  const dependencies = {
    now: () => time,
    fetch: async () => { throw new Error('Tests must never reach a real provider.'); },
    providers: {
      email: async (email, link) => { emails.push({ email, token: new URL(link).hash.slice('#verify='.length) }); },
      human: async () => true,
      subscribe: async email => { subscriptions.push(email); return true; },
      checkout: async cart => { carts.push(cart); return 'https://demo.lemonsqueezy.com/checkout/test'; },
    },
  };
  let handler = createAccessService(env, catalogue, dependencies);
  const request = async (path, { method = 'GET', body, session, origin = ORIGIN, signature } = {}) => {
    const headers = new Headers({ Origin: origin, 'CF-Connecting-IP': '192.0.2.1' });
    if (session) headers.set('Authorization', `Bearer ${session}`);
    if (signature) headers.set('X-Signature', signature);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    return handler(new Request(`https://api.charmlet.test/v1/${path}`, {
      method, headers, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    }));
  };
  async function verify(email = 'first@charmlet.test', purpose = 'download', offers = false) {
    const sent = await request('email/start', { method: 'POST', body: { email, purpose, offers } });
    assert.equal(sent.status, 202, await sent.text());
    const response = await request('email/verify', { method: 'POST', body: { token: emails.at(-1).token } });
    assert.equal(response.status, 200);
    return response.json();
  }
  async function payment(cart, { email = 'first@charmlet.test', refunded = false, orderId = '42', changes = {} } = {}) {
    const body = JSON.stringify({
      meta: { event_name: refunded ? 'order_refunded' : 'order_created', custom_data: { charmlet_cart: cart.id } },
      data: { type: 'orders', id: orderId, attributes: {
        store_id: 1, test_mode: env.TEST_MODE === 'true', currency: 'USD', subtotal: cart.amount,
        first_order_item: { variant_id: Number(cart.variantId), quantity: 1 },
        status: refunded ? 'refunded' : 'paid', refunded, user_email: email, ...changes,
      } },
    });
    const signature = createHmac('sha256', env.LEMON_WEBHOOK_SECRET).update(body).digest('hex');
    return request('webhooks/lemon', { method: 'POST', body, signature });
  }
  return { request, verify, payment, env, keyring, emails, carts, subscriptions,
    database: () => database, time: () => time, advance: milliseconds => { time += milliseconds; },
    restart() {
      database.close(); database = new DatabaseSync(file); env.DB = d1(database);
      handler = createAccessService(env, catalogue, dependencies);
    },
  };
}

test('unconfigured service fails closed and exposes no fake download or signup success', async () => {
  const handler = createAccessService({}, catalogue);
  const response = await handler(new Request('https://api.charmlet.test/v1/email/start', { method: 'POST' }));
  assert.equal(response.status, 503);
  const status = await handler(new Request('https://api.charmlet.test/v1/status'));
  assert.deepEqual(await status.json(), { configured: false, checkout: false, trialDays: 30, marketing: false, testMode: false, installers: [] });
});

test('email links are single-use, expire, and optional offers require confirmed consent', async t => {
  const app = await fixture(t);
  const status = await (await app.request('status')).json();
  assert.deepEqual(status.installers, catalogue.products.filter(product => product.kind === 'installer')
    .map(({ sku, available, filename, sha256, bytes }) => ({ sku, available, filename, sha256, bytes })));
  assert.equal(JSON.stringify(status).includes('objectKey'), false);
  assert.equal((await app.request('download/app-vscode')).status, 401);
  const first = await app.verify();
  assert.equal(first.edition, 'items');
  assert.equal(first.trial.used, false);
  assert.equal(app.subscriptions.length, 0);
  assert.equal(app.database().prepare('SELECT email FROM email_challenges').get().email, null);
  const replay = await app.request('email/verify', { method: 'POST', body: { token: app.emails[0].token } });
  assert.equal(replay.status, 400);
  const offers = await app.verify('offers@charmlet.test', 'download', true);
  assert.equal(offers.offersSubscribed, true);
  assert.equal(offers.trial.used, false, 'Joining the offers list must not consume the Pro trial.');
  assert.equal(offers.edition, 'items', 'Marketing consent must not grant Pro access.');
  assert.deepEqual(app.subscriptions, ['offers@charmlet.test']);
  await app.request('email/start', { method: 'POST', body: { email: 'late@charmlet.test', purpose: 'trial', offers: false } });
  app.advance(15 * 60000);
  assert.equal((await app.request('email/verify', { method: 'POST', body: { token: app.emails.at(-1).token } })).status, 400);
});

test('concurrent requests, Gmail aliases, process restart and re-download do not restart a trial', async t => {
  const app = await fixture(t);
  const first = await app.verify('charmlet.test+one@gmail.com', 'trial');
  const endings = await Promise.all(Array.from({ length: 4 }, async () =>
    (await app.request('trial/start', { method: 'POST', session: first.session })).json()));
  assert(endings.every(result => result.trial.expiresAt === first.trial.expiresAt));
  app.restart();
  app.advance(31 * 86400000);
  const again = await app.verify('CharmletTest+two@googlemail.com', 'trial');
  assert.deepEqual(again.trial, first.trial);
  assert.equal(again.edition, 'items');
  assert.equal(app.database().prepare('SELECT COUNT(*) AS count FROM trials').get().count, 1);
  assert.throws(() => app.database().exec('UPDATE trials SET expires_at = expires_at + 2592000000'),
    /cannot be restarted or extended/);
});

test('signed trials expire and reject altered claims, algorithm changes, unknown keys and clock rollback', async t => {
  const app = await fixture(t), result = await app.verify('first@charmlet.test', 'trial');
  const grant = await verifyAccessGrant(result.license, app.keyring);
  assert(grant);
  assert.equal(currentAccess(grant, app.time()), true);
  assert.equal(currentAccess(grant, result.trial.expiresAt), false);
  assert.equal(currentAccess(grant, app.time(), app.time() + 6 * 60000), false);
  assert.equal(await verifyAccessGrant(result.license, {}), undefined);
  const parts = result.license.split('.');
  const forged = Buffer.from(JSON.stringify({ ...grant, kind: 'pro', exp: undefined, trialStartedAt: undefined })).toString('base64url');
  assert.equal(await verifyAccessGrant(`${parts[0]}.${forged}.${parts[2]}`, app.keyring), undefined);
  const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT', kid: 'test' })).toString('base64url');
  assert.equal(await verifyAccessGrant(`${none}.${parts[1]}.${parts[2]}`, app.keyring), undefined);
});

test('checkout prices come from the server, tiny items bundle, and review/duplicate/owned products cannot be charged', async t => {
  const app = await fixture(t), identity = await app.verify();
  const send = body => app.request('checkout', { method: 'POST', session: identity.session, body });
  assert.equal((await send({ skus: ['small-a'] })).status, 400);
  assert.equal((await send({ skus: ['paid', 'paid'] })).status, 400);
  assert.equal((await send({ skus: ['review'] })).status, 400);
  assert.equal((await send({ skus: ['pro-included'] })).status, 400);
  assert.equal((await app.request('claim', { method: 'POST', session: identity.session,
    body: { sku: 'pro-included' } })).status, 400);
  assert.equal((await app.request('download/pro-included', { session: identity.session })).status, 403);
  assert.equal((await send({ skus: ['pro', 'paid'] })).status, 400);
  assert.equal((await send({ skus: ['small-a', 'small-b'], amount: 1, custom_price: 1 })).status, 200);
  assert.equal(app.carts.at(-1).amount, 98);
  assert.equal((await send({ skus: ['pro'], amount: 1 })).status, 200);
  assert.equal(app.carts.at(-1).amount, 749);
  assert.equal((await app.payment(app.carts.at(-1))).status, 200);
  assert.equal((await app.request('download/pro-included', { session: identity.session })).status, 200);
  assert.equal((await send({ skus: ['paid'] })).status, 409);
});

test('only verified, matching payments grant access; duplicates do not duplicate ownership', async t => {
  const app = await fixture(t), identity = await app.verify();
  await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['paid'] } });
  const cart = app.carts[0];
  assert.equal((await app.request('webhooks/lemon', { method: 'POST', body: '{}', signature: '0'.repeat(64) })).status, 401);
  for (const changes of [{ test_mode: true }, { store_id: 2 }, { currency: 'EUR' }, { subtotal: 1 }]) {
    assert.equal((await app.payment(cart, { changes })).status, 400);
  }
  const before = await (await app.request('library', { session: identity.session })).json();
  assert.deepEqual(before.items, []);
  assert.equal((await app.payment(cart)).status, 200);
  assert.equal((await app.payment(cart)).status, 200);
  const after = await (await app.request('library', { session: identity.session })).json();
  assert.deepEqual(after.items, ['trial:paid']);
  assert.equal(app.database().prepare('SELECT COUNT(*) AS count FROM orders').get().count, 1);
  await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['pro'] } });
  const pro = app.carts.at(-1);
  assert.equal((await app.payment(pro, { orderId: '43', changes: { subtotal: 674, discount_total: 75 } })).status, 400);
  assert.equal((await app.payment(pro, { orderId: '43', changes: { discount_total: 750 } })).status, 400);
  assert.equal((await app.payment(pro, { orderId: '43', changes: { discount_total: 75, total: 674 } })).status, 200);
  assert.equal((await (await app.request('library', { session: identity.session })).json()).edition, 'pro');
});

test('private downloads enforce buyer ownership and refund-before-paid cannot restore access', async t => {
  const app = await fixture(t), first = await app.verify(), other = await app.verify('other@charmlet.test');
  await app.request('checkout', { method: 'POST', session: first.session, body: { skus: ['paid'] } });
  assert.equal((await app.request('download/paid', { session: first.session })).status, 403);
  await app.payment(app.carts[0]);
  assert.equal((await app.request('download/paid', { session: other.session })).status, 403);
  const file = await app.request('download/paid', { session: first.session });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('cache-control'), 'no-store');
  assert.equal(file.headers.get('content-disposition'), 'attachment; filename="paid.charmlet.json"');
  assert.equal(await file.text(), 'file:pa');
  await app.payment(app.carts[0], { refunded: true });
  await app.payment(app.carts[0]);
  assert.equal((await app.request('download/paid', { session: first.session })).status, 403);
  assert.deepEqual((await (await app.request('library', { session: first.session })).json()).items, []);
  await app.request('checkout', { method: 'POST', session: other.session, body: { skus: ['paid'] } });
  await app.payment(app.carts[1], { refunded: true, email: 'other@charmlet.test', orderId: '43' });
  await app.payment(app.carts[1], { email: 'other@charmlet.test', orderId: '43' });
  assert.equal((await app.request('download/paid', { session: other.session })).status, 403);
});

test('free downloads do not start a trial, cannot claim paid items, and session expiry is enforced', async t => {
  const app = await fixture(t), identity = await app.verify();
  const paid = await app.request('claim', { method: 'POST', session: identity.session, body: { sku: 'paid' } });
  assert.equal(paid.status, 400);
  const free = await app.request('claim', { method: 'POST', session: identity.session, body: { sku: 'free' } });
  assert.equal(free.status, 200);
  const library = await free.json();
  assert.deepEqual(library.items, ['trial:free']);
  assert.equal(library.trial.used, false);
  assert.equal((await app.request('download/free', { session: identity.session })).status, 200);
  await app.request('trial/start', { method: 'POST', session: identity.session });
  assert.equal((await app.request('download/paid', { session: identity.session })).status, 403);
  app.advance(60 * 60000);
  assert.equal((await app.request('download/free', { session: identity.session })).status, 401);
});

test('native refresh uses a signed identity and consults current ownership after a refund', async t => {
  const app = await fixture(t), identity = await app.verify();
  const bad = await app.request('access/refresh', { method: 'POST', body: { token: 'forged' } });
  assert.equal(bad.status, 401);
  await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['pro'] } });
  await app.payment(app.carts[0]);
  const paid = await (await app.request('access/refresh', { method: 'POST', body: { token: identity.license } })).json();
  assert.equal(paid.edition, 'pro');
  await app.payment(app.carts[0], { refunded: true });
  app.advance(1000);
  const refunded = await (await app.request('access/refresh', { method: 'POST', body: { token: paid.license } })).json();
  assert.equal(refunded.edition, 'items');
  assert((await verifyAccessGrant(refunded.license, app.keyring)).iat > (await verifyAccessGrant(paid.license, app.keyring)).iat);
});

test('mail floods, cross-origin requests and oversized input are rejected without sending messages', async t => {
  const app = await fixture(t), body = { email: 'flood@charmlet.test', purpose: 'download', offers: false };
  const foreign = await app.request('email/start', { method: 'POST', body, origin: 'https://untrusted.test' });
  assert.equal(foreign.status, 403);
  const huge = await app.request('email/start', { method: 'POST', body: { ...body, padding: 'x'.repeat(9000) } });
  assert.equal(huge.status, 413);
  assert.equal(app.emails.length, 0);
  for (let index = 0; index < 3; index++) {
    assert.equal((await app.request('email/start', { method: 'POST', body })).status, 202);
  }
  const blocked = await app.request('email/start', { method: 'POST', body });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '900');
  assert.equal(app.emails.length, 3);
});

test('disabling checkout prevents new charges but does not discard already paid orders', async t => {
  const app = await fixture(t), identity = await app.verify();
  await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['pro'] } });
  app.env.CHECKOUT_ENABLED = 'false';
  assert.equal((await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['pro'] } })).status, 503);
  assert.equal((await app.payment(app.carts[0])).status, 200);
  assert.equal((await (await app.request('library', { session: identity.session })).json()).edition, 'pro');
});

test('provider configuration cannot charge a subscription, variable amount or different currency for lifetime Pro', async () => {
  const env = { LEMON_STORE_ID: '1', LEMON_API_KEY: 'test-only', WEB_ORIGIN: ORIGIN, TEST_MODE: 'true' };
  const cart = { id: 'a'.repeat(64), kind: 'pro', amount: 749, items: [], variantId: '10', createdAt: Date.now() };
  for (const setup of [
    { is_subscription: true, pay_what_you_want: false, currency: 'USD' },
    { is_subscription: false, pay_what_you_want: true, currency: 'USD' },
    { is_subscription: false, pay_what_you_want: false, currency: 'EUR' },
    { is_subscription: false, pay_what_you_want: false, currency: 'USD' },
  ]) {
    let charges = 0, expectedKind = 'pro';
    const providers = createProviders(env, async (url, options) => {
      if (url.endsWith('/variants/10')) return Response.json({ data: { type: 'variants', id: '10', attributes: setup } });
      if (url.endsWith('/stores/1')) return Response.json({ data: { type: 'stores', id: '1', attributes: setup } });
      assert.equal(url, 'https://api.lemonsqueezy.com/v1/checkouts');
      const checkout = JSON.parse(options.body).data.attributes;
      assert.equal(checkout.custom_price, 749);
      assert.equal(checkout.test_mode, true);
      assert.equal(checkout.checkout_options.discount, expectedKind === 'pro');
      assert.equal(checkout.product_options.redirect_url, `${ORIGIN}/download.html?checkout=complete`);
      charges++;
      return Response.json({ data: { attributes: { url: 'https://demo.lemonsqueezy.com/checkout/test' } } });
    });
    if (setup.is_subscription || setup.pay_what_you_want || setup.currency !== 'USD') {
      await assert.rejects(providers.checkout(cart), /one-time USD/);
      assert.equal(charges, 0);
    } else {
      assert.equal(await providers.checkout(cart), 'https://demo.lemonsqueezy.com/checkout/test');
      assert.equal(charges, 1);
      expectedKind = 'items';
      await providers.checkout({ ...cart, kind: 'items', items: ['trial:paid'] });
      assert.equal(charges, 2);
    }
  }
});

test('sandbox purchases, email links, sessions and activations cannot become live access', async t => {
  const app = await fixture(t, true), identity = await app.verify('first@charmlet.test', 'trial');
  await app.request('checkout', { method: 'POST', session: identity.session, body: { skus: ['pro'] } });
  await app.payment(app.carts[0]);
  const sandbox = await (await app.request('library', { session: identity.session })).json();
  assert.equal(sandbox.edition, 'pro');
  assert.equal(await verifyAccessGrant(sandbox.license, app.keyring), undefined);
  assert.equal((await verifyAccessGrant(sandbox.license, app.keyring, { audience: 'charmlet-apps-test' })).kind, 'pro');
  await app.request('email/start', { method: 'POST', body: { email: 'second@charmlet.test', purpose: 'download', offers: false } });
  const oldLink = app.emails.at(-1).token;
  app.env.TEST_MODE = 'false'; app.restart();
  assert.equal((await app.request('library', { session: identity.session })).status, 401);
  assert.equal((await app.request('email/verify', { method: 'POST', body: { token: oldLink } })).status, 400);
  assert.equal((await app.request('access/refresh', { method: 'POST', body: { token: sandbox.license } })).status, 401);
  const live = await app.verify();
  assert.equal(live.edition, 'items'); assert.equal(live.trial.used, false);
  await app.request('checkout', { method: 'POST', session: live.session, body: { skus: ['pro'] } });
  await app.payment(app.carts.at(-1));
  assert.equal((await (await app.request('library', { session: live.session })).json()).edition, 'pro');
  assert.equal(app.database().prepare('SELECT COUNT(*) AS n FROM orders').get().n, 2);
});
