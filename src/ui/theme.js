/**
 * AutoOps Theme Manager
 * Manages light/dark mode preference with localStorage persistence and OS preference detection.
 */
export function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem('autoops_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved) {
    root.dataset.theme = saved;
  } else {
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  }

  return {
    toggle() {
      const current = root.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem('autoops_theme', next);
      return next;
    },
    get() {
      return root.dataset.theme;
    }
  };
}
