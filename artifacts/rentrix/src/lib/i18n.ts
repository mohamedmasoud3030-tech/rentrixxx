import i18next, { type i18n as I18nInstance, type InitOptions } from 'i18next';
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  getLanguageLocale,
  normalizeLanguage,
  supportedLanguages,
  type SupportedLanguage,
  type TextDirection,
} from './companySettings';

export const I18N_NAMESPACE = 'common';

export type SharedTranslationResources = Readonly<Record<string, string>>;

export const i18nResources = {
  ar: {
    common: {
      appName: 'Rentrix',
      realEstateManagement: 'إدارة العقارات',
      home: 'الرئيسية',
      loading: 'جارٍ التحميل...',
      error: 'حدث خطأ غير متوقع',
      logout: 'تسجيل الخروج',
    },
  },
  en: {
    common: {
      appName: 'Rentrix',
      realEstateManagement: 'Real estate management',
      home: 'Home',
      loading: 'Loading...',
      error: 'An unexpected error occurred',
      logout: 'Log out',
    },
  },
} as const satisfies Record<SupportedLanguage, Readonly<Record<typeof I18N_NAMESPACE, SharedTranslationResources>>>;

export type SharedTranslationKey = keyof (typeof i18nResources)[typeof DEFAULT_LANGUAGE][typeof I18N_NAMESPACE];

export type AppLanguageState = Readonly<{
  language: SupportedLanguage;
  locale: string;
  direction: TextDirection;
}>;

export function getAppLanguageState(language: unknown = DEFAULT_LANGUAGE): AppLanguageState {
  const normalizedLanguage = normalizeLanguage(language);

  return {
    language: normalizedLanguage,
    locale: getLanguageLocale(normalizedLanguage),
    direction: getLanguageDirection(normalizedLanguage),
  };
}

export function translateSharedLabel(key: string, language: unknown = DEFAULT_LANGUAGE): string {
  const { language: normalizedLanguage } = getAppLanguageState(language);
  const localizedResources: SharedTranslationResources = i18nResources[normalizedLanguage][I18N_NAMESPACE];
  const fallbackResources: SharedTranslationResources = i18nResources[DEFAULT_LANGUAGE][I18N_NAMESPACE];
  const localizedValue = localizedResources[key];
  const fallbackValue = fallbackResources[key];

  return localizedValue ?? fallbackValue ?? key;
}

export function applyDocumentLanguageDirection(language: unknown = DEFAULT_LANGUAGE, documentRef: Document = document): AppLanguageState {
  const languageState = getAppLanguageState(language);

  documentRef.documentElement.lang = languageState.locale;
  documentRef.documentElement.dir = languageState.direction;

  return languageState;
}

function createI18nInstance(): I18nInstance {
  const instance = i18next.createInstance();

  const initOptions: InitOptions = {
    resources: i18nResources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...supportedLanguages],
    ns: [I18N_NAMESPACE],
    defaultNS: I18N_NAMESPACE,
    interpolation: { escapeValue: false },
    initAsync: false,
  };

  instance.init(initOptions, (error) => {
    if (error) {
      throw error;
    }
  });

  return instance;
}

export const appI18n = createI18nInstance();
