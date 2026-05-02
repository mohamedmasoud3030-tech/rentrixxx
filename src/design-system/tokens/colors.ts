export const colorTokens = {
  brand: {
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#0EA5E9',
  },
  semantic: {
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#0EA5E9',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

export const shadowTokens = {
  card: '0 1px 2px rgb(15 23 42 / 8%), 0 1px 1px rgb(15 23 42 / 4%)',
  cardHover: '0 10px 20px -12px rgb(15 23 42 / 22%), 0 4px 8px -6px rgb(15 23 42 / 12%)',
  floating: '0 16px 40px -20px rgb(2 6 23 / 45%)',
  modal: '0 30px 60px -30px rgb(2 6 23 / 55%)',
} as const;

export type ColorToken = keyof typeof colorTokens;
