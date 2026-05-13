import { themePresets, type ThemeMode } from '@/design-system/theme/themePresets';

export type BrandConfig = {
  key: string;
  logoUrl?: string;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
  defaultTheme?: ThemeMode;
};

export const defaultBrandConfig: BrandConfig = {
  key: 'rentrix',
  companyName: 'Rentrix',
  primaryColor: '#2563eb',
  accentColor: '#16a34a',
  fontFamily: 'Cairo, sans-serif',
  defaultTheme: 'light',
};

export const applyBrandConfig = (brand: BrandConfig): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brand.primaryColor);
  root.style.setProperty('--brand-accent', brand.accentColor);
  if (brand.fontFamily) root.style.setProperty('--brand-font-family', brand.fontFamily);
  root.dataset.brandKey = brand.key;
  root.dataset.brandName = brand.companyName;
  if (brand.defaultTheme && brand.defaultTheme in themePresets) {
    root.dataset.brandTheme = brand.defaultTheme;
  }
};
