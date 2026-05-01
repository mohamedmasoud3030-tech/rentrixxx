import { themePresets, type ThemeMode } from './themePresets';

const THEME_STORAGE_KEY = 'rentrix:ds-theme';

export const applyThemePreset = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const preset = themePresets[mode];

  Object.entries(preset).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.dsTheme = mode;
  root.dataset.theme = mode === 'glass' ? 'dark' : mode;

  if (mode === 'glass') {
    root.classList.add('ds-glass-mode');
  } else {
    root.classList.remove('ds-glass-mode');
  }

  globalThis.localStorage.setItem(THEME_STORAGE_KEY, mode);
};

export const getStoredTheme = (): ThemeMode | null => {
  if (typeof globalThis.window === 'undefined') return null;
  const saved = globalThis.localStorage.getItem(THEME_STORAGE_KEY);
  return saved && saved in themePresets ? (saved as ThemeMode) : null;
};

export const initThemePreset = (fallback: ThemeMode = 'light'): ThemeMode => {
  const mode = getStoredTheme() ?? fallback;
  applyThemePreset(mode);
  return mode;
};
