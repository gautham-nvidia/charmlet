(() => {
  const key = 'charmlet-design-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
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
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode));
    }
  }
  apply();
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    for (const group of document.querySelectorAll('.theme-switch, .gallery-theme, .workspace-switch, .growth-controls, #collection-shelf')) {
      group.setAttribute('role', 'group');
    }
    apply();
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.addEventListener('click', () => {
        mode = button.dataset.themeChoice;
        try { localStorage.setItem(key, mode); } catch { /* The choice still works for this page. */ }
        apply();
      });
    }
  });
})();
