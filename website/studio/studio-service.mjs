import { issueStudioSession, readStudioSession, validateStudioConfig, verifyLemonStudioLicense } from './studio-entitlement.mjs';

const MAX_UNLOCK_BYTES = 4096;
const LIMIT_WINDOW_MS = 60000;
const MAX_UNLOCKS_PER_IP = 10;
const MAX_UNLOCKS_TOTAL = 30;

export function studioConfigFromEnvironment(environment) {
  if (environment.CHARMLET_STUDIO_ENABLED !== '1' || !['test', 'live'].includes(environment.CHARMLET_STUDIO_MODE)) return undefined;
  const readId = name => typeof environment[name] === 'string' && /^[1-9]\d{0,14}$/.test(environment[name])
    ? Number(environment[name]) : Number.NaN;
  const config = {
    storeId: readId('CHARMLET_STUDIO_STORE_ID'),
    productId: readId('CHARMLET_STUDIO_PRODUCT_ID'),
    variantId: readId('CHARMLET_STUDIO_VARIANT_ID'),
    testMode: environment.CHARMLET_STUDIO_MODE === 'test',
    origin: environment.CHARMLET_STUDIO_ORIGIN,
    apiKey: environment.LEMONSQUEEZY_API_KEY?.trim(),
    secret: environment.CHARMLET_STUDIO_SESSION_SECRET,
    checkoutUrl: environment.CHARMLET_STUDIO_CHECKOUT_URL || null,
  };
  return validateStudioConfig(config) ? config : undefined;
}

function reply(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers,
  });
  response.end(JSON.stringify(body));
}
function checkoutUrl(value) {
  if (value === null || value === undefined) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && !url.search && !url.hash
      && url.hostname.endsWith('.lemonsqueezy.com') && url.pathname.startsWith('/checkout/buy/')
      ? url.href : null;
  } catch { return null; }
}
function cookieName(config) { return new URL(config.origin).protocol === 'https:' ? '__Host-charmlet-studio' : 'charmlet-studio-dev'; }
function readCookie(request, name) {
  const raw = request.headers.cookie;
  if (typeof raw !== 'string' || raw.length > 8192) return undefined;
  for (const entry of raw.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 1) continue;
    if (entry.slice(0, separator).trim() === name) return entry.slice(separator + 1).trim();
  }
  return undefined;
}
function sessionCookie(config, token, seconds) {
  const secure = new URL(config.origin).protocol === 'https:';
  return `${cookieName(config)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(seconds))}${secure ? '; Secure' : ''}`;
}
async function unlockBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= MAX_UNLOCK_BYTES) chunks.push(chunk);
  }
  if (size > MAX_UNLOCK_BYTES) throw new Error('too-large');
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || typeof value.key !== 'string') throw new Error('invalid-body');
  return value.key.trim();
}

/** Optional same-origin API. No photo bytes or card-payment information enter this handler. */
export function createStudioHandler(config, { verify = verifyLemonStudioLicense, now = () => Date.now() } = {}) {
  const available = validateStudioConfig(config);
  const ipWindows = new Map();
  let totalWindow = { since: 0, count: 0 };
  function allowAttempt(request, at) {
    for (const [key, record] of ipWindows) if (at < record.since || at - record.since >= LIMIT_WINDOW_MS) ipWindows.delete(key);
    if (at < totalWindow.since || at - totalWindow.since >= LIMIT_WINDOW_MS) totalWindow = { since: at, count: 0 };
    const ip = request.socket.remoteAddress ?? 'local';
    const record = ipWindows.get(ip) ?? { since: at, count: 0 };
    if (record.count >= MAX_UNLOCKS_PER_IP || totalWindow.count >= MAX_UNLOCKS_TOTAL) return false;
    record.count++;
    totalWindow.count++;
    ipWindows.set(ip, record);
    return true;
  }
  return async function handleStudio(request, response, pathname) {
    if (!pathname.startsWith('/api/studio/')) return false;
    if (pathname === '/api/studio/config' && request.method === 'GET') {
      reply(response, 200, { available, checkoutUrl: available ? checkoutUrl(config.checkoutUrl) : null, testMode: available && config.testMode });
      return true;
    }
    if (!available) {
      reply(response, 503, { error: 'Photo Studio is being prepared. Free charm downloads are available now.' });
      return true;
    }
    const at = now();
    if (pathname === '/api/studio/session' && request.method === 'GET') {
      const grant = readStudioSession(readCookie(request, cookieName(config)), config, at);
      reply(response, 200, grant ? { entitled: true, expiresAt: grant.expiresAt, testMode: grant.testMode } : { entitled: false });
      return true;
    }
    if (request.method !== 'POST' || !['/api/studio/unlock', '/api/studio/lock'].includes(pathname)) {
      reply(response, 405, { error: 'Unsupported Photo Studio request.' });
      return true;
    }
    if (request.headers.origin !== new URL(config.origin).origin) {
      reply(response, 403, { error: 'Open Photo Studio from its own website.' });
      return true;
    }
    if (pathname === '/api/studio/lock') {
      request.resume();
      reply(response, 200, { entitled: false }, { 'Set-Cookie': sessionCookie(config, '', 0) });
      return true;
    }
    if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      request.resume();
      reply(response, 415, { error: 'Use a JSON licence request.' });
      return true;
    }
    if (!allowAttempt(request, at)) {
      request.resume();
      reply(response, 429, { error: 'Please wait a minute before trying again.' }, { 'Retry-After': '60' });
      return true;
    }
    const declared = Number(request.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_UNLOCK_BYTES) {
      request.resume();
      reply(response, 413, { error: 'The licence request was too large.' });
      return true;
    }
    let key;
    try { key = await unlockBody(request); }
    catch {
      reply(response, 400, { error: 'Enter a valid Photo Studio licence key.' });
      return true;
    }
    try {
      const grant = await verify(config, key, undefined, now());
      const issuedAt = now();
      const token = issueStudioSession(grant, config, issuedAt);
      key = undefined;
      reply(response, 200, { entitled: true, expiresAt: grant.expiresAt, testMode: grant.testMode },
        { 'Set-Cookie': sessionCookie(config, token, (grant.expiresAt - issuedAt) / 1000) });
    } catch {
      key = undefined;
      reply(response, 403, { error: 'This key could not be verified for Photo Studio. Check it and try again.' });
    }
    return true;
  };
}
