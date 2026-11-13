import { applyProductMetadata, element, loadCatalogue, showLoadError } from './site.js';
import { cropRectangle, inspectPhotoHeader, MAX_PHOTO_BYTES } from './studio/photo-core.mjs';
import { feedDeck } from '../extension/src/learning-cards.ts';
import { availability, loadCommerce, setupSignup } from './access-client.js';

const mark = new URLSearchParams(location.search).get('mark');
const selectedMark = ['terminal', 'cali', 'hybrid'].includes(mark) ? mark : 'terminal';
for (const icon of document.querySelectorAll('.chosen-mark')) {
  icon.classList.remove('mark-terminal');
  icon.classList.add(`mark-${selectedMark}`);
}
document.documentElement.dataset.previewMark = selectedMark;

const roles = {
  Cali: ['CALIFORNIA CODING COMPANION', 'Big bear energy. Very small coworker.'],
  Terminal: ['WHERE IT ALL BEGAN', 'A little prompt for your next big idea.'],
  Nimbus: ['A CLOUD WITH MOODS', 'A little sunshine. A passing shower.'],
  Byte: ['SMALL ROBOT, BIG IDEAS', 'Fluent in binary. Excellent company.'],
  Sunny: ['YOUR POCKET-SIZED OPTIMIST', 'A little brightness for the everyday.'],
};

function setupPlayground(data) {
  const names = ['Terminal', 'Cali', 'Nimbus', 'Byte', 'Sunny'];
  const choices = names.map(name => {
    const charm = data.charms.find(item => item.name.split(' - ')[0] === name);
    if (!charm) throw new Error(`The ${name} companion is missing.`);
    return { name, charm };
  });
  const dock = document.querySelector('#companion-dock');
  let active = 'Cali';
  function select(choice) {
    active = choice.name;
    window.CharmletDemo.setCharm(choice.charm);
    document.querySelector('#demo-hint').textContent = 'Pull across the playground. Release to watch the cord settle.';
    document.querySelector('#demo-name').textContent = choice.name;
    document.querySelector('#companion-role').textContent = roles[choice.name][0];
    document.querySelector('#companion-description').textContent = roles[choice.name][1];
    document.querySelector('#react-charm').firstChild.textContent = choice.name === 'Terminal' ? 'Give it a tap ' : 'Say hello ';
    for (const button of dock.querySelectorAll('[data-companion]')) {
      button.setAttribute('aria-pressed', String(button.dataset.companion === active));
    }
  }
  for (const choice of choices) {
    const button = element('button', 'dock-button');
    button.type = 'button';
    button.dataset.companion = choice.name;
    button.setAttribute('aria-label', `Try ${choice.name}`);
    button.setAttribute('aria-pressed', String(choice.name === active));
    const image = element('img');
    image.src = choice.charm.preview;
    image.alt = '';
    image.width = 44;
    image.height = 49;
    button.append(image, element('span', '', choice.name));
    button.addEventListener('click', () => select(choice));
    dock.append(button);
  }
  const surprise = element('button', 'dock-button');
  surprise.type = 'button';
  surprise.setAttribute('aria-label', 'Surprise me with another companion');
  const symbol = element('span', 'surprise-symbol', '*');
  symbol.setAttribute('aria-hidden', 'true');
  surprise.append(symbol, element('span', '', 'Surprise'));
  surprise.addEventListener('click', () => {
    const others = choices.filter(choice => choice.name !== active);
    select(others[Math.floor(Math.random() * others.length)]);
  });
  dock.append(surprise);
  document.querySelector('#react-charm').addEventListener('click', () => document.querySelector('#demo-charm').click());
  select(choices.find(choice => choice.name === 'Cali'));
}

function setupShelf(data) {
  const patterns = [/Acoustic Guitar/i, /Goldendoodle/i, /Granite Dome/i, /Saxophone/i, /Giant Panda/i, /Painted Ladies/i];
  const shelf = document.querySelector('#collection-shelf');
  for (const pattern of patterns) {
    const charm = data.charms.find(item => pattern.test(item.name));
    if (!charm) throw new Error(`A featured collection artwork is missing: ${pattern.source}`);
    const item = element('a', 'shelf-item');
    item.href = `./charms.html?collection=${encodeURIComponent(charm.collectionId)}`;
    item.setAttribute('aria-label', `Explore ${charm.collectionLabel}, featuring ${charm.name}`);
    const image = element('img');
    image.src = charm.preview;
    image.alt = '';
    image.width = 216;
    image.height = 252;
    image.loading = 'lazy';
    item.append(image, element('strong', '', charm.name), element('small', '', charm.collectionLabel));
    shelf.append(item);
  }
}

function setupWorkspace() {
  const hero = document.querySelector('.product-hero');
  const screen = document.querySelector('.workspace-screen');
  const sidebar = document.querySelector('#workspace-sidebar');
  const marker = document.querySelector('#workspace-hanger');
  const wrapper = document.querySelector('.poster-stage');
  const compact = matchMedia('(max-width: 720px)');
  function place() {
    const root = hero.getBoundingClientRect(), rect = screen.getBoundingClientRect();
    const inEditor = hero.dataset.workspace === 'vscode';
    const panel = sidebar.getBoundingClientRect();
    marker.style.left = inEditor ? `${panel.x + panel.width / 2 - rect.x}px` : compact.matches ? '50%' : '80%';
    wrapper.style.left = inEditor ? `${panel.x - root.x + 8}px` : '0';
    wrapper.style.top = `${inEditor ? panel.y - root.y + 30 : rect.y - root.y + 18}px`;
    wrapper.style.width = inEditor ? `${Math.max(1, panel.width - 16)}px` : '100%';
    wrapper.style.height = `${inEditor ? Math.max(1, panel.height - 68) : rect.height + 160}px`;
    window.CharmletDemo.refreshLayout();
  }
  for (const button of document.querySelectorAll('button[data-workspace]')) {
    button.addEventListener('click', () => {
      hero.dataset.workspace = button.dataset.workspace;
      for (const option of document.querySelectorAll('button[data-workspace]')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      const inEditor = hero.dataset.workspace === 'vscode';
      document.querySelector('#workspace-title').textContent = inEditor ? 'Inside VS Code' : 'Your desktop';
      document.querySelector('#placement-copy').textContent = inEditor
        ? 'Inside the Charmlet sidebar: your companion, focus sessions and small wins beside your code.'
        : 'A floating charm above your other apps. Drag it to the spot that feels right.';
      place();
    });
  }
  new ResizeObserver(place).observe(screen);
  document.fonts.ready.then(place);
  place();
  setupMoments();
}

function setupMoments() {
  const speaker = document.querySelector('#moment-speaker');
  const text = document.querySelector('#moment-text');
  const caption = document.querySelector('#moment-caption');
  const focus = document.querySelector('#focus-preview');
  const clock = document.querySelector('#focus-clock');
  const focusButton = document.querySelector('#try-focus');
  const reveal = document.querySelector('#reveal-trivia');
  const answer = document.querySelector('#trivia-answer');
  const source = document.querySelector('#trivia-source');
  const encouragement = feedDeck('encouragement'), trivia = feedDeck('trivia');
  let messageIndex = 0, triviaIndex = 0, interval, deadline = 0;
  function stopFocus() {
    clearInterval(interval);
    interval = undefined;
    focus.hidden = true;
    focusButton.textContent = '◷ Focus';
  }
  function message(label, copy) {
    speaker.textContent = label;
    text.textContent = copy;
    reveal.hidden = true;
    reveal.textContent = 'Reveal answer ↗';
    reveal.setAttribute('aria-expanded', 'false');
    answer.hidden = true;
    source.hidden = true;
  }
  function cheer() {
    window.CharmletDemo.celebrate();
    message('A SMALL WIN, WORTH CELEBRATING', 'You did a thing. Take a second to feel good about it.');
    caption.textContent = 'In the app, completing a focus session earns a small win. You can also record your own wins and turn celebrations off.';
  }
  focusButton.addEventListener('click', () => {
    if (interval) { stopFocus(); message('READY WHEN YOU ARE', 'Start again whenever you like.'); return; }
    message('ONE SMALL THING', 'Pick a task. Make a start. A little company while you focus.');
    caption.textContent = 'This is a 10-second preview. In the app, choose your own focus and break lengths, with pause and resume.';
    focus.hidden = false;
    clock.textContent = '00:10';
    focusButton.textContent = '◷ Stop preview';
    deadline = performance.now() + 10000;
    interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      clock.textContent = `00:${String(seconds).padStart(2, '0')}`;
      if (seconds === 0) { stopFocus(); cheer(); }
    }, 200);
  });
  document.querySelector('#try-cheer').addEventListener('click', () => { stopFocus(); cheer(); });
  document.querySelector('#try-encourage').addEventListener('click', () => {
    stopFocus();
    const card = encouragement[messageIndex++ % encouragement.length];
    message(`${document.querySelector('#demo-name').textContent} says`, card.text);
    caption.textContent = 'Gentle encouragement is built in. Choose your feed and the prompts you want in Settings.';
  });
  document.querySelector('#try-trivia').addEventListener('click', () => {
    stopFocus();
    const card = trivia[triviaIndex++ % trivia.length];
    message(`${card.topic.toUpperCase()} / FROM THE APP'S TRIVIA DECK`, card.text);
    answer.textContent = card.answer;
    reveal.hidden = false;
    if (card.source) { source.href = card.source.url; source.textContent = `${card.source.label} ↗`; }
    caption.textContent = 'A tiny coding break: facts and trivia from the same deck included in the app.';
  });
  reveal.addEventListener('click', () => {
    const expanded = answer.hidden;
    answer.hidden = !expanded;
    source.hidden = !expanded || !source.getAttribute('href');
    reveal.setAttribute('aria-expanded', String(expanded));
    reveal.textContent = expanded ? 'Hide answer ↑' : 'Reveal answer ↗';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && interval) { stopFocus(); message('PREVIEW PAUSED', 'Come back and try a focus moment whenever you like.'); }
  });
}

function setupGarden() {
  const captions = {
    seed: 'Every good thing starts somewhere.',
    sprout: 'Good things take a little care.',
    bud: 'One small thing. Then another.',
    sunflower: 'Eleven watering days. A flower to keep.',
  };
  const buttons = [...document.querySelectorAll('[data-growth]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const stage = button.dataset.growth;
      const image = document.querySelector('#growth-image');
      image.src = `./assets/garden/${stage}.png`;
      image.alt = `${stage} garden growth preview`;
      document.querySelector('#growth-caption').textContent = captions[stage];
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    });
  }
}

function setupLocket() {
  const locket = document.querySelector('#memory-locket');
  const input = document.querySelector('#memory-file');
  const image = document.querySelector('#locket-photo');
  const status = document.querySelector('#photo-status');
  const caption = document.querySelector('#locket-caption');
  const originalSource = image.src;
  const rig = document.querySelector('.locket-rig');
  const quiet = matchMedia('(prefers-reduced-motion: reduce)');
  let swing;
  let request = 0;
  quiet.addEventListener('change', event => { if (event.matches) swing?.cancel(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) swing?.cancel(); });
  function setOpen(open) {
    locket.setAttribute('aria-pressed', String(open));
    locket.setAttribute('aria-label', `${open ? 'Close' : 'Open'} locket concept`);
    const start = getComputedStyle(rig).transform;
    swing?.cancel();
    if (!quiet.matches) {
      swing = rig.animate([
        { transform: start }, { transform: 'rotate(5deg)' },
        { transform: 'rotate(10deg)' }, { transform: 'rotate(7deg)' },
        { transform: 'rotate(8deg)' },
      ], { duration: 1100, easing: 'ease-out' });
    }
  }
  locket.addEventListener('click', () => setOpen(locket.getAttribute('aria-pressed') !== 'true'));
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const current = ++request;
    let bitmap;
    try {
      if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 8 MiB.');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP photo.');
      status.textContent = 'Preparing your photo on this device…';
      const bytes = new Uint8Array(await file.arrayBuffer());
      inspectPhotoHeader(bytes, file.type);
      bitmap = await createImageBitmap(file);
      const crop = cropRectangle(bitmap.width, bitmap.height, 4, 5);
      if (current !== request) return;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 640;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare the photo. Try reloading this page.');
      context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
      image.src = canvas.toDataURL('image/png');
      image.alt = 'Your locally selected photo inside the locket';
      caption.textContent = 'Your little memory. Right here.';
      status.textContent = 'Ready. Your photo stays only in this tab.';
      setOpen(true);
    } catch (error) {
      if (current === request) status.textContent = error instanceof Error ? error.message : 'The photo could not be opened.';
    } finally {
      bitmap?.close();
      if (current === request) input.value = '';
    }
  });
  document.querySelector('#photo-reset').addEventListener('click', () => {
    request++;
    input.value = '';
    image.src = originalSource;
    image.alt = 'Example sunflower artwork inside the locket';
    caption.textContent = 'A little sunshine, kept close.';
    status.textContent = 'Photo cleared. The example artwork is restored.';
    setOpen(false);
  });
}

setupGarden();
setupLocket();
try {
  const data = await loadCatalogue();
  applyProductMetadata(data);
  setupPlayground(data);
  setupWorkspace();
  setupShelf(data);
  const commerce = await loadCommerce();
  for (const node of document.querySelectorAll('[data-starter-count]')) node.textContent = commerce.starterCount;
  const dialog = document.querySelector('#signup-preview'), trigger = document.querySelector('#email-download');
  let signup;
  trigger.addEventListener('click', () => {
    dialog.showModal();
    signup ??= setupSignup(document.querySelector('#download-signup')).catch(error => {
      document.querySelector('[data-signup-message]').textContent = error.message;
    });
  });
  document.querySelector('#close-signup').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger.focus());
  const status = await availability();
  for (const node of document.querySelectorAll('[data-audience-status]')) {
    node.textContent = status.configured ? 'Confirm your email to receive downloads. Offers are optional.'
      : 'Email signup is not open yet. This preview does not collect or send email.';
  }
  document.documentElement.dataset.designReady = 'true';
} catch (error) {
  showLoadError(error);
}
