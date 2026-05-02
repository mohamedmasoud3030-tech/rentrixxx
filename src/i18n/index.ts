import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const fallbackLng = 'ar';
const supportedLngs = ['ar', 'en'] as const;
const namespaces = ['common', 'finance', 'operations', 'settings'] as const;

type AppLng = (typeof supportedLngs)[number];
type AppNS = (typeof namespaces)[number];

const savedLng = (globalThis.localStorage?.getItem('rentrix:lang') as AppLng | null) || fallbackLng;

const localeModuleLoaders: Record<AppLng, Record<AppNS, () => Promise<{ default: Record<string, unknown> }>>> = {
  ar: {
    common: () => import('../locales/ar/common.json'),
    finance: () => import('../locales/ar/finance.json'),
    operations: () => import('../locales/ar/operations.json'),
    settings: () => import('../locales/ar/settings.json'),
  },
  en: {
    common: () => import('../locales/en/common.json'),
    finance: () => import('../locales/en/finance.json'),
    operations: () => import('../locales/en/operations.json'),
    settings: () => import('../locales/en/settings.json'),
  },
};

async function loadNamespace(lng: AppLng, ns: AppNS): Promise<void> {
  if (i18n.hasResourceBundle(lng, ns)) return;
  const mod = await localeModuleLoaders[lng][ns]();
  i18n.addResourceBundle(lng, ns, mod.default, true, true);
}

export async function loadLocaleNamespaces(lng: AppLng, nss: readonly AppNS[] = namespaces): Promise<void> {
  await Promise.all(nss.map((ns) => loadNamespace(lng, ns)));
}

await loadLocaleNamespaces(fallbackLng);
if (savedLng !== fallbackLng) {
  await loadLocaleNamespaces(savedLng);
}

await i18n.use(initReactI18next).init({
  lng: savedLng,
  fallbackLng,
  supportedLngs: [...supportedLngs],
  ns: [...namespaces],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  const lang = supportedLngs.includes(lng as AppLng) ? (lng as AppLng) : fallbackLng;
  globalThis.localStorage?.setItem('rentrix:lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  void loadLocaleNamespaces(lang);
});

export { fallbackLng, namespaces, supportedLngs };
export default i18n;
