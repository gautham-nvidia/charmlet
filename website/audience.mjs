/** Public form configuration only: subscriber data belongs in the mailing service. */
export function validateAudience(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['provider', 'formUrl', 'contactEmail'].includes(key))
    || input.provider !== 'brevo') {
    throw new Error('Audience settings accept a Brevo public form URL and contact email only.');
  }
  const result = { provider: 'brevo', formUrl: null, contactEmail: null };
  if (input.contactEmail != null) {
    if (typeof input.contactEmail !== 'string' || input.contactEmail.length > 254
      || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(input.contactEmail)) {
      throw new Error('Use the public contact email address for Charmlet.');
    }
    result.contactEmail = input.contactEmail;
  }
  if (input.formUrl != null) {
    let url;
    try { url = new URL(input.formUrl); } catch { throw new Error('Use the published Brevo signup form URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.search
      || !(url.hostname === 'sibforms.com' || /^[a-z0-9-]+\.sibforms\.com$/i.test(url.hostname))
      || !/^\/serve\/[a-z0-9_-]+$/i.test(url.pathname)) {
      throw new Error('Use a public HTTPS sibforms.com/serve/ form, without credentials or extra parameters.');
    }
    if (!result.contactEmail) throw new Error('Add the public contact email before opening signup.');
    result.formUrl = url.href;
  }
  return result;
}

export async function loadAudience() {
  const response = await fetch(new URL('./audience.json', import.meta.url));
  if (!response.ok) throw new Error('Signup availability could not be checked.');
  return validateAudience(await response.json());
}

export async function setupAudience() {
  const audience = await loadAudience();
  for (const node of document.querySelectorAll('[data-audience-status]')) {
    node.textContent = audience.formUrl
      ? 'Your download request is handled by Brevo. Offers are optional.'
      : 'Email signup is not open yet. This preview does not collect or send email.';
  }
  for (const node of document.querySelectorAll('[data-audience-contact]')) {
    node.textContent = audience.contactEmail ?? 'The Charmlet contact address will appear here when signup opens.';
  }
  const dialog = document.querySelector('#signup-preview');
  const trigger = document.querySelector('#email-download');
  if (trigger && dialog) {
    trigger.disabled = false;
    trigger.addEventListener('click', () => {
      if (audience.formUrl) { location.assign(audience.formUrl); return; }
      dialog.showModal();
    });
    document.querySelector('#close-signup').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => trigger.focus());
  }
  return audience;
}
