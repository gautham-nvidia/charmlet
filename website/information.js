import { availability, loadCommerce } from './access-client.js';
try {
  const settings = await loadCommerce();
  for (const node of document.querySelectorAll('[data-starter-count]')) node.textContent = settings.starterCount;
  if (settings.contactEmail) {
    for (const node of document.querySelectorAll('[data-site-contact]')) {
      const link = document.createElement('a');
      link.href = `mailto:${settings.contactEmail}`; link.textContent = settings.contactEmail;
      node.replaceChildren(link);
    }
  }
  const status = await availability();
  if (status.configured) {
    for (const node of document.querySelectorAll('[data-service-status]')) {
      node.textContent = status.checkout && settings.salesEnabled ? 'Free downloads, a 30-day Pro trial and one-time purchases.'
        : 'Email downloads and trial access are open. Paid checkout is not open yet.';
    }
  }
} catch {
  for (const node of document.querySelectorAll('[data-service-status]')) node.textContent = 'Download availability could not be checked. Please reload.';
}
