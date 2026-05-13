import type { BrandConfig } from '../brand-config/defaultBrand';
import { defaultBrandConfig } from '../brand-config/defaultBrand';

export const tenantThemeRegistry: Record<string, BrandConfig> = {
  rentrix: defaultBrandConfig,
  enterprise: {
    ...defaultBrandConfig,
    key: 'enterprise',
    companyName: 'Rentrix Enterprise',
    primaryColor: '#1d4ed8',
    accentColor: '#0ea5e9',
    defaultTheme: 'dark',
  },
  glass: {
    ...defaultBrandConfig,
    key: 'glass',
    companyName: 'Rentrix Executive',
    primaryColor: '#60a5fa',
    accentColor: '#a78bfa',
    defaultTheme: 'glass',
  },
};
