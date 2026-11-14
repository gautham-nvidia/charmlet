import { applyProductMetadata, element, loadCatalogue, showLoadError } from './site.js';

const grid = document.querySelector('#charm-grid');
const search = document.querySelector('#search');
const filters = document.querySelector('#group-filters');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const story = document.querySelector('#collection-story');
const dialog = document.querySelector('#preview-dialog');
const state = { group: 'All', query: '' };
let catalogue = [];
let collections = [];
const searchText = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

function updateUrl() {
  const url = new URL(location.href);
  if (state.group === 'All') url.searchParams.delete('collection');
  else url.searchParams.set('collection', state.group);
  if (state.query.trim()) url.searchParams.set('q', state.query.trim());
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

function renderGroups() {
  const groups = [{ id: 'All', name: 'All charms', charmIds: catalogue }, ...collections];
  for (const group of groups) {
    const button = element('button', 'group-filter', group.name);
    button.type = 'button';
    button.dataset.group = group.id;
    button.setAttribute('aria-label', group.name);
    button.setAttribute('aria-pressed', String(state.group === group.id));
    const count = element('span', '', String(group.charmIds.length));
    count.setAttribute('aria-hidden', 'true');
    button.append(count);
    button.addEventListener('click', () => {
      state.group = group.id;
      render();
      const controls = document.querySelector('.catalogue-controls');
      if (controls.getBoundingClientRect().top < document.querySelector('.site-header').clientHeight) {
        controls.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    });
    filters.append(button);
  }
}

function renderStory() {
  const collection = collections.find(item => item.id === state.group);
  story.hidden = !collection;
  story.replaceChildren();
  if (!collection) return;
  story.append(element('h2', '', collection.name));
  if (collection.description) story.append(element('p', '', collection.description));
}

function tryCharm(item) {
  if (!dialog.open) dialog.showModal();
  window.CharmletDemo.setCharm(item);
  document.querySelector('#preview-description').textContent = item.description;
  const pack = document.querySelector('#optional-pack');
  const download = document.querySelector('#preview-download');
  pack.hidden = !item.download;
  if (item.download) {
    download.href = item.download;
    download.download = item.download.split('/').pop();
    download.setAttribute('aria-label', `Download ${item.name} charm`);
  } else {
    download.removeAttribute('href');
    download.removeAttribute('download');
  }
  document.querySelector('#preview-close').focus({ preventScroll: true });
}

function charmCard(item) {
  const card = element('li', 'charm-card');
  card.dataset.charmId = item.id;
  const art = element('button', 'card-art');
  art.type = 'button';
  art.setAttribute('aria-label', `Preview ${item.name}`);
  art.setAttribute('aria-haspopup', 'dialog');
  art.addEventListener('click', () => tryCharm(item));
  art.style.setProperty('--charm-accent', item.accent);
  const image = element('img');
  image.src = item.preview;
  image.alt = `${item.name} charm`;
  image.width = 144; image.height = 168; image.loading = 'lazy';
  art.append(image);
  const copy = element('div', 'card-copy');
  copy.append(element('span', 'card-group', item.collectionLabel), element('h3', '', item.name));
  const foot = element('div', 'card-foot');
  const preview = element('button', 'preview-link', 'Try it ↗');
  preview.type = 'button';
  preview.setAttribute('aria-label', `Preview ${item.name}`);
  preview.setAttribute('aria-haspopup', 'dialog');
  preview.addEventListener('click', () => tryCharm(item));
  foot.append(element('span', 'included-label', 'Included'), preview);
  copy.append(foot);
  card.append(art, copy);
  return card;
}

function render() {
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.group === state.group));
  }
  renderStory();
  const query = searchText(state.query.trim());
  const items = catalogue.filter(item => (state.group === 'All' || item.collectionId === state.group)
    && searchText(`${item.name} ${item.description} ${item.collectionLabel} ${item.id}`).includes(query));
  const fragment = document.createDocumentFragment();
  for (const item of items) fragment.append(charmCard(item));
  grid.replaceChildren(fragment);
  emptyState.hidden = items.length > 0;
  resultCount.textContent = `${items.length} ${items.length === 1 ? 'charm' : 'charms'} to discover`;
  updateUrl();
}

search.addEventListener('input', () => { state.query = search.value; render(); });
document.querySelector('#reset-filters').addEventListener('click', () => {
  state.group = 'All'; state.query = ''; search.value = '';
  render(); search.focus();
});
document.querySelector('#preview-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
document.querySelector('#surprise-charm').addEventListener('click', () => {
  if (catalogue.length) tryCharm(catalogue[Math.floor(Math.random() * catalogue.length)]);
});
try {
  const data = await loadCatalogue();
  catalogue = data.charms; collections = data.collections;
  const params = new URL(location.href).searchParams;
  if (collections.some(item => item.id === params.get('collection'))) state.group = params.get('collection');
  state.query = (params.get('q') ?? '').slice(0, 100);
  search.value = state.query;
  applyProductMetadata(data);
  renderGroups();
  render();
  document.querySelector('#surprise-charm').disabled = false;
} catch (error) {
  resultCount.textContent = 'The collection is unavailable.';
  showLoadError(error);
}
