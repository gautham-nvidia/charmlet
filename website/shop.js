import { element } from './site.js';
import { availability, formatPrice, loadCommerce, readCart, saveCart } from './access-client.js';

const grid = document.querySelector('#store-grid'), message = document.querySelector('#store-status');
const search = document.querySelector('#store-search'), collection = document.querySelector('#store-collection');
const price = document.querySelector('#store-price');
let settings, products = [], cart = [], service;
const normalized = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

function toggle(sku) {
  if (sku === 'pro') cart = ['pro'];
  else if (cart.includes(sku)) cart = cart.filter(id => id !== sku);
  else {
    if (cart.length >= 20) { message.textContent = 'Choose up to 20 items, or choose Pro for the whole in-app collection.'; return; }
    cart = [...cart.filter(id => id !== 'pro'), sku];
  }
  saveCart(cart); renderBasket(); render();
  grid.querySelector(`[data-sku="${CSS.escape(sku)}"]`)?.focus({ preventScroll: true });
}

function renderBasket() {
  const list = document.querySelector('#basket-items'); list.replaceChildren();
  const selected = cart.map(sku => settings.products.find(product => product.sku === sku)).filter(Boolean);
  for (const product of selected) {
    const row = element('div', 'basket-row');
    row.append(element('span', '', product.name), element('strong', '', formatPrice(product.priceCents)));
    const remove = element('button', 'text-button', 'Remove');
    remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${product.name}`);
    remove.addEventListener('click', () => { cart = cart.filter(sku => sku !== product.sku); saveCart(cart); renderBasket(); render(); });
    row.append(remove); list.append(row);
  }
  const total = selected.reduce((sum, product) => sum + product.priceCents, 0);
  const pro = settings.products.find(product => product.kind === 'pro');
  document.querySelector('#basket-total').textContent = `${formatPrice(total)} USD`;
  document.querySelector('#basket-continue').hidden = !(selected.length && total >= 50 && service.checkout && settings.salesEnabled);
  document.querySelector('#basket-clear').hidden = !selected.length;
  document.querySelector('#basket-note').textContent = !selected.length ? 'Choose a few favourites.'
    : total < 50 ? '49¢ picks check out with another item. Add one more charm.'
      : !cart.includes('pro') && total >= pro.priceCents ? `Pro includes the entire in-app collection for ${formatPrice(pro.priceCents)}. You can choose it above.`
        : !service.checkout || !settings.salesEnabled ? 'Your picks are saved on this device. Checkout is not open yet.'
          : 'Confirm your email, review your picks, then continue to secure checkout.';
}

function render() {
  const query = normalized(search.value.trim());
  const visible = products.filter(product => (!collection.value || product.collection === collection.value)
    && (price.value === '' || product.priceCents === Number(price.value))
    && (!query || normalized(`${product.name} ${product.collection} ${product.description}`).includes(query)));
  document.querySelector('#store-count').textContent = `${visible.length} charm${visible.length === 1 ? '' : 's'}`;
  grid.replaceChildren();
  for (const product of visible) {
    const card = element('article', 'store-card'), image = element('img');
    image.src = product.preview; image.alt = ''; image.width = 144; image.height = 168; image.loading = 'lazy';
    card.append(image, element('span', 'store-category', product.collection), element('h3', '', product.name));
    const label = product.review ? 'Artwork study' : product.starter ? 'In your free starter' : formatPrice(product.priceCents);
    card.append(element('p', 'store-price', label));
    if (product.review) card.append(element('p', 'store-caption', 'A concept study. Public distribution and sale are not open.'));
    else if (product.priceCents === 0) {
      const link = element('a', 'store-action', product.starter ? 'Get the starter ↗' : 'Get this free pick ↗');
      link.href = './download.html'; card.append(link);
    } else {
      const button = element('button', 'store-action', cart.includes(product.sku) ? 'Added ✓' : 'Add to my picks +');
      button.dataset.sku = product.sku;
      button.type = 'button'; button.setAttribute('aria-pressed', String(cart.includes(product.sku)));
      button.addEventListener('click', () => toggle(product.sku)); card.append(button);
    }
    grid.append(card);
  }
}

document.querySelector('#choose-pro').addEventListener('click', () => {
  toggle('pro'); document.querySelector('.basket').scrollIntoView({ block: 'nearest', behavior: 'instant' });
});
document.querySelector('#basket-clear').addEventListener('click', () => { cart = []; saveCart(cart); renderBasket(); render(); });
search.addEventListener('input', render); collection.addEventListener('change', render); price.addEventListener('change', render);

try {
  settings = await loadCommerce(); service = await availability();
  products = settings.products.filter(product => product.kind === 'item');
  cart = readCart().filter(sku => settings.products.some(product => product.sku === sku && product.available && product.priceCents > 0));
  if (cart.includes('pro') || new URLSearchParams(location.search).get('pick') === 'pro') cart = ['pro'];
  saveCart(cart);
  for (const name of [...new Set(products.map(product => product.collection))]) {
    const option = element('option', '', name); option.value = name; collection.append(option);
  }
  const pro = settings.products.find(product => product.kind === 'pro');
  document.querySelector('#pro-price').textContent = formatPrice(pro.priceCents);
  document.querySelector('[data-starter-count]').textContent = settings.starterCount;
  message.textContent = service.checkout && settings.salesEnabled
    ? service.testMode ? 'Test checkout is open. No real payments are taken in this mode.' : 'Free downloads and one-time purchases. No subscription.'
    : 'Browse and choose your favourites. Email delivery and checkout are being connected; this preview takes no payment.';
  render(); renderBasket();
} catch (error) { message.textContent = error.message; }
