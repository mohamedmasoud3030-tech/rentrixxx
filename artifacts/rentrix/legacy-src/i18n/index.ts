import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar/common.json';
import en from '../locales/en/common.json';

const fallbackLng = 'ar';
const savedLng = globalThis.localStorage?.getItem('rentrix:lang') || fallbackLng;

void i18n.use(initReactI18next).init({
  resources: { ar: { common: ar }, en: { common: en } },
  lng: savedLng,
  fallbackLng,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  globalThis.localStorage?.setItem('rentrix:lang', lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

export default i18n;
