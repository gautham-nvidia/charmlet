import { element } from './site.js';
import { availability, currentSession, forgetSession, formatPrice, loadCommerce, readCart, rememberSession,
  saveAccessFile, saveBlob, saveCart, serviceRequest, setupSignup } from './access-client.js';

function consumeVerification() {
  const token = location.hash.startsWith('#verify=') ? location.hash.slice(8) : null;
  if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
  return token;
}
const verification = consumeVerification();
const message = document.querySelector('#download-status'), form = document.querySelector('#portal-signup');
const params = new URLSearchParams(location.search);
let library, settings, service, pollTimer, polls = 0;
let checkoutPending = false;
const owns = product => product.kind === 'pro' ? library?.edition === 'pro'
  : library?.edition === 'pro' || product.items.every(id => library?.items.includes(id));

function showError(error) { message.textContent = error.message ?? 'That request could not be completed. Please try again.'; }

async function downloadProduct(product, button) {
  button.disabled = true;
  try {
    if (product.kind === 'item' && product.priceCents === 0 && !owns(product)) {
      library = await serviceRequest('claim', { auth: true, body: { sku: product.sku } });
    }
    if (product.delivery === 'activation') {
      saveAccessFile(library.license);
      message.textContent = 'Access file saved. Import it into Charmlet to use your extra companions.';
    } else {
      const response = await serviceRequest(`download/${encodeURIComponent(product.sku)}`, { auth: true, binary: true });
      saveBlob(await response.blob(), product.filename);
      message.textContent = `${product.name} is ready. Check your browser's downloads.`;
    }
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
}

function downloadCard(product) {
  const card = element('article', 'download-card');
  card.append(element('h3', '', product.name));
  card.append(element('p', '', product.kind === 'installer' ? 'Free starter edition'
    : product.priceCents === 0 ? 'Free to keep' : 'Included in your purchases'));
  const button = element('button', 'pill pill-dark', product.delivery === 'activation' ? 'Save access file ↓' : 'Download ↓');
  button.type = 'button'; button.addEventListener('click', () => downloadProduct(product, button));
  card.append(button);
  if (product.sha256) {
    const details = element('details', 'file-checksum');
    details.append(element('summary', '', 'File checksum (SHA-256)'), element('code', '', product.sha256));
    card.append(details);
  }
  return card;
}

function renderCheckout() {
  const selected = readCart().map(sku => settings.products.find(item => item.sku === sku)).filter(Boolean);
  const cart = selected.filter(product => !owns(product));
  if (cart.length !== selected.length) saveCart(cart.map(product => product.sku));
  if (selected.length && !cart.length) {
    message.textContent = 'Your purchase is ready. Save the updated access file to activate it in your apps.';
    clearTimeout(pollTimer); checkoutPending = false;
  }
  const section = document.querySelector('#checkout-section'), list = document.querySelector('#checkout-items');
  section.hidden = !cart.length; list.replaceChildren();
  for (const product of cart) list.append(element('p', '', `${product.name} · ${formatPrice(product.priceCents)}`));
  const total = cart.reduce((sum, product) => sum + product.priceCents, 0);
  document.querySelector('#checkout-total').textContent = `Subtotal ${formatPrice(total)} USD. Any applicable tax is shown at checkout.`;
  const valid = cart.length > 0 && total >= 50 && cart.every(product => product.available && !owns(product))
    && (cart.length === 1 || cart.every(product => product.kind !== 'pro'));
  document.querySelector('#continue-checkout').disabled = !valid || !service.checkout || !settings.salesEnabled || checkoutPending;
  document.querySelector('#checkout-note').textContent = !service.checkout || !settings.salesEnabled
    ? 'Checkout is not open yet. Nothing will be charged from this preview.'
    : total < 50 ? '49¢ picks check out with another item. Add one more charm.'
      : service.testMode ? 'Test checkout only. Use the payment provider’s test details; no real charge is made.'
        : 'One-time payment. Your browser returns here after checkout; purchases appear after payment verification.';
}

function renderLibrary() {
  document.querySelector('#confirm-email').hidden = true;
  document.querySelector('#your-downloads').hidden = false;
  const active = library.edition === 'trial';
  document.querySelector('#edition-name').textContent = (library.edition === 'pro' ? 'Charmlet Pro'
    : active ? 'Your 30-day Pro trial' : 'Your free starter & extras') + (service.testMode ? ' · Test mode' : '');
  document.querySelector('#save-access').textContent = service.testMode ? 'Save test access file ↓' : 'Save my access file ↓';
  document.querySelector('#edition-detail').textContent = library.edition === 'pro'
    ? 'The entire in-app collection, across your current apps. One permanent purchase.'
    : active ? `Your trial ends ${new Date(library.trial.expiresAt).toLocaleString()}. No automatic charge follows.`
      : library.trial.used ? 'Your trial has ended. Free and individually purchased charms, photos and progress remain.'
        : 'Free to keep. Your 30-day Pro trial has not started.';
  document.querySelector('#start-trial').hidden = library.trial.used || library.edition === 'pro';
  document.querySelector('#test-mode-note').hidden = !service.testMode;
  document.querySelector('#app-downloads').replaceChildren(...settings.products
    .filter(product => product.kind === 'installer' && product.available).map(downloadCard));
  if (!document.querySelector('#app-downloads').childElementCount) {
    document.querySelector('#app-downloads').append(element('p', '', 'The app installers have not been published yet. Please check back soon.'));
  }
  const extras = document.querySelector('#owned-downloads');
  const products = settings.products.filter(product => product.kind === 'item' && product.available && !product.starter
    && (product.priceCents === 0 || owns(product)));
  extras.replaceChildren(...products.map(downloadCard));
  if (!products.length) extras.append(element('p', '', 'Your extras will appear here. Your starter companions are already in the app.'));
  renderCheckout();
}

async function refreshLibrary() {
  library = await serviceRequest('library', { auth: true }); renderLibrary();
}

async function confirmEmail(token) {
  clearTimeout(pollTimer); checkoutPending = false; polls = 0;
  message.textContent = 'Confirming your email…';
  const result = await serviceRequest('email/verify', { body: { token } });
  rememberSession(result.session); library = result;
  message.textContent = 'Email confirmed. Choose your app and save your access file below.';
  renderLibrary();
}

function watchCheckoutReturn() {
  if (library && params.get('checkout') === 'complete' && readCart().length) {
    checkoutPending = true; renderCheckout();
    message.textContent = 'Checking for your confirmed payment…'; void pollPayment();
  }
}

async function pollPayment() {
  if (!checkoutPending || polls++ >= 12) {
    if (checkoutPending) message.textContent = 'Payment confirmation is taking longer than usual. Check again shortly. If you changed the email at checkout, request a link for that payment email.';
    return;
  }
  try { await refreshLibrary(); } catch (error) { showError(error); return; }
  if (checkoutPending) pollTimer = setTimeout(pollPayment, 5000);
}

document.querySelector('#save-access').addEventListener('click', () => { if (library) saveAccessFile(library.license); });
document.querySelector('#close-downloads').addEventListener('click', () => {
  forgetSession(); library = undefined; clearTimeout(pollTimer); checkoutPending = false;
  document.querySelector('#your-downloads').hidden = true;
  document.querySelector('#confirm-email').hidden = false;
  message.textContent = 'This tab’s download session is closed. Your purchases remain available by email.';
  form.querySelector('[name=email]').focus();
});
document.querySelector('#start-trial').addEventListener('click', async event => {
  event.currentTarget.disabled = true;
  try {
    library = await serviceRequest('trial/start', { auth: true, body: {} }); renderLibrary();
    message.textContent = 'Your original trial deadline is shown above. Save the access file and import it into your apps.';
  } catch (error) { showError(error); }
  finally { document.querySelector('#start-trial').disabled = false; }
});
document.querySelector('#continue-checkout').addEventListener('click', async event => {
  event.currentTarget.disabled = true;
  try {
    const { url } = await serviceRequest('checkout', { auth: true, body: { skus: readCart() } });
    const checkout = new URL(url);
    if (checkout.protocol !== 'https:' || !checkout.hostname.endsWith('.lemonsqueezy.com')
      || checkout.username || checkout.password || checkout.port) throw new Error('The checkout address was not recognized.');
    // A short session survives the same-tab provider redirect; no token is placed in the URL.
    location.assign(checkout.href);
  } catch (error) { showError(error); renderCheckout(); }
});

async function initialize() {
  settings = await loadCommerce(); service = await availability();
  // Pages builds do not contain private archives. The service reports what was
  // actually staged for delivery, independently of the static site's build host.
  settings = { ...settings, products: settings.products.map(product => {
    if (product.kind !== 'installer') return product;
    const published = service.installers?.find(item => item.sku === product.sku);
    const valid = published?.available === true && typeof published.filename === 'string'
      && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,140}$/.test(published.filename);
    return { ...product, available: valid,
      ...(valid ? { filename: published.filename,
        sha256: /^[a-f0-9]{64}$/.test(published.sha256 ?? '') ? published.sha256 : undefined,
        bytes: published.bytes } : {}) };
  }) };
  if (params.has('trial')) {
    form.dataset.purpose = 'trial';
    document.querySelector('#confirm-title').textContent = 'Try the whole collection for 30 days';
    document.querySelector('#request-description').textContent = 'Your trial starts when you confirm your email. One trial per email, no card and no automatic charge. Re-downloading does not restart it.';
  }
  await setupSignup(form);
  if (verification) {
    await confirmEmail(verification);
  } else if (currentSession()) {
    await refreshLibrary(); message.textContent = 'Your downloads are ready.';
  } else {
    message.textContent = service.configured ? 'Confirm your email to open your downloads.'
      : 'Downloads and email signup are not open yet. This preview does not send email or take payment.';
  }
  watchCheckoutReturn();
}
const ready = initialize().catch(showError);
let verificationQueue = ready;
window.addEventListener('hashchange', () => {
  const token = consumeVerification();
  if (token) verificationQueue = verificationQueue.then(async () => {
    await confirmEmail(token); watchCheckoutReturn();
  }).catch(showError);
});
await ready;
window.addEventListener('pagehide', () => clearTimeout(pollTimer));
