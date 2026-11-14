(() => {
  const key = 'charmlet-design-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const modes = ['auto', 'light', 'dark'];
  const icons = {
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    dark: '<path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
  };
  let mode = 'auto';
  try {
    const saved = localStorage.getItem(key);
    if (['auto', 'light', 'dark'].includes(saved)) mode = saved;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
  function apply() {
    document.documentElement.dataset.theme = mode === 'auto' ? (system.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.themeMode = mode;
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      const next = modes[(modes.indexOf(mode) + 1) % modes.length];
      const label = `Colour theme: ${mode === 'auto' ? 'Auto (match device)' : mode}. Switch to ${next}.`;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${icons[mode]}</svg>`;
    }
  }
  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    for (const group of document.querySelectorAll('.theme-switch, .gallery-theme, .workspace-switch, .growth-controls, #collection-shelf')) {
      group.setAttribute('role', 'group');
    }
    for (const group of document.querySelectorAll('.theme-switch, .gallery-theme')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-toggle';
      button.dataset.themeToggle = '';
      button.addEventListener('click', () => {
        mode = modes[(modes.indexOf(mode) + 1) % modes.length];
        try { localStorage.setItem(key, mode); } catch { /* The choice still works for this page. */ }
        apply();
      });
      group.replaceChildren(button);
    }
    apply();
  });
})();
