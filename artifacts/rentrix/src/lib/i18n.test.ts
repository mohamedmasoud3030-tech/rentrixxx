import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  getLanguageLocale,
  isSupportedLanguage,
  normalizeLanguage,
  supportedLanguages,
} from './companySettings';
import { applyDocumentLanguageDirection, getAppLanguageState, i18nResources, translateSharedLabel, type DocumentLanguageTarget } from './i18n';

const ARABIC_LANGUAGE = 'ar';
const ENGLISH_LANGUAGE = 'en';
const UNSUPPORTED_LANGUAGE = 'fr';
const UNKNOWN_LANGUAGE = 'unsupported';
const RTL_DIRECTION = 'rtl';
const LTR_DIRECTION = 'ltr';
const HOME_KEY = 'home';
const UNKNOWN_TRANSLATION_KEY = 'missing.key';
const ARABIC_HOME_LABEL = 'الرئيسية';
const ENGLISH_HOME_LABEL = 'Home';

const ARABIC_LANGUAGE_STATE = { language: ARABIC_LANGUAGE, locale: ARABIC_LANGUAGE, direction: RTL_DIRECTION };
const ENGLISH_LANGUAGE_STATE = { language: ENGLISH_LANGUAGE, locale: ENGLISH_LANGUAGE, direction: LTR_DIRECTION };

describe('lightweight i18n and direction foundation', () => {
  it('keeps Arabic as the default language', () => {
    expect(DEFAULT_LANGUAGE).toBe(ARABIC_LANGUAGE);
    expect(getAppLanguageState()).toEqual(ARABIC_LANGUAGE_STATE);
  });

  it('supports only Arabic and English', () => {
    expect(supportedLanguages).toEqual([ARABIC_LANGUAGE, ENGLISH_LANGUAGE]);
    expect(isSupportedLanguage(ARABIC_LANGUAGE)).toBe(true);
    expect(isSupportedLanguage(ENGLISH_LANGUAGE)).toBe(true);
    expect(isSupportedLanguage(UNSUPPORTED_LANGUAGE)).toBe(false);
  });

  it('falls unsupported languages back to Arabic', () => {
    expect(normalizeLanguage(UNSUPPORTED_LANGUAGE)).toBe(ARABIC_LANGUAGE);
    expect(normalizeLanguage(undefined)).toBe(ARABIC_LANGUAGE);
    expect(getAppLanguageState(UNSUPPORTED_LANGUAGE)).toEqual(ARABIC_LANGUAGE_STATE);
  });

  it('maps languages to text direction', () => {
    expect(getLanguageDirection(ARABIC_LANGUAGE)).toBe(RTL_DIRECTION);
    expect(getLanguageDirection(ENGLISH_LANGUAGE)).toBe(LTR_DIRECTION);
    expect(getLanguageDirection(UNKNOWN_LANGUAGE)).toBe(RTL_DIRECTION);
  });

  it('maps languages to locale identifiers', () => {
    expect(getLanguageLocale(ARABIC_LANGUAGE)).toBe(ARABIC_LANGUAGE);
    expect(getLanguageLocale(ENGLISH_LANGUAGE)).toBe(ENGLISH_LANGUAGE);
    expect(getLanguageLocale(UNKNOWN_LANGUAGE)).toBe(ARABIC_LANGUAGE);
  });

  it('looks up shared translations with Arabic fallback', () => {
    expect(i18nResources[ARABIC_LANGUAGE].common[HOME_KEY]).toBe(ARABIC_HOME_LABEL);
    expect(translateSharedLabel(HOME_KEY, ENGLISH_LANGUAGE)).toBe(ENGLISH_HOME_LABEL);
    expect(translateSharedLabel(HOME_KEY, UNKNOWN_LANGUAGE)).toBe(ARABIC_HOME_LABEL);
    expect(translateSharedLabel(UNKNOWN_TRANSLATION_KEY, ENGLISH_LANGUAGE)).toBe(UNKNOWN_TRANSLATION_KEY);
  });

  it('can apply the default language and direction to a document root', () => {
    const documentElement = { lang: '', dir: '' };
    const testDocument = { documentElement } satisfies DocumentLanguageTarget;

    expect(applyDocumentLanguageDirection(undefined, testDocument)).toEqual(ARABIC_LANGUAGE_STATE);
    expect(documentElement.lang).toBe(ARABIC_LANGUAGE);
    expect(documentElement.dir).toBe(RTL_DIRECTION);

    expect(applyDocumentLanguageDirection(ENGLISH_LANGUAGE, testDocument)).toEqual(ENGLISH_LANGUAGE_STATE);
    expect(documentElement.lang).toBe(ENGLISH_LANGUAGE);
    expect(documentElement.dir).toBe(LTR_DIRECTION);
  });
});
