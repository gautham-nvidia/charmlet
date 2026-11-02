import { createHmac, timingSafeEqual } from 'node:crypto';

export const STUDIO_SESSION_MS = 60 * 60 * 1000;
export const MAX_VENDOR_JSON_BYTES = 64 * 1024;
const VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const API_ROOT = 'https://api.lemonsqueezy.com/v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const id = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const time = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const fail = () => { throw new Error('This licence does not grant access to Photo Studio.'); };

export function validateStudioConfig(config) {
  if (!config || !id(config.storeId) || !id(config.productId) || !id(config.variantId)
    || typeof config.testMode !== 'boolean' || typeof config.apiKey !== 'string' || !config.apiKey.trim()
    || typeof config.secret !== 'string' || Buffer.byteLength(config.secret) < 32) return false;
  try {
    const origin = new URL(config.origin);
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return false;
    return origin.protocol === 'https:' || config.testMode && origin.protocol === 'http:'
      && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  } catch { return false; }
}

function expiry(value, now) {
  if (value === null) return now + STUDIO_SESSION_MS;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail();
  const timestamp = Date.parse(value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= now) fail();
  return Math.min(timestamp, now + STUDIO_SESSION_MS);
}

/** Both responses come from the provider; no email, price or raw key enters the grant. */
export function verifyStudioResponses(validation, orderResponse, config, suppliedKey, now) {
  if (!validateStudioConfig(config) || !time(now) || typeof suppliedKey !== 'string') fail();
  const result = object(validation);
  const licence = object(result.license_key);
  const meta = object(result.meta);
  if (result.valid !== true || !id(licence.id) || !['active', 'inactive'].includes(licence.status)
    || licence.key !== suppliedKey || meta.store_id !== config.storeId
    || meta.product_id !== config.productId || meta.variant_id !== config.variantId || !id(meta.order_id)) fail();
  const order = object(object(orderResponse).data);
  const attributes = object(order.attributes);
  if (order.type !== 'orders' || order.id !== String(meta.order_id) || attributes.store_id !== config.storeId
    || attributes.status !== 'paid' || attributes.refunded !== false || attributes.test_mode !== config.testMode) fail();
  return Object.freeze({
    version: 1, storeId: config.storeId, productId: config.productId, variantId: config.variantId,
    testMode: config.testMode, licenseId: licence.id, orderId: meta.order_id,
    issuedAt: now, expiresAt: expiry(licence.expires_at, now),
  });
}

async function boundedJson(response) {
  if (!response.ok || !response.body) throw new Error('Photo Studio could not verify the licence right now.');
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_VENDOR_JSON_BYTES) throw new Error('Licence response was too large.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_VENDOR_JSON_BYTES) {
        await reader.cancel();
        throw new Error('Licence response was too large.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Photo Studio could not read the licence response.'); }
}

/**
 * Exact provider requests. Configuration is off until an owner supplies matching
 * merchant/product IDs and a read-only server API key. Tests inject a fake fetch.
 * No activation/deactivation/payment request is made by this adapter.
 */
export async function verifyLemonStudioLicense(config, key, fetcher = fetch, now = Date.now()) {
  if (!validateStudioConfig(config)) throw new Error('Photo Studio is not configured.');
  if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{10,200}$/.test(key)) fail();
  const validation = await boundedJson(await fetcher(VALIDATE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }).toString(),
    signal: AbortSignal.timeout(10000),
  }));
  const meta = object(object(validation).meta);
  const licence = object(object(validation).license_key);
  // Reject unrelated/invalid keys before making an authenticated order lookup.
  if (object(validation).valid !== true || !id(licence.id) || !['active', 'inactive'].includes(licence.status)
    || licence.key !== key || meta.store_id !== config.storeId || meta.product_id !== config.productId
    || meta.variant_id !== config.variantId || !id(meta.order_id)) fail();
  const order = await boundedJson(await fetcher(`${API_ROOT}/orders/${meta.order_id}`, {
    method: 'GET',
    headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(10000),
  }));
  return verifyStudioResponses(validation, order, config, key, now);
}

function validGrant(grant, config, now) {
  return grant.version === 1 && grant.storeId === config.storeId && grant.productId === config.productId
    && grant.variantId === config.variantId && grant.testMode === config.testMode
    && id(grant.licenseId) && id(grant.orderId) && time(grant.issuedAt) && time(grant.expiresAt)
    && grant.issuedAt <= now && grant.expiresAt > now && grant.expiresAt > grant.issuedAt
    && grant.expiresAt <= grant.issuedAt + STUDIO_SESSION_MS;
}

export function issueStudioSession(grant, config, now) {
  if (!validateStudioConfig(config) || !time(now) || !validGrant(object(grant), config, now)) fail();
  const value = {
    version: 1, storeId: grant.storeId, productId: grant.productId, variantId: grant.variantId,
    testMode: grant.testMode, licenseId: grant.licenseId, orderId: grant.orderId,
    issuedAt: grant.issuedAt, expiresAt: grant.expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  const signature = createHmac('sha256', config.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readStudioSession(token, config, now) {
  if (!validateStudioConfig(config) || !time(now) || typeof token !== 'string' || token.length > 2000) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part))) return null;
  const actual = Buffer.from(parts[1], 'base64url');
  const expected = createHmac('sha256', config.secret).update(parts[0]).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const grant = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return validGrant(object(grant), config, now) ? grant : null;
  } catch { return null; }
}
