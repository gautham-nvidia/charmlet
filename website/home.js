import { applyProductMetadata, element, loadCatalogue, revealSections, showLoadError } from './site.js';

function setupInstallTabs() {
  const tabs = [...document.querySelectorAll('.install-tabs [role=tab]')];
  function selectTab(selected) {
    for (const tab of tabs) {
      const active = selected === tab;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }
  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[index]);
      tabs[index].focus();
    });
  }
}

function setupGarden() {
  const stages = [
    ['seed', 'One small beginning.', 'Plant a surprise seed in the app.'],
    ['sprout', 'A little care goes a long way.', 'Water once per local day.'],
    ['leaves', 'Grow at your own pace.', 'Missing a day never removes progress.'],
    ['bud', 'Something lovely is on its way.', 'Keep watering on different days.'],
    ['sunflower', 'Grown by you. Kept forever.', 'On watering eleven, a random flower joins your collection. This sunflower is one example.'],
  ];
  for (const button of document.querySelectorAll('[data-garden-stage]')) {
    button.addEventListener('click', () => {
      const [file, title, copy] = stages[Number(button.dataset.gardenStage)];
      const image = document.querySelector('#garden-demo-image');
      image.src = `./assets/garden/${file}.png`;
      image.alt = `${file} growth preview`;
      document.querySelector('#garden-demo-title').textContent = title;
      document.querySelector('#garden-demo-copy').textContent = copy;
      for (const choice of document.querySelectorAll('[data-garden-stage]')) {
        choice.setAttribute('aria-pressed', String(choice === button));
      }
    });
  }
  for (const link of document.querySelectorAll('a[href="#garden-help"]')) {
    link.addEventListener('click', () => { document.querySelector('#garden-help').open = true; });
  }
}

function renderCollections(data) {
  const themes = [
    ['live', '#e4ebd9', ['live:cali', 'live:smiley']],
    ['california', '#e1eaf0', ['extra-granite-dome', 'extra-foggy-bay']],
    ['animals', '#efdfcf', ['new-goldendoodle', 'new-giant-panda']],
    ['music', '#e9e2ef', ['new-grand-piano', 'new-electric-guitar']],
    ['music-icons', '#ede4d4', ['artist-michael-jackson', 'artist-beyonce', 'artist-travis-scott']],
    ['stress', '#e3ebdb', ['fidget:spinner', 'fidget:bubbles']],
  ];
  const grid = document.querySelector('#featured-collections');
  for (const [id, colour, featured] of themes) {
    const collection = data.collections.find(item => item.id === id);
    if (!collection) continue;
    const available = data.charms.filter(item => item.collectionId === id);
    const selected = featured.flatMap(key => available.find(item => item.id === key) ?? []);
    const images = selected.length >= 2 ? selected : available.slice(0, 2);
    const link = element('a', 'collection-card');
    link.href = `./charms.html?collection=${encodeURIComponent(id)}`;
    link.setAttribute('aria-label', `Explore ${collection.name}`);
    const art = element('div', 'collection-art');
    art.style.setProperty('--collection-bg', colour);
    for (const item of images) {
      const image = element('img');
      image.src = item.preview;
      image.alt = '';
      image.width = 216; image.height = 252; image.loading = 'lazy';
      art.append(image);
    }
    const copy = element('div', 'collection-copy');
    const text = element('div');
    text.append(element('h3', '', collection.name), element('p', '', `${available.length} included charms`));
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    copy.append(text, arrow);
    link.append(art, copy);
    grid.append(link);
  }
}

function setupCompanions(data) {
  const buttons = [...document.querySelectorAll('[data-demo-name]')];
  function showCharm(charm) {
    window.CharmletDemo.setCharm(charm);
    document.querySelector('#demo-name').textContent = charm.name.split(' - ')[0];
    document.querySelector('#demo-hint').textContent = 'Give it a tap or a gentle pull.';
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(charm.name.split(' - ')[0] === button.dataset.demoName));
    }
  }
  for (const button of buttons) {
    const charm = data.charms.find(item => item.collectionId === 'live' && item.name.split(' - ')[0] === button.dataset.demoName);
    if (!charm) throw new Error(`The ${button.dataset.demoName} preview is missing.`);
    button.addEventListener('click', () => showCharm(charm));
  }
  const cali = data.charms.find(item => item.id === 'live:cali');
  if (!cali) throw new Error('Cali is missing from the collection.');
  showCharm(cali);
  const surprise = document.querySelector('#surprise-charm');
  surprise.disabled = false;
  surprise.addEventListener('click', () => showCharm(data.charms[Math.floor(Math.random() * data.charms.length)]));
}

setupInstallTabs();
setupGarden();
function openLinkedDetails() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener('hashchange', openLinkedDetails);
openLinkedDetails();
revealSections();
try {
  const data = await loadCatalogue();
  applyProductMetadata(data);
  renderCollections(data);
  setupCompanions(data);
} catch (error) {
  showLoadError(error);
}
