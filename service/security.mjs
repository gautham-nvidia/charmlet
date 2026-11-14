const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function emailAddress(value) {
  if (typeof value !== 'string' || value.length > 254) throw new HttpError(400, 'Enter a valid email address.');
  const email = value.trim();
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.');
  }
  const [local, domain] = email.split('@');
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')
    || domain.split('.').some(label => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) {
    throw new HttpError(400, 'Enter a valid email address.');
  }
  return `${local}@${domain.toLowerCase()}`;
}

export function canonicalEmail(value) {
  const [local, domain] = emailAddress(value).split('@');
  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    const canonical = local.toLowerCase().split('+')[0].replace(/\./g, '');
    if (!canonical) throw new HttpError(400, 'Enter a valid email address.');
    return `${canonical}@gmail.com`;
  }
  // Arbitrary providers may have case-sensitive local parts. Do not merge two different inboxes.
  return `${local}@${domain}`;
}

export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function digest(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
export async function privateHash(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export async function validWebhook(secret, body, supplied) {
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const signature = Uint8Array.from(supplied.match(/../g), value => Number.parseInt(value, 16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, signature, body);
}

export async function boundedBody(request, maximum = 8192) {
  if (Number(request.headers.get('content-length')) > maximum) throw new HttpError(413, 'Request is too large.');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export async function readJson(request, maximum = 8192) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Use JSON for this request.');
  }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBody(request, maximum)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid request.');
  }
}

export function trustedOrigin(value, testMode = false) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || !(url.protocol === 'https:' || testMode && url.protocol === 'http:'
      && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid service origin.');
  return url.origin;
}
