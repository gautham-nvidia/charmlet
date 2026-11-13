const SESSION_KEY = 'charmlet-download-session-v1';
const CART_KEY = 'charmlet-basket-v1';
let settingsPromise;

export function loadCommerce() {
  return settingsPromise ??= fetch('./commerce-public.json', { credentials: 'omit' }).then(async response => {
    if (!response.ok) throw new Error('The collection could not be loaded. Please reload.');
    const settings = await response.json();
    if (!Array.isArray(settings.products) || settings.currency !== 'USD') throw new Error('Collection settings were not recognized.');
    if (settings.apiOrigin) {
      const url = new URL(settings.apiOrigin);
      if (url.protocol !== 'https:' || url.origin !== settings.apiOrigin) throw new Error('The download service address is invalid.');
    }
    return settings;
  });
}

export function currentSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    if (value && /^[a-f0-9]{64}$/.test(value.token) && value.expiresAt > Date.now()) return value.token;
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Storage may be disabled. The page can still request a new email link. */ }
  return undefined;
}

let memorySession;
export function rememberSession(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('The download session was not recognized.');
  memorySession = token;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt: Date.now() + 59 * 60000 })); }
  catch { /* A session remains usable in this tab if storage is unavailable. */ }
}

export function forgetSession() {
  memorySession = undefined;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* No persistent session exists. */ }
}

export function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    if (Array.isArray(value) && value.length <= 20 && value.every(sku => typeof sku === 'string'
      && /^[a-z0-9][a-z0-9:-]{0,99}$/.test(sku))) return [...new Set(value)];
  } catch { /* Functional basket storage is optional. */ }
  return [];
}

export function saveCart(skus) {
  if (!Array.isArray(skus) || skus.length > 20) throw new Error('Choose up to 20 items, or unlock the collection with Pro.');
  try { localStorage.setItem(CART_KEY, JSON.stringify([...new Set(skus)])); } catch { /* The current tab still works. */ }
}

export function formatPrice(cents) {
  return cents === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export async function serviceRequest(path, { body, auth = false, binary = false } = {}) {
  const settings = await loadCommerce();
  if (!settings.apiOrigin) throw new Error('Email delivery is not open yet. Nothing has been sent.');
  const headers = { Accept: binary ? 'application/octet-stream' : 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = memorySession ?? currentSession();
    if (!token) throw new Error('Confirm your email to open your downloads.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${settings.apiOrigin}/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers, credentials: 'omit', redirect: 'error',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(binary ? 180000 : 30000),
  });
  if (!response.ok) {
    if (response.status === 401) forgetSession();
    const problem = await response.json().catch(() => ({}));
    throw new Error(typeof problem.error === 'string' ? problem.error : 'That request could not be completed. Please try again.');
  }
  return binary ? response : response.json();
}

export async function availability() {
  const settings = await loadCommerce();
  if (!settings.apiOrigin) return { configured: false, checkout: false, marketing: false };
  return serviceRequest('status').catch(() => ({ configured: false, checkout: false, marketing: false }));
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function saveAccessFile(license) {
  saveBlob(new Blob([JSON.stringify({ format: 'charmlet-access', version: 1, token: license })],
    { type: 'application/json' }), 'charmlet-access.charmlet.json');
}

export async function setupSignup(form, { purpose = 'download', onReady } = {}) {
  const settings = await loadCommerce(), status = await availability();
  const message = form.querySelector('[data-signup-message]');
  const submit = form.querySelector('[type=submit]');
  const offers = form.querySelector('[name=offers]');
  let widget;
  submit.disabled = !status.configured;
  if (offers) {
    offers.checked = false;
    offers.disabled = !status.marketing;
  }
  message.textContent = status.configured
    ? 'We will email a confirmation link. No username, password or payment card.'
    : 'Email signup is not open yet. This preview does not send or collect email.';
  if (status.configured) {
    submit.disabled = true;
    const slot = form.querySelector('[data-human-check]');
    if (!settings.turnstileSiteKey || !slot) {
      message.textContent = 'Email verification is being connected. Please check back soon.';
      return status;
    }
    await new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true; script.onload = resolve; script.onerror = reject;
      document.head.append(script);
    }).catch(() => { message.textContent = 'The verification check could not load. Please reload or try another browser.'; });
    if (!window.turnstile) return status;
    widget = window.turnstile.render(slot, {
      sitekey: settings.turnstileSiteKey, action: 'charmlet-download', callback: () => { submit.disabled = false; },
      'expired-callback': () => { submit.disabled = true; },
      'error-callback': () => { submit.disabled = true; message.textContent = 'Please retry the verification check.'; },
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || submit.disabled) return;
    submit.disabled = true;
    try {
      const result = await serviceRequest('email/start', { body: {
        email: form.querySelector('[name=email]').value.trim(),
        purpose: form.dataset.purpose ?? purpose, offers: offers?.checked === true && status.marketing,
        ...(widget === undefined ? {} : { humanToken: window.turnstile.getResponse(widget) }),
      } });
      message.textContent = result.message;
      form.querySelector('[name=email]').value = '';
      if (offers) offers.checked = false;
      onReady?.();
    } catch (error) { message.textContent = error.message; }
    finally {
      if (widget !== undefined) { window.turnstile.reset(widget); submit.disabled = true; }
      else submit.disabled = false;
    }
  });
  return status;
}
