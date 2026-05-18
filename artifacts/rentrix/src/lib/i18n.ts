import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  getLanguageLocale,
  normalizeLanguage,
  type SupportedLanguage,
  type TextDirection,
} from './companySettings';

const I18N_NAMESPACE = 'common';

type SharedTranslationResources = Readonly<Record<string, string>>;

export const i18nResources = {
  ar: {
    common: {
      appName: 'Rentrix',
      realEstateManagement: 'إدارة العقارات',
      home: 'الرئيسية',
      loading: 'جارٍ التحميل...',
      error: 'حدث خطأ غير متوقع',
      logout: 'تسجيل الخروج',
      logoutSuccess: 'تم تسجيل الخروج بنجاح',
      pageLoadErrorTitle: 'تعذر تحميل هذه الصفحة',
      pageLoadErrorDescription: 'حدث خطأ غير متوقع. راجع الإعدادات أو اتصال Supabase ثم حاول مرة أخرى.',
      retry: 'إعادة المحاولة',
      routeLoadingAria: 'جار التحميل',
      dashboard: 'لوحة التحكم',
      properties: 'العقارات',
      people: 'الأشخاص',
      tenants: 'المستأجرين',
      owners: 'الملاك',
      contracts: 'العقود',
      financials: 'المالية',
      invoices: 'الفواتير',
      arrears: 'المتأخرات',
      accounting: 'المحاسبة',
      reports: 'التقارير',
      maintenance: 'الصيانة',
      settings: 'الإعدادات',
      collapseMenu: 'طي القائمة',
      toggleTheme: 'تبديل الوضع',
      recoverySection: 'قيد الاسترجاع',
      recoveryTooltip: 'سيتم استرجاع هذه الوحدة تدريجيًا من الكود القديم',
      communications: 'التواصل',
      propertyMap: 'خريطة العقارات',
      lands: 'الأراضي',
      prospects: 'العملاء المحتملون',
      commissions: 'العمولات',
      auditLog: 'سجل التدقيق',
      aiAssistant: 'المساعد الذكي',
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
      logoutSuccess: 'Logged out successfully',
      pageLoadErrorTitle: 'This page could not be loaded',
      pageLoadErrorDescription: 'An unexpected error occurred. Check settings or the Supabase connection, then try again.',
      retry: 'Retry',
      routeLoadingAria: 'Loading',
      dashboard: 'Dashboard',
      properties: 'Properties',
      people: 'People',
      tenants: 'Tenants',
      owners: 'Owners',
      contracts: 'Contracts',
      financials: 'Financials',
      invoices: 'Invoices',
      arrears: 'Arrears',
      accounting: 'Accounting',
      reports: 'Reports',
      maintenance: 'Maintenance',
      settings: 'Settings',
      collapseMenu: 'Collapse menu',
      toggleTheme: 'Toggle theme',
      recoverySection: 'Under recovery',
      recoveryTooltip: 'This module will be restored gradually from the legacy code',
      communications: 'Communications',
      propertyMap: 'Property map',
      lands: 'Lands',
      prospects: 'Prospects',
      commissions: 'Commissions',
      auditLog: 'Audit log',
      aiAssistant: 'AI assistant',
    },
  },
} as const satisfies Record<SupportedLanguage, Readonly<Record<typeof I18N_NAMESPACE, SharedTranslationResources>>>;


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

export type DocumentLanguageTarget = {
  documentElement: Pick<HTMLElement, 'dir' | 'lang'>;
};

export function applyDocumentLanguageDirection(language: unknown = DEFAULT_LANGUAGE, documentRef: DocumentLanguageTarget = document): AppLanguageState {
  const languageState = getAppLanguageState(language);

  documentRef.documentElement.lang = languageState.locale;
  documentRef.documentElement.dir = languageState.direction;

  return languageState;
}
