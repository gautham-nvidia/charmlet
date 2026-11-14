import { ACCESS_AUDIENCE, TEST_ACCESS_AUDIENCE, MAX_ACCESS_TOKEN_LENGTH, signAccessGrant, verifyAccessGrant } from '../extension/src/access-grant.ts';
import { createLedger } from './ledger.mjs';
import { createProviders } from './providers.mjs';
import { boundedBody, canonicalEmail, digest, emailAddress, HttpError, privateHash,
  randomToken, readJson, trustedOrigin, validWebhook } from './security.mjs';

const MINUTE = 60000;
const positiveId = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
const secret = value => typeof value === 'string' && value.length >= 32;

function configuration(env, catalogue) {
  if (!env.DB || !secret(env.EMAIL_HASH_SECRET) || !env.BREVO_API_KEY || !env.MAIL_FROM
    || !env.SIGNING_KEY || !/^[A-Za-z0-9_-]{1,48}$/.test(env.SIGNING_KEY_ID ?? '')
    || !env.TURNSTILE_SECRET) return null;
  try {
    const origin = trustedOrigin(env.WEB_ORIGIN, env.TEST_MODE === 'true');
    emailAddress(env.MAIL_FROM);
    const jwk = JSON.parse(env.SIGNING_KEY);
    if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.d || !jwk.x) return null;
    const products = new Map(catalogue.products.map(product => [product.sku, Object.freeze(product)]));
    if (products.size !== catalogue.products.length || catalogue.currency !== 'USD'
      || !products.size || [...products.values()].some(product => !/^[a-z0-9][a-z0-9:-]{0,99}$/.test(product.sku)
        || !Number.isSafeInteger(product.priceCents) || ![0, 49, 99, 199, 749, 1749].includes(product.priceCents)
        || !['item', 'installer', 'pro'].includes(product.kind)
        || product.proOnly !== undefined && (typeof product.proOnly !== 'boolean' || product.proOnly && product.kind !== 'item')
        || !Array.isArray(product.items) || product.items.length > 512
        || product.kind === 'item' && !product.items.length
        || product.items.some(item => typeof item !== 'string' || !/^[a-z0-9][a-z0-9:-]{0,99}$/.test(item)))) return null;
    return { origin, jwk, products, payments: Boolean(env.LEMON_API_KEY && secret(env.LEMON_WEBHOOK_SECRET)
      && [env.LEMON_STORE_ID, env.LEMON_PRO_VARIANT_ID, env.LEMON_CART_VARIANT_ID].every(positiveId)) };
  } catch { return null; }
}

/** All dependencies are injected in tests; no HTTP parameter can enable a fake sender or bypass verification. */
export function createAccessService(env, catalogue, dependencies = {}) {
  const config = configuration(env, catalogue), now = dependencies.now ?? Date.now;
  const providers = { ...createProviders(env, dependencies.fetch ?? fetch), ...dependencies.providers };
  const ledger = env.DB ? createLedger(env.DB) : null;
  const mode = env.TEST_MODE === 'true' ? 'test' : 'live';
  const audience = mode === 'test' ? TEST_ACCESS_AUDIENCE : ACCESS_AUDIENCE;
  const fingerprint = (purpose, value) => digest(`${mode}:${purpose}:${value}`);
  let signingKey;
  const hashEmail = value => privateHash(env.EMAIL_HASH_SECRET, `${mode}:email:${canonicalEmail(value)}`);
  const key = () => signingKey ??= crypto.subtle.importKey('jwk', config.jwk, { name: 'Ed25519' }, false, ['sign']);
  const tokenShape = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

  async function limit(request, subject) {
    const time = now(), slot = Math.floor(time / (15 * MINUTE));
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
    const ipHash = await privateHash(env.EMAIL_HASH_SECRET, `ip:${ip}`);
    if (!await ledger.permit(`ip:${ipHash}:${slot}`, 20, time + 30 * MINUTE)
      || subject && !await ledger.permit(`email:${subject}:${slot}`, 3, time + 30 * MINUTE)) {
      throw new HttpError(429, 'Please wait before requesting another link.');
    }
  }

  async function session(request) {
    const value = request.headers.get('authorization')?.replace(/^Bearer /, '');
    if (!tokenShape(value)) throw new HttpError(401, 'Confirm your email to continue.');
    const found = await ledger.findSession(await fingerprint('session', value), now());
    if (!found) throw new HttpError(401, 'This download session expired. Request a fresh email link.');
    if (!await ledger.permit(`session:${found.subject}:${Math.floor(now() / MINUTE)}`, 60, now() + 2 * MINUTE)) {
      throw new HttpError(429, 'Please wait before making more download requests.');
    }
    return found.subject;
  }

  async function library(subject) {
    const ownership = await ledger.ownership(subject), trial = await ledger.trial(subject);
    const issuedAt = Math.floor(now() / 1000);
    const activeTrial = trial && Math.floor(trial.expires_at / 1000) > issuedAt;
    const grant = {
      iss: 'charmlet', aud: audience, sub: subject, iat: issuedAt,
      kind: ownership.pro ? 'pro' : activeTrial ? 'trial' : 'items', items: ownership.items,
      ...(!ownership.pro && activeTrial ? {
        trialStartedAt: Math.floor(trial.started_at / 1000), exp: Math.floor(trial.expires_at / 1000),
      } : {}),
    };
    return { license: await signAccessGrant(grant, await key(), env.SIGNING_KEY_ID),
      edition: grant.kind, items: grant.items,
      trial: trial ? { startedAt: trial.started_at, expiresAt: trial.expires_at, used: true } : { used: false } };
  }

  async function startEmail(request) {
    if (request.headers.get('origin') !== config.origin) throw new HttpError(403, 'Open the Charmlet website to continue.');
    const data = await readJson(request), email = emailAddress(data.email);
    if (!['download', 'trial'].includes(data.purpose) || typeof data.offers !== 'boolean') {
      throw new HttpError(400, 'Choose a download or trial request.');
    }
    if (!await providers.human(data.humanToken)) throw new HttpError(400, 'Please complete the verification and try again.');
    const subject = await hashEmail(email);
    await limit(request, subject);
    const token = randomToken();
    await ledger.challenge({ hash: await fingerprint('email', token), subject, email, purpose: data.purpose,
      offers: data.offers, expiresAt: now() + 15 * MINUTE });
    await providers.email(email, `${config.origin}/download.html#verify=${token}`, data.offers, data.purpose);
    return { status: 202, data: { message: 'Check your inbox for a confirmation link. It expires in 15 minutes.' } };
  }

  async function verifyEmail(request) {
    await limit(request);
    const { token } = await readJson(request);
    if (!tokenShape(token)) throw new HttpError(400, 'This confirmation link is invalid or expired.');
    const proof = await ledger.consumeChallenge(await fingerprint('email', token), now());
    if (!proof) throw new HttpError(400, 'This confirmation link is invalid, expired or already used.');
    if (proof.purpose === 'trial') await ledger.startTrial(proof.subject, now());
    let offersSubscribed = false;
    if (proof.offers) {
      try { offersSubscribed = await providers.subscribe(proof.email); } catch { /* Download delivery is independent. */ }
      await ledger.consent(proof.subject, now(), offersSubscribed);
    }
    const sessionToken = randomToken();
    await ledger.session(await fingerprint('session', sessionToken), proof.subject, now() + 60 * MINUTE);
    return { data: { ...(await library(proof.subject)), session: sessionToken, offersSubscribed,
      offersRequested: Boolean(proof.offers) } };
  }

  async function checkout(request, subject) {
    if (!config.payments || env.CHECKOUT_ENABLED !== 'true') throw new HttpError(503, 'Checkout is not open yet.');
    const { skus } = await readJson(request);
    if (!Array.isArray(skus) || !skus.length || skus.length > 20
      || new Set(skus).size !== skus.length || skus.some(sku => typeof sku !== 'string' || !config.products.has(sku))) {
      throw new HttpError(400, 'Choose up to 20 different available items.');
    }
    const products = skus.map(sku => config.products.get(sku));
    if (products.some(product => product.proOnly || product.priceCents === 0 || product.available !== true)
      || products.some(product => product.kind === 'pro') && products.length !== 1) {
      throw new HttpError(400, 'Choose Pro on its own, or choose available individual items.');
    }
    const ownership = await ledger.ownership(subject);
    if (ownership.pro || products.some(product => product.items.some(id => ownership.items.includes(id)))) {
      throw new HttpError(409, 'Some of these items are already yours. Refresh your downloads.');
    }
    const amount = products.reduce((sum, product) => sum + product.priceCents, 0);
    if (amount < 50) throw new HttpError(400, '49-cent items are sold in bundles. Add another item to continue.');
    const pro = products[0].kind === 'pro';
    const cart = { id: randomToken(), subject, kind: pro ? 'pro' : 'items',
      items: products.flatMap(product => product.items), amount,
      variantId: pro ? env.LEMON_PRO_VARIANT_ID : env.LEMON_CART_VARIANT_ID, createdAt: now() };
    await ledger.cart(cart);
    return { data: { url: await providers.checkout(cart) } };
  }

  async function webhook(request) {
    if (!config.payments) throw new HttpError(503, 'Checkout is not open yet.');
    const body = await boundedBody(request, 256 * 1024);
    if (!await validWebhook(env.LEMON_WEBHOOK_SECRET, body, request.headers.get('x-signature'))) {
      throw new HttpError(401, 'Invalid payment signature.');
    }
    let event;
    try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
    catch { throw new HttpError(400, 'Invalid payment notification.'); }
    const name = event.meta?.event_name;
    if (!['order_created', 'order_refunded'].includes(name)) return { data: { received: true } };
    const order = event.data, attributes = order?.attributes, cartId = event.meta?.custom_data?.charmlet_cart;
    if (order?.type !== 'orders' || !positiveId(order.id) || !tokenShape(cartId)) {
      throw new HttpError(400, 'Unrecognized payment notification.');
    }
    const cart = await ledger.findCart(cartId);
    if (!cart || String(attributes?.store_id) !== env.LEMON_STORE_ID
      || attributes.test_mode !== (env.TEST_MODE === 'true') || attributes.currency !== 'USD'
      || attributes.subtotal !== cart.amount || String(attributes.first_order_item?.variant_id) !== cart.variant_id
      || attributes.first_order_item?.quantity !== 1) throw new HttpError(400, 'Payment does not match this checkout.');
    const discount = attributes.discount_total ?? 0;
    if (!Number.isSafeInteger(discount) || discount < 0 || discount > cart.amount) {
      throw new HttpError(400, 'Payment discount does not match this checkout.');
    }
    if (name === 'order_created' && (attributes.status !== 'paid' || attributes.refunded !== false)) {
      return { data: { received: true } };
    }
    if (name === 'order_refunded' && attributes.refunded !== true) throw new HttpError(400, 'Invalid refund notification.');
    // The provider's paid-order email is authoritative, including if the customer changed it at checkout.
    const subject = await hashEmail(attributes.user_email);
    await ledger.order({ id: `${mode}:${order.id}`, cartId, subject, kind: cart.kind, items: JSON.parse(cart.items),
      amount: cart.amount, status: name === 'order_refunded' ? 'refunded' : 'paid', receivedAt: now() });
    return { data: { received: true } };
  }

  async function download(request, subject, sku) {
    const product = config.products.get(sku);
    if (!product || !product.objectKey || product.available !== true) throw new HttpError(404, 'Download not available.');
    const ownership = await ledger.ownership(subject);
    // A trial unlocks the in-app catalogue. Raw packs require permanent ownership so
    // importing a trial download cannot turn a temporary entitlement into a permanent one.
    const allowed = product.kind === 'installer' || ownership.pro
      || product.items.every(item => ownership.items.includes(item));
    if (!allowed) throw new HttpError(403, 'This item is not part of your current access.');
    if (!env.ASSETS) throw new HttpError(503, 'File delivery is not configured.');
    const object = await env.ASSETS.get(product.objectKey);
    const maximum = product.kind === 'installer' ? 512 * 1024 * 1024 : 2 * 1024 * 1024;
    if (!object || object.size > maximum) throw new HttpError(503, 'This file is not available right now.');
    const filename = product.filename;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(filename)) throw new HttpError(503, 'Invalid delivery configuration.');
    return { stream: object.body, headers: {
      'Content-Type': 'application/octet-stream', 'Content-Length': String(object.size),
      'Content-Disposition': `attachment; filename="${filename}"`,
    } };
  }

  async function route(request, path) {
    if (path === '/v1/status' && request.method === 'GET') {
      return { data: { configured: Boolean(config), checkout: Boolean(config?.payments && env.CHECKOUT_ENABLED === 'true'),
        trialDays: 30, marketing: Boolean(config && env.BREVO_LIST_ID), testMode: env.TEST_MODE === 'true',
        installers: [...(config?.products.values() ?? [])].filter(product => product.kind === 'installer')
          .map(({ sku, available, filename, sha256, bytes }) => ({ sku, available: available === true, filename, sha256, bytes })),
      } };
    }
    if (!config) throw new HttpError(503, 'Email verification and downloads are not open yet.');
    if (path === '/v1/webhooks/lemon' && request.method === 'POST') return webhook(request);
    if (path === '/v1/email/start' && request.method === 'POST') return startEmail(request);
    if (path === '/v1/email/verify' && request.method === 'POST') return verifyEmail(request);
    if (path === '/v1/access/refresh' && request.method === 'POST') {
      const { token } = await readJson(request, MAX_ACCESS_TOKEN_LENGTH + 1024);
      const keys = { ...JSON.parse(env.PREVIOUS_PUBLIC_KEYS ?? '{}'), [env.SIGNING_KEY_ID]: {
        kty: 'OKP', crv: 'Ed25519', x: config.jwk.x, ext: true,
      } };
      const proof = await verifyAccessGrant(token, keys, { audience });
      if (!proof) throw new HttpError(401, 'This activation is not recognized.');
      if (!await ledger.permit(`refresh:${proof.sub}:${Math.floor(now() / MINUTE)}`, 10, now() + 2 * MINUTE)) {
        throw new HttpError(429, 'Please wait before checking access again.');
      }
      return { data: await library(proof.sub) };
    }
    const subject = await session(request);
    if (path === '/v1/library' && request.method === 'GET') return { data: await library(subject) };
    if (path === '/v1/trial/start' && request.method === 'POST') {
      await ledger.startTrial(subject, now());
      return { data: await library(subject) };
    }
    if (path === '/v1/checkout' && request.method === 'POST') return checkout(request, subject);
    if (path === '/v1/claim' && request.method === 'POST') {
      const { sku } = await readJson(request), product = config.products.get(sku);
      if (!product || product.proOnly || product.priceCents !== 0 || product.kind !== 'item' || product.available !== true) {
        throw new HttpError(400, 'Choose an available free item.');
      }
      for (const item of product.items) await ledger.claim(subject, item, now());
      return { data: await library(subject) };
    }
    if (path.startsWith('/v1/download/') && request.method === 'GET') {
      return download(request, subject, decodeURIComponent(path.slice('/v1/download/'.length)));
    }
    throw new HttpError(404, 'Not found.');
  }

  return async request => {
    const origin = request.headers.get('origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", Vary: 'Origin' });
    if (config && origin === config.origin) headers.set('Access-Control-Allow-Origin', origin);
    try {
      if (origin && origin !== config?.origin) throw new HttpError(403, 'This origin is not allowed.');
      if (request.method === 'OPTIONS') {
        if (!config || origin !== config.origin) throw new HttpError(403, 'This origin is not allowed.');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return new Response(null, { status: 204, headers });
      }
      const result = await route(request, new URL(request.url).pathname);
      for (const [name, value] of Object.entries(result.headers ?? {})) headers.set(name, value);
      return new Response(result.stream ?? JSON.stringify(result.data), { status: result.status ?? 200, headers });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 503;
      if (status === 429) headers.set('Retry-After', '900');
      return new Response(JSON.stringify({ error: error instanceof HttpError ? error.message
        : 'The service could not complete this request. Please try again.' }), { status, headers });
    }
  };
}
