import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  getLanguageLocale,
  isSupportedLanguage,
  normalizeLanguage,
  supportedLanguages,
} from './companySettings';
import { appI18n, applyDocumentLanguageDirection, getAppLanguageState, i18nResources, translateSharedLabel } from './i18n';

describe('lightweight i18n and direction foundation', () => {
  it('keeps Arabic as the default language', () => {
    expect(DEFAULT_LANGUAGE).toBe('ar');
    expect(getAppLanguageState()).toEqual({ language: 'ar', locale: 'ar', direction: 'rtl' });
    expect(appI18n.language).toBe('ar');
  });

  it('supports only Arabic and English', () => {
    expect(supportedLanguages).toEqual(['ar', 'en']);
    expect(isSupportedLanguage('ar')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(false);
  });

  it('falls unsupported languages back to Arabic', () => {
    expect(normalizeLanguage('fr')).toBe('ar');
    expect(normalizeLanguage(undefined)).toBe('ar');
    expect(getAppLanguageState('fr')).toEqual({ language: 'ar', locale: 'ar', direction: 'rtl' });
  });

  it('maps languages to text direction', () => {
    expect(getLanguageDirection('ar')).toBe('rtl');
    expect(getLanguageDirection('en')).toBe('ltr');
    expect(getLanguageDirection('unsupported')).toBe('rtl');
  });

  it('maps languages to locale identifiers', () => {
    expect(getLanguageLocale('ar')).toBe('ar');
    expect(getLanguageLocale('en')).toBe('en');
    expect(getLanguageLocale('unsupported')).toBe('ar');
  });

  it('looks up shared translations with Arabic fallback', () => {
    expect(i18nResources.ar.common.home).toBe('الرئيسية');
    expect(translateSharedLabel('home', 'en')).toBe('Home');
    expect(translateSharedLabel('home', 'unsupported')).toBe('الرئيسية');
    expect(translateSharedLabel('missing.key', 'en')).toBe('missing.key');
  });

  it('can apply the default language and direction to a document root', () => {
    const documentElement = { lang: '', dir: '' };
    const testDocument = { documentElement } as unknown as Document;

    expect(applyDocumentLanguageDirection(undefined, testDocument)).toEqual({ language: 'ar', locale: 'ar', direction: 'rtl' });
    expect(documentElement.lang).toBe('ar');
    expect(documentElement.dir).toBe('rtl');

    expect(applyDocumentLanguageDirection('en', testDocument)).toEqual({ language: 'en', locale: 'en', direction: 'ltr' });
    expect(documentElement.lang).toBe('en');
    expect(documentElement.dir).toBe('ltr');
  });
});
