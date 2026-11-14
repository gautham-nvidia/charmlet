let cataloguePromise;

export function loadCatalogue() {
  cataloguePromise ??= fetch(new URL('./catalogue.json', import.meta.url)).then(response => {
    if (!response.ok) throw new Error('The Charmlet collection could not be loaded.');
    return response.json();
  });
  return cataloguePromise;
}

export function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function applyProductMetadata(data) {
  for (const node of document.querySelectorAll('[data-charm-count]')) node.textContent = String(data.charms.length);
  for (const node of document.querySelectorAll('[data-collection-count]')) node.textContent = String(data.collections.length);
  for (const node of document.querySelectorAll('[data-release-label]')) node.textContent = `Charmlet ${data.version} · Free starter, optional Pro`;
  for (const link of document.querySelectorAll('.extension-download')) {
    link.href = data.extensionDownload;
    if (data.extensionDownload.endsWith('.vsix')) link.download = `charmlet-${data.version}.vsix`;
    else link.removeAttribute('download');
  }
  const stores = document.querySelector('#store-links');
  if (stores) {
    stores.replaceChildren();
    for (const [key, label] of [['marketplace', 'VS Code Marketplace'], ['openVsx', 'Open VSX']]) {
      if (!data.distribution?.[key]) continue;
      const link = element('a', 'text-link', `${label} ↗`);
      link.href = data.distribution[key];
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      stores.append(link);
    }
    stores.hidden = stores.childElementCount === 0;
  }
  for (const link of document.querySelectorAll('[data-desktop-download]')) {
    const url = data.launch?.desktop?.[link.dataset.desktopDownload];
    link.hidden = !url;
    if (url) {
      link.href = url;
      const arm = new URL(url).pathname.includes('-arm64.');
      const platform = link.dataset.desktopDownload === 'macos'
        ? `Mac · ${arm ? 'Apple silicon' : 'Intel'}` : `Windows · ${arm ? 'ARM64' : 'x64'}`;
      link.textContent = `Download for ${platform} ↓`;
    }
    else link.removeAttribute('href');
  }
  const desktopUnavailable = document.querySelector('#desktop-unavailable');
  if (desktopUnavailable) desktopUnavailable.hidden = Boolean(data.launch?.desktop?.windows || data.launch?.desktop?.macos);
  for (const link of document.querySelectorAll('[data-shop-link]')) {
    link.hidden = !data.launch?.shop;
    if (data.launch?.shop) link.href = data.launch.shop.url;
    else link.removeAttribute('href');
  }
}

export function revealSections() {
  const sections = document.querySelectorAll('[data-reveal]');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  for (const section of sections) {
    section.classList.add('will-reveal');
    observer.observe(section);
  }
  // A preference change must not leave content waiting for an animation.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    for (const section of sections) section.classList.add('revealed');
  });
}

export function showLoadError(error) {
  const status = document.querySelector('#page-status');
  if (!status) return;
  status.hidden = false;
  status.textContent = `${error.message} Please reload this page.`;
}
