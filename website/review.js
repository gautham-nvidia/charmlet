const grid = document.querySelector('#review-grid');
const search = document.querySelector('#review-search');
const groups = document.querySelector('#review-group');
const count = document.querySelector('#review-count');
const dialog = document.querySelector('#review-dialog');
const state = { family: 'all', group: 'all', query: '', compare: false, dark: false, appSize: true };
let items = [];
const create = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function show(item) {
  document.querySelector('#review-title').textContent = item.name;
  const original = item.decision === 'original';
  document.querySelector('#review-kind').textContent = original ? 'ORIGINAL KEPT' : 'ARTWORK REVIEW';
  const image = document.querySelector('#review-image');
  image.src = original ? `./assets/${item.original}` : item.preview;
  image.alt = original ? `${item.name}, retained original` : `${item.name}, art-review candidate`;
  document.querySelector('#review-detail').textContent = original
    ? 'The original Terminal stays. Select Terminal in the app’s Charms picker; no download is needed.'
    : `${item.group} · ${item.model === 'gcp/google/gemini-3-pro-image' ? 'Gemini 3 Pro Image' : 'AI-generated artwork'} · revision ${item.revision}. ${item.family === 'flowers' ? 'Included as a trial flower illustration. Garden rewards and watering progress remain separate.' : 'Already included in the trial. Optional packs preserve your existing imports.'}`;
  document.querySelector('.review-large').classList.toggle('dark', state.dark);
  dialog.showModal();
}
function artwork(src, label, name) {
  const figure = create('figure');
  const image = create('img'); image.src = src; image.alt = `${name} ${label.toLowerCase()}`; image.width = 216; image.height = 252; image.loading = 'lazy';
  figure.append(image, create('figcaption', '', label));
  return figure;
}
function render() {
  const query = state.query.trim().toLowerCase();
  const matches = items.filter(item => (state.family === 'all' || item.family === state.family)
    && (state.group === 'all' || item.group === state.group)
    && `${item.name} ${item.group} ${item.family}`.toLowerCase().includes(query));
  grid.classList.toggle('comparing', state.compare); grid.classList.toggle('dark', state.dark);
  grid.classList.toggle('app-size', state.appSize);
  grid.replaceChildren();
  for (const item of matches) {
    const card = create('article', 'review-card'); card.dataset.artwork = item.key; card.dataset.decision = item.decision;
    const original = item.decision === 'original';
    const art = create('button', 'review-art'); art.type = 'button'; art.setAttribute('aria-label', `Enlarge ${item.name}`);
    if (state.compare && !original) {
      if (item.original) art.append(artwork(`./assets/${item.original}`, 'Original', item.name));
      else art.append(create('span', 'review-missing', 'New collection design'));
    }
    art.append(artwork(original ? `./assets/${item.original}` : item.preview, original ? 'Original kept' : 'Review artwork', item.name));
    art.addEventListener('click', () => show(item));
    const copy = create('div', 'review-copy');
    const label = original ? 'Original kept' : item.decision === 'retained' ? 'Retained design' : 'New draft';
    copy.append(create('span', 'card-group', item.group), create('h3', '', item.name), create('span', 'review-tag', label));
    if (item.download) {
      const download = create('a', '', 'Optional pack'); download.href = item.download; download.download = item.download.split('/').pop(); download.setAttribute('aria-label', `Download ${item.name} review pack`);
      copy.append(create('p', '', `Included in the trial · ${Math.ceil(item.pngBytes / 1024)} KB artwork`), download);
    } else copy.append(create('p', '', original
      ? 'Already included in the app. Select Terminal in Charms.'
      : 'Included flower illustration. Grow earned keepsakes separately in your garden.'));
    card.append(art, copy); grid.append(card);
  }
  count.textContent = `${matches.length} ${matches.length === 1 ? 'design' : 'designs'} shown · ${state.appSize ? '100% charm size' : 'enlarged previews'}`;
  document.querySelector('#review-empty').hidden = matches.length !== 0;
  for (const button of document.querySelectorAll('[data-family]')) button.setAttribute('aria-pressed', String(button.dataset.family === state.family));
}
search.addEventListener('input', () => { state.query = search.value; render(); });
groups.addEventListener('change', () => { state.group = groups.value; render(); });
for (const button of document.querySelectorAll('[data-family]')) button.addEventListener('click', () => { state.family = button.dataset.family; render(); });
document.querySelector('#view-new').addEventListener('click', () => { state.compare = false; document.querySelector('#view-new').setAttribute('aria-pressed', 'true'); document.querySelector('#view-compare').setAttribute('aria-pressed', 'false'); render(); });
document.querySelector('#view-compare').addEventListener('click', () => { state.compare = true; document.querySelector('#view-new').setAttribute('aria-pressed', 'false'); document.querySelector('#view-compare').setAttribute('aria-pressed', 'true'); render(); });
document.querySelector('#view-dark').addEventListener('click', event => { state.dark = !state.dark; event.currentTarget.setAttribute('aria-pressed', String(state.dark)); render(); });
document.querySelector('#view-size').addEventListener('click', event => {
  state.appSize = !state.appSize; event.currentTarget.setAttribute('aria-pressed', String(state.appSize)); render();
});
document.querySelector('#review-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
try {
  const response = await fetch('./art-review.json');
  if (!response.ok) throw new Error('Review catalogue unavailable');
  const catalogue = await response.json();
  items = catalogue.items.filter(item => item.featured);
  document.querySelector('#review-total').textContent = `${items.length} selected designs · original Terminal kept`;
  for (const group of [...new Set(items.map(item => item.group))]) {
    const option = create('option', '', group); option.value = group; groups.append(option);
  }
  const requestedGroup = new URLSearchParams(location.search).get('group');
  if (items.some(item => item.group === requestedGroup)) { state.group = requestedGroup; groups.value = requestedGroup; }
  for (const bundle of catalogue.bundles ?? []) {
    const link = create('a', '', `${bundle.name} · ${bundle.count}`); link.href = bundle.download; link.download = bundle.download.split('/').pop(); document.querySelector('#bundle-links').append(link);
  }
  document.querySelector('#review-bundles').hidden = !catalogue.bundles?.length;
  render();
} catch { count.textContent = 'The review catalogue is still being prepared. Please reload later.'; }
