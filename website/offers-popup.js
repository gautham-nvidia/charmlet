import { setupSignup } from './access-client.js';

const dismissalKey = 'charmlet-offers-dismissed-v1';
const cooldown = 7 * 24 * 60 * 60 * 1000;

export function setupOffersPopup() {
  const dialog = document.querySelector('#offers-popup');
  const form = dialog.querySelector('form');
  const trigger = document.querySelector('#open-offers');
  let signup;
  let returnFocus;

  function open() {
    if (document.querySelector('dialog[open]')) return;
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : document.querySelector('.header-get');
    dialog.showModal();
    document.documentElement.classList.add('offers-open');
    signup ??= setupSignup(form).catch(error => {
      form.querySelector('[data-signup-message]').textContent = error.message;
    });
  }
  for (const close of dialog.querySelectorAll('[data-close-offers]')) close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('offers-open');
    try { localStorage.setItem(dismissalKey, String(Date.now())); } catch { /* Dismissal still works in this tab. */ }
    returnFocus?.focus({ preventScroll: true });
  });
  trigger.addEventListener('click', open);
  let dismissedAt = 0;
  try { dismissedAt = Number(localStorage.getItem(dismissalKey)); } catch { /* Storage is optional. */ }
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0 || Date.now() - dismissedAt >= cooldown) open();
}
