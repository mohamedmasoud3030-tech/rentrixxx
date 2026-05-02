import { describe, it, expect, vi, beforeEach } from 'vitest';

const setupDom = () => {
  Object.defineProperty(document, 'documentElement', {
    value: document.documentElement,
    configurable: true,
  });
};

describe('i18n bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.dir = '';
    setupDom();
  });

  it('loadLocaleNamespaces imports and registers resources', async () => {
    const mod = await import('./index');
    await mod.loadLocaleNamespaces('en', ['finance']);
    expect(mod.default.hasResourceBundle('en', 'finance')).toBe(true);
    expect(mod.default.t('title', { ns: 'finance', lng: 'en' })).toBe('Finance Management');
  });

  it('initialization preloads fallback and saved language bundles', async () => {
    localStorage.setItem('rentrix:lang', 'en');
    const mod = await import('./index');

    expect(mod.default.hasResourceBundle('ar', 'common')).toBe(true);
    expect(mod.default.hasResourceBundle('en', 'common')).toBe(true);
    expect(mod.default.language).toBe('en');
  });

  it('languageChanged updates storage/document and lazy loads namespaces', async () => {
    const mod = await import('./index');
    await mod.default.changeLanguage('en');

    expect(localStorage.getItem('rentrix:lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    await mod.loadLocaleNamespaces('en', ['settings']);
    expect(mod.default.hasResourceBundle('en', 'settings')).toBe(true);
  });
});
