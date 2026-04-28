import { colorTokens, shadowTokens } from '../tokens/colors';

export type ThemeMode = 'light' | 'dark' | 'glass';

export const themePresets: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--ds-bg': colorTokens.neutral[50],
    '--ds-surface': colorTokens.neutral[0],
    '--ds-card': colorTokens.neutral[100],
    '--ds-text': colorTokens.neutral[900],
    '--ds-muted': colorTokens.neutral[500],
    '--ds-border': colorTokens.neutral[200],
    '--ds-primary': colorTokens.brand.primary,
    '--ds-shadow-card': shadowTokens.card,
    '--ds-shadow-floating': shadowTokens.floating,
    '--ds-shadow-modal': shadowTokens.modal,
  },
  dark: {
    '--ds-bg': colorTokens.neutral[950],
    '--ds-surface': colorTokens.neutral[900],
    '--ds-card': colorTokens.neutral[800],
    '--ds-text': colorTokens.neutral[50],
    '--ds-muted': colorTokens.neutral[400],
    '--ds-border': colorTokens.neutral[700],
    '--ds-primary': '#3B82F6',
    '--ds-shadow-card': '0 2px 12px rgb(2 6 23 / 45%)',
    '--ds-shadow-floating': '0 20px 40px -24px rgb(2 6 23 / 75%)',
    '--ds-shadow-modal': '0 30px 60px -24px rgb(2 6 23 / 80%)',
  },
  glass: {
    '--ds-bg': colorTokens.neutral[950],
    '--ds-surface': 'rgb(15 23 42 / 68%)',
    '--ds-card': 'rgb(30 41 59 / 72%)',
    '--ds-text': colorTokens.neutral[50],
    '--ds-muted': colorTokens.neutral[300],
    '--ds-border': 'rgb(148 163 184 / 25%)',
    '--ds-primary': '#60A5FA',
    '--ds-shadow-card': shadowTokens.cardHover,
    '--ds-shadow-floating': '0 24px 50px -30px rgb(15 23 42 / 90%)',
    '--ds-shadow-modal': '0 34px 70px -28px rgb(15 23 42 / 95%)',
  },
};
