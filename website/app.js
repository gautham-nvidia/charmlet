const grid = document.querySelector('#charm-grid');
const search = document.querySelector('#search');
const groupFilters = document.querySelector('#group-filters');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const state = { kind: 'extra', group: 'All', query: '' };
let catalogue = [];
const extraCollections = ['Compute & Silicon', 'Test Bench', 'AI & Code', 'Places & Nature'];
const presentationGroup = item => item.collection ?? item.group;
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderStoreLinks(distribution = {}) {
  const links = document.querySelector('#store-links');
  links.replaceChildren();
  for (const [key, label] of [['marketplace', 'View on VS Code Marketplace'], ['openVsx', 'View on Open VSX']]) {
    if (!distribution[key]) continue;
    const link = element('a', 'button button-secondary', label);
    link.href = distribution[key];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    links.append(link);
  }
  const available = links.childElementCount > 0;
  links.hidden = !available;
  document.querySelector('#store-availability').textContent = available ? 'Store links available' : 'After publication';
  document.querySelector('#store-availability').className = `availability ${available ? 'available' : 'upcoming'}`;
  document.querySelector('#store-status').textContent = available
    ? 'Choose an official listing below. Availability inside other editors depends on the catalogue they support.'
    : 'Store listings are being prepared. Until the official links appear here, use the extension file.';
}

function renderGroups() {
  const focusedGroup = groupFilters.contains(document.activeElement) ? document.activeElement.textContent : null;
  let restoreFocus;
  const groups = state.kind === 'extra'
    ? ['All', ...extraCollections]
    : ['All', ...new Set(catalogue.filter(item => item.kind === state.kind).map(presentationGroup))];
  groupFilters.replaceChildren();
  for (const group of groups) {
    const button = element('button', 'group-filter', group);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.group === group));
    button.addEventListener('click', () => { state.group = group; render(); });
    groupFilters.append(button);
    if (group === focusedGroup) restoreFocus = button;
  }
  restoreFocus?.focus({ preventScroll: true });
}
function render() {
  for (const button of document.querySelectorAll('[data-kind]')) {
    button.setAttribute('aria-pressed', String(button.dataset.kind === state.kind));
  }
  renderGroups();
  const query = state.query.trim().toLowerCase();
  const items = catalogue.filter(item => item.kind === state.kind
    && (state.group === 'All' || presentationGroup(item) === state.group)
    && `${item.name} ${item.description} ${presentationGroup(item)}`.toLowerCase().includes(query));
  grid.replaceChildren();
  for (const item of items) {
    const card = element('li', 'charm-card');
    card.dataset.charmId = item.id;
    const art = element('div', 'card-art');
    art.style.setProperty('--charm-accent', item.accent);
    const image = element('img');
    image.src = item.preview;
    image.alt = `${item.name} charm`;
    image.width = 144;
    image.height = 168;
    image.loading = 'lazy';
    art.append(element('span', 'card-cord'), image);
    const copy = element('div', 'card-copy');
    copy.append(element('span', 'card-group', presentationGroup(item)), element('h3', '', item.name), element('p', 'card-description', item.description));
    const foot = element('div', 'card-foot');
    foot.append(element('span', item.kind === 'extra' ? 'price-label' : 'included-label', item.kind === 'extra' ? 'Free' : 'Included with Charmlet'));
    const preview = element('button', 'preview-link', 'Preview');
    preview.type = 'button';
    preview.setAttribute('aria-label', `Preview ${item.name} in the live swing demo`);
    preview.addEventListener('click', () => {
      window.CharmletDemo?.setCharm(item);
      document.querySelector('.hero-demo')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    foot.append(preview);
    if (item.kind === 'extra') {
      const download = element('a', 'download-link', 'Download charm ↓');
      download.href = item.download;
      download.download = `${item.id}.charmlet.json`;
      download.setAttribute('aria-label', `Download ${item.name} charm`);
      foot.append(download);
    }
    copy.append(foot);
    card.append(art, copy);
    grid.append(card);
  }
  emptyState.hidden = items.length !== 0;
  resultCount.textContent = `${items.length} ${items.length === 1 ? 'charm' : 'charms'} to ${state.kind === 'extra' ? 'discover' : 'enjoy right away'}`;
}
for (const button of document.querySelectorAll('[data-kind]')) {
  button.addEventListener('click', () => { state.kind = button.dataset.kind; state.group = 'All'; render(); });
}
for (const link of document.querySelectorAll('[data-select-kind]')) {
  link.addEventListener('click', () => { state.kind = link.dataset.selectKind; state.group = 'All'; state.query = ''; search.value = ''; render(); });
}
search.addEventListener('input', () => { state.query = search.value; render(); });
document.querySelector('#reset-filters').addEventListener('click', () => { state.group = 'All'; state.query = ''; search.value = ''; render(); search.focus(); });
try {
  const response = await fetch(new URL('./catalogue.json', import.meta.url));
  if (!response.ok) throw new Error('Gallery unavailable');
  const data = await response.json();
  catalogue = data.charms;
  renderStoreLinks(data.distribution);
  document.querySelector('#included-count').textContent = String(catalogue.filter(item => item.kind === 'included').length);
  document.querySelector('#extra-count').textContent = String(catalogue.filter(item => item.kind === 'extra').length);
  document.querySelector('#release-label').textContent = `Development preview ${data.version}`;
  for (const link of document.querySelectorAll('.extension-download')) {
    link.href = data.extensionDownload;
    link.download = `charmlet-${data.version}.vsix`;
  }
  render();
} catch {
  resultCount.textContent = 'The gallery could not be loaded. Please reload this page.';
}
