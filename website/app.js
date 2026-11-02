const grid = document.querySelector('#charm-grid');
const search = document.querySelector('#search');
const groupFilters = document.querySelector('#group-filters');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const story = document.querySelector('#collection-story');
const dialog = document.querySelector('#art-dialog');
const state = { kind: 'extra', group: 'All', query: '' };
let catalogue = [];
let collections = [];
let artPreviews = [];
let sportsWishlist;
const presentationGroup = item => item.collectionLabel ?? item.collection ?? item.group;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
function viewArt(preview) {
  document.querySelector('#art-dialog-title').textContent = preview.name;
  const image = document.querySelector('#art-dialog-image');
  image.src = preview.preview;
  image.alt = `${preview.name}: AI-generated art-direction preview`;
  document.querySelector('#art-dialog-note').textContent = preview.note;
  dialog.showModal();
}
function artButton(preview, className = 'art-study') {
  const button = element('button', className);
  button.type = 'button';
  button.dataset.preview = preview.id;
  button.setAttribute('aria-label', `View ${preview.name} art preview`);
  const image = element('img');
  image.src = preview.preview;
  image.alt = '';
  image.width = 512;
  image.height = 512;
  image.loading = 'lazy';
  const copy = element('span', 'art-study-copy');
  copy.append(element('span', 'preview-tag', 'Art preview'), element('strong', '', preview.name), element('span', '', preview.note));
  button.append(image, copy);
  button.addEventListener('click', () => viewArt(preview));
  return button;
}
function chooseWorld(id) {
  state.kind = 'extra';
  state.group = id;
  state.query = '';
  search.value = '';
  render();
  document.querySelector('#catalogue').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}
function renderWorlds() {
  const worlds = document.querySelector('#collection-worlds');
  worlds.replaceChildren();
  for (const world of collections) {
    const button = element('button', 'world-card');
    button.type = 'button';
    button.dataset.world = world.id;
    button.style.setProperty('--world-accent', world.accent);
    button.setAttribute('aria-label', `Explore ${world.name}`);
    const monogram = element('span', 'world-monogram', world.code);
    monogram.setAttribute('aria-hidden', 'true');
    button.append(monogram, element('strong', '', world.name), element('span', 'world-status', world.charmIds.length
      ? `${world.charmIds.length} classic ${world.charmIds.length === 1 ? 'design' : 'designs'}` : world.preview ? 'New art preview' : 'On the drawing board'));
    button.addEventListener('click', () => chooseWorld(world.id));
    worlds.append(button);
  }
  const studies = document.querySelector('#art-studies');
  studies.replaceChildren(...artPreviews.map(preview => artButton(preview)));
}
function renderGroups() {
  const focusedGroup = groupFilters.contains(document.activeElement) ? document.activeElement.dataset.group : undefined;
  const groups = [{ id: 'All', name: 'All' }, ...(state.kind === 'extra' ? collections
    : [...new Set(catalogue.filter(item => item.kind === 'included').map(presentationGroup))].map(name => ({ id: name, name })))];
  groupFilters.replaceChildren();
  let restoreFocus;
  for (const group of groups) {
    const button = element('button', 'group-filter', group.name);
    button.type = 'button';
    button.dataset.group = group.id;
    button.setAttribute('aria-pressed', String(state.group === group.id));
    button.addEventListener('click', () => { state.group = group.id; render(); });
    groupFilters.append(button);
    if (group.id === focusedGroup) restoreFocus = button;
  }
  restoreFocus?.focus({ preventScroll: true });
}
function renderStory() {
  const world = state.kind === 'extra' ? collections.find(item => item.id === state.group) : undefined;
  story.replaceChildren();
  story.hidden = !world;
  if (!world) return;
  story.style.setProperty('--world-accent', world.accent);
  const copy = element('div', 'collection-story-copy');
  copy.append(element('p', 'eyebrow', 'YOUR NEXT LITTLE WORLD'), element('h3', '', world.name), element('p', '', world.description));
  const ideas = element('ul', 'idea-tags');
  for (const idea of world.ideas) ideas.append(element('li', '', idea));
  copy.append(ideas);
  if (!world.charmIds.length) copy.append(element('p', 'collection-note', 'This collection is being drawn. These are ideas and previews, not downloadable packs yet.'));
  if (world.rightsReview && sportsWishlist) {
    const wishlist = element('div', 'sports-wishlist');
    wishlist.append(element('h4', '', 'Athletes & match-day wishlist'));
    const names = element('ul', 'idea-tags');
    for (const name of [...sportsWishlist.athletes, ...sportsWishlist.competitions]) names.append(element('li', '', name));
    wishlist.append(names, element('p', 'collection-note', sportsWishlist.notice));
    copy.append(wishlist);
  }
  story.append(copy);
  const preview = artPreviews.find(item => item.id === world.preview);
  if (preview) story.append(artButton(preview, 'story-art'));
}
function tryCharm(item) {
  window.CharmletDemo?.setCharm(item);
  document.querySelector('.hero-demo').scrollIntoView({ behavior: 'instant', block: 'center' });
}
function render() {
  for (const button of document.querySelectorAll('[data-kind]')) button.setAttribute('aria-pressed', String(button.dataset.kind === state.kind));
  for (const button of document.querySelectorAll('[data-world]')) button.setAttribute('aria-pressed', String(state.kind === 'extra' && state.group === button.dataset.world));
  renderGroups();
  renderStory();
  const query = state.query.trim().toLowerCase();
  const items = catalogue.filter(item => item.kind === state.kind
    && (state.group === 'All' || (state.kind === 'extra' ? item.collectionId === state.group : presentationGroup(item) === state.group))
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
    foot.append(element('span', item.kind === 'extra' ? 'price-label' : 'included-label', item.kind === 'extra' ? 'Free classic' : 'Included with Charmlet'));
    const preview = element('button', 'preview-link', 'Try it');
    preview.type = 'button';
    preview.setAttribute('aria-label', `Preview ${item.name} in the live swing demo`);
    preview.addEventListener('click', () => tryCharm(item));
    foot.append(preview);
    if (item.kind === 'extra') {
      const download = element('a', 'download-link', 'Download charm');
      download.href = item.download;
      download.download = `${item.id}.charmlet.json`;
      download.setAttribute('aria-label', `Download ${item.name} charm`);
      foot.append(download);
    }
    copy.append(foot);
    card.append(art, copy);
    grid.append(card);
  }
  const planned = state.kind === 'extra' && collections.some(world => world.id === state.group && !world.charmIds.length);
  emptyState.hidden = items.length !== 0 || (planned && !query);
  resultCount.textContent = planned && !query ? 'New collection in progress. Explore the art preview and ideas above.'
    : `${items.length} ${items.length === 1 ? 'charm' : 'charms'} to ${state.kind === 'extra' ? 'discover' : 'enjoy right away'}`;
}
for (const button of document.querySelectorAll('[data-kind]')) {
  button.addEventListener('click', () => { state.kind = button.dataset.kind; state.group = 'All'; render(); });
}
for (const link of document.querySelectorAll('[data-select-kind]')) {
  link.addEventListener('click', () => { state.kind = link.dataset.selectKind; state.group = 'All'; state.query = ''; search.value = ''; render(); });
}
search.addEventListener('input', () => { state.query = search.value; render(); });
document.querySelector('#reset-filters').addEventListener('click', () => { state.group = 'All'; state.query = ''; search.value = ''; render(); search.focus(); });
document.querySelector('#art-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelector('#surprise-charm').addEventListener('click', () => {
  const choices = catalogue.filter(item => item.kind === 'extra');
  if (choices.length) tryCharm(choices[Math.floor(Math.random() * choices.length)]);
});
const gardenStages = [
  ['seed', 'One small beginning.', 'Plant a surprise seed in the app.'],
  ['sprout', 'A little care goes a long way.', 'Water once per local day.'],
  ['leaves', 'Grow at your own pace.', 'Missing a day never removes progress.'],
  ['bud', 'Something lovely is on its way.', 'Keep watering on different days.'],
  ['sunflower', 'Grown by you. Kept forever.', 'On watering eleven, a random flower joins your collection. This sunflower is one example.'],
];
for (const button of document.querySelectorAll('[data-garden-stage]')) {
  button.addEventListener('click', () => {
    const stage = gardenStages[Number(button.dataset.gardenStage)];
    const image = document.querySelector('#garden-demo-image');
    image.src = `./assets/garden/${stage[0]}.svg`;
    image.alt = `${stage[0]} growth preview`;
    document.querySelector('#garden-demo-title').textContent = stage[1];
    document.querySelector('#garden-demo-copy').textContent = stage[2];
    for (const choice of document.querySelectorAll('[data-garden-stage]')) choice.setAttribute('aria-pressed', String(choice === button));
  });
}
try {
  const response = await fetch(new URL('./catalogue.json', import.meta.url));
  if (!response.ok) throw new Error('Gallery unavailable');
  const data = await response.json();
  catalogue = data.charms;
  collections = data.collections;
  artPreviews = data.artPreviews;
  sportsWishlist = data.sportsWishlist;
  renderStoreLinks(data.distribution);
  renderWorlds();
  document.querySelector('#included-count').textContent = String(catalogue.filter(item => item.kind === 'included').length);
  document.querySelector('#extra-count').textContent = String(catalogue.filter(item => item.kind === 'extra').length);
  document.querySelector('#release-label').textContent = `Development preview ${data.version}`;
  document.querySelector('#surprise-charm').disabled = false;
  for (const link of document.querySelectorAll('.extension-download')) {
    link.href = data.extensionDownload;
    link.download = `charmlet-${data.version}.vsix`;
  }
  render();
} catch {
  resultCount.textContent = 'The gallery could not be loaded. Please reload this page.';
}
