import { cropRectangle, drawPhotoCharm, FRAMES, inspectPhotoHeader, makePhotoPack, MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS, PHOTO_HEIGHT, PHOTO_WIDTH } from './photo-core.mjs';

const studio = document.querySelector('#studio');
const panel = document.querySelector('#studio-panel');
let config = { available: false, checkoutUrl: null, testMode: false };
let entitled = false;
let testMode = false;
let bitmap;
let canvas;
let loadSequence = 0;
const defaultDraft = () => ({ name: 'My keepsake', frame: 'mint', zoom: '100', x: '50', y: '50' });
let draft = defaultDraft();
function captureDraft() {
  const name = document.querySelector('#studio-name');
  if (name) draft = { name: name.value, frame: document.querySelector('#studio-frame').value,
    zoom: document.querySelector('#studio-zoom').value, x: document.querySelector('#studio-x').value, y: document.querySelector('#studio-y').value };
}
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function status(message, error = false) {
  const node = document.querySelector('#studio-status');
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('studio-error', error);
}
function disposePhoto() {
  loadSequence++;
  bitmap?.close?.();
  bitmap = undefined;
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  canvas = undefined;
  draft = defaultDraft();
}
function comingSoon() {
  studio.dataset.studioState = 'unavailable';
  panel.replaceChildren();
  const section = element('div', 'coming-soon');
  section.append(element('h2', '', 'Photo Studio is coming soon.'), element('p', '', 'Personal-photo art will be an optional paid creation service. Charmlet itself, the free gallery and importing compatible packs stay free.'));
  const link = element('a', 'button', 'Explore free charms');
  link.href = '../#catalogue';
  section.append(link);
  panel.append(section);
}
function locked(message = 'Unlock Photo Studio when you have an eligible licence key.') {
  if (bitmap) captureDraft();
  loadSequence++;
  entitled = false;
  studio.dataset.studioState = 'locked';
  panel.replaceChildren();
  const copy = element('div', 'locked-copy');
  copy.append(element('h2', '', 'Photo Studio access'), element('p', '', message));
  const form = element('form', 'unlock-form');
  const label = element('label', '', 'Licence key');
  const input = document.createElement('input');
  input.id = 'studio-key'; input.type = 'password'; input.autocomplete = 'off'; input.maxLength = 200; input.required = true;
  label.htmlFor = input.id;
  const button = element('button', 'primary', 'Unlock');
  button.type = 'submit';
  form.append(label, input, button);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    status('Checking access…');
    try {
      const response = await fetch('../api/studio/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: input.value }),
      });
      const body = await response.json();
      if (!response.ok || body.entitled !== true) throw new Error(body.error || 'Photo Studio could not be unlocked.');
      input.value = '';
      entitled = true;
      testMode = body.testMode === true;
      unlocked();
    } catch (error) {
      status(error instanceof Error ? error.message : 'Photo Studio could not be unlocked.', true);
      button.disabled = false;
    }
  });
  copy.append(form);
  if (config.checkoutUrl) {
    const checkout = element('a', 'button checkout', 'Open optional checkout');
    checkout.href = config.checkoutUrl; checkout.rel = 'noopener noreferrer';
    copy.append(checkout);
  }
  const state = element('p', '', 'Your photo is never sent with a licence request.');
  state.id = 'studio-status'; state.setAttribute('role', 'status');
  panel.append(copy, state);
}
function draw() {
  if (!canvas) return;
  captureDraft();
  const frameKey = document.querySelector('#studio-frame')?.value || 'mint';
  drawPhotoCharm(canvas, bitmap, frameKey, Number(document.querySelector('#studio-zoom').value) / 100,
    Number(document.querySelector('#studio-x').value) / 100, Number(document.querySelector('#studio-y').value) / 100);
}
function validSignature(bytes, type) {
  return type === 'image/png' && bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)
    || type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    || type === 'image/webp' && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
}
async function loadPhoto(file) {
  const sequence = ++loadSequence;
  if (!file || !allowedTypes.has(file.type)) throw new Error('Choose a PNG, JPEG or WebP photo.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo no larger than 8 MiB.');
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!validSignature(signature, file.type)) throw new Error('The selected file does not match its image type.');
  inspectPhotoHeader(new Uint8Array(await file.arrayBuffer()), file.type);
  if (sequence !== loadSequence || !entitled) return false;
  const objectUrl = URL.createObjectURL(file);
  let next;
  try {
    const image = new Image(); image.src = objectUrl; await image.decode();
    next = await createImageBitmap(image);
    if (next.width > 8192 || next.height > 8192 || next.width * next.height > MAX_PHOTO_PIXELS) throw new Error('Choose a photo no larger than 8192 pixels or 16 million pixels.');
    cropRectangle(next.width, next.height, FRAMES.mint.width, FRAMES.mint.height);
  } catch (error) {
    next?.close?.();
    throw error instanceof Error ? error : new Error('The photo could not be decoded.');
  } finally { URL.revokeObjectURL(objectUrl); }
  if (sequence !== loadSequence || !entitled || studio.dataset.studioState !== 'unlocked') { next.close(); return false; }
  bitmap?.close?.(); bitmap = next; draw();
  return true;
}
async function exportPack() {
  if (!bitmap || !entitled) { status('Choose a photo before downloading a pack.', true); return; }
  const source = bitmap, sequence = loadSequence;
  const session = await fetch('../api/studio/session').then(response => response.json()).catch(() => ({ entitled: false }));
  if (!entitled || bitmap !== source || sequence !== loadSequence || !canvas) return;
  if (session.entitled !== true) { locked('Your Photo Studio session ended. Unlock again to export; your current photo remains only in memory.'); return; }
  try {
    draw();
    const png = canvas.toDataURL('image/png').split(',')[1];
    const id = `photo-${crypto.randomUUID()}`;
    const pack = makePhotoPack({ id, name: document.querySelector('#studio-name').value, frame: document.querySelector('#studio-frame').value, png });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`${JSON.stringify(pack)}\n`], { type: 'application/json' }));
    link.download = `${id}.charmlet.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    status('Your personal pack is ready. Import it with Charmlet: Import Charm Pack.');
  } catch (error) { status(error instanceof Error ? error.message : 'The keepsake could not be exported.', true); }
}
function unlocked() {
  studio.dataset.studioState = 'unlocked';
  panel.replaceChildren();
  if (testMode) panel.append(element('p', 'test-banner', 'Test-mode access — this is entitlement integration evidence, not a real paid order.'));
  const grid = element('div', 'studio-grid');
  const controls = element('div', 'controls');
  const fileLabel = element('label', '', 'Photo');
  const file = document.createElement('input'); file.id = 'studio-file'; file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp';
  fileLabel.htmlFor = file.id; fileLabel.append(file);
  const nameLabel = element('label', '', 'Keepsake name');
  const name = document.createElement('input'); name.id = 'studio-name'; name.type = 'text'; name.maxLength = 48; name.value = draft.name;
  nameLabel.htmlFor = name.id; nameLabel.append(name);
  const frameLabel = element('label', '', 'Frame');
  const frame = document.createElement('select'); frame.id = 'studio-frame';
  for (const [key, value] of Object.entries(FRAMES)) { const option = document.createElement('option'); option.value = key; option.textContent = value.name; frame.append(option); }
  frame.value = draft.frame;
  frameLabel.htmlFor = frame.id; frameLabel.append(frame);
  const ranges = [['studio-zoom','Zoom',100,300,draft.zoom],['studio-x','Horizontal crop',0,100,draft.x],['studio-y','Vertical crop',0,100,draft.y]];
  controls.append(fileLabel, nameLabel, frameLabel);
  for (const [id, labelText, min, max, value] of ranges) {
    const label = element('label', '', labelText); const input = document.createElement('input');
    input.id = id; input.type = 'range'; input.min = min; input.max = max; input.value = value; label.htmlFor = id; label.append(input); controls.append(label);
    input.addEventListener('input', draw);
  }
  const buttons = element('div', 'button-row');
  const reset = element('button', '', 'Reset photo / crop'); reset.type = 'button';
  const download = element('button', 'primary', 'Download pack'); download.type = 'button';
  const logout = element('button', '', 'Lock Studio'); logout.type = 'button';
  buttons.append(reset, download, logout);
  controls.append(buttons, element('p', 'privacy-note', 'Your selected image stays in browser memory. Only licence/session requests reach the server.'), element('p', 'import-note', 'The downloaded data-only pack imports through the free extension or desktop app.'));
  const preview = element('div', 'preview');
  canvas = document.createElement('canvas'); canvas.id = 'studio-canvas'; canvas.width = PHOTO_WIDTH; canvas.height = PHOTO_HEIGHT;
  canvas.setAttribute('aria-label', 'Personal keepsake preview');
  preview.append(canvas, element('p', '', '216 × 252 PNG · compatible with the free Charmlet importer'));
  const state = element('p', '', 'Choose a local photo to begin.'); state.id = 'studio-status'; state.setAttribute('role', 'status');
  grid.append(controls, preview); panel.append(grid, state);
  frame.addEventListener('change', draw);
  name.addEventListener('input', captureDraft);
  file.addEventListener('change', async () => {
    try { if (await loadPhoto(file.files?.[0])) status('Photo loaded locally. Adjust the crop or choose a frame.'); }
    catch (error) { if (file.isConnected) status(error instanceof Error ? error.message : 'The photo could not be loaded.', true); }
    finally { file.value = ''; }
  });
  reset.addEventListener('click', () => {
    disposePhoto(); canvas = document.querySelector('#studio-canvas');
    document.querySelector('#studio-zoom').value = '100'; document.querySelector('#studio-x').value = '50'; document.querySelector('#studio-y').value = '50';
    draw(); status('Photo and crop reset.');
  });
  download.addEventListener('click', async () => {
    download.disabled = true;
    try { await exportPack(); } finally { if (download.isConnected) download.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    disposePhoto(); entitled = false;
    studio.dataset.studioState = 'locking';
    panel.replaceChildren(element('p', '', 'Photo cleared. Locking Studio…'));
    const response = await fetch('../api/studio/lock', { method: 'POST' }).catch(() => undefined);
    locked(response?.ok ? 'Photo Studio is locked. Your local photo was cleared from memory.'
      : 'Your local photo was cleared. The server lock could not be confirmed; the session will expire automatically.');
  });
  draw();
}
async function initialize() {
  try {
    const response = await fetch('../api/studio/config');
    config = await response.json();
    if (!config.available) { comingSoon(); return; }
    const session = await fetch('../api/studio/session').then(result => result.json());
    if (session.entitled) { entitled = true; testMode = session.testMode === true; unlocked(); }
    else locked();
  } catch { comingSoon(); }
}
window.addEventListener('pagehide', disposePhoto);
void initialize();
