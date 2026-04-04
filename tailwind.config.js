/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--rx-color-primary))',
          fg: 'hsl(var(--rx-color-primary-fg))',
        },
        background: 'hsl(var(--rx-color-background))',
        surface: 'hsl(var(--rx-color-surface))',
        'surface-dim': 'hsl(var(--rx-color-surface-dim))',
        'surface-container-lowest': 'hsl(var(--rx-color-surface-container-lowest))',
        'surface-container-low': 'hsl(var(--rx-color-surface-container-low))',
        'surface-container': 'hsl(var(--rx-color-surface-container))',
        'surface-container-high': 'hsl(var(--rx-color-surface-container-high))',
        'surface-container-highest': 'hsl(var(--rx-color-surface-container-highest))',
        'surface-bright': 'hsl(var(--rx-color-surface-bright))',
        'primary-container': 'hsl(var(--rx-color-primary-container))',
        'on-primary': 'hsl(var(--rx-color-on-primary))',
        'on-primary-container': 'hsl(var(--rx-color-on-primary-container))',
        secondary: 'hsl(var(--rx-color-secondary))',
        tertiary: 'hsl(var(--rx-color-tertiary))',
        error: 'hsl(var(--rx-color-error))',
        'error-container': 'hsl(var(--rx-color-error-container))',
        'on-surface': 'hsl(var(--rx-color-on-surface))',
        'on-surface-variant': 'hsl(var(--rx-color-on-surface-variant))',
        outline: 'hsl(var(--rx-color-outline))',
        'outline-variant': 'hsl(var(--rx-color-outline-variant))',
        card: 'hsl(var(--rx-color-card))',
        border: 'hsl(var(--rx-color-border))',
        text: {
          DEFAULT: 'hsl(var(--rx-color-text-primary))',
          muted: 'hsl(var(--rx-color-text-muted))',
        },
        sidebar: {
          bg: 'hsl(var(--rx-color-sidebar-bg))',
          text: 'hsl(var(--rx-color-sidebar-text))',
          'active-bg': 'hsl(var(--rx-color-sidebar-active-bg))',
          'hover-bg': 'hsl(var(--rx-color-sidebar-hover-bg))',
          'active-text': 'hsl(var(--rx-color-sidebar-active-text))',
        },
        success: {
          text: 'hsl(var(--rx-color-success-text))',
          bg: 'hsl(var(--rx-color-success-bg))',
        },
        warning: {
          text: 'hsl(var(--rx-color-warning-text))',
          bg: 'hsl(var(--rx-color-warning-bg))',
        },
        danger: {
          text: 'hsl(var(--rx-color-danger-text))',
          bg: 'hsl(var(--rx-color-danger-bg))',
        },
        info: {
          text: 'hsl(var(--rx-color-info-text))',
          bg: 'hsl(var(--rx-color-info-bg))',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        sidebar: 'var(--shadow-sidebar)',
      },
      transitionDuration: {
        '250': '250ms',
        '300': '300ms',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
