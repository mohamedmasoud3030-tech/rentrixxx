/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
          DEFAULT: 'hsl(var(--color-primary))',
          fg: 'hsl(var(--color-primary-fg))',
        },
        'primary-fg': 'hsl(var(--color-primary-fg))',
        background: '#111319',
        surface: '#111319',

        'surface-dim': '#111319',
        'surface-container-lowest': '#0c0e14',
        'surface-container-low': '#191b22',
        'surface-container': '#1e1f26',
        'surface-container-high': '#282a30',
        'surface-container-highest': '#33343b',
        'surface-bright': '#373940',
        'primary-container': '#14b8a6',
        'on-primary': '#003731',
        'on-primary-container': '#00423b',
        secondary: '#b7c8e1',
        tertiary: '#d0bcff',
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-surface': '#e2e2eb',
        'on-surface-variant': '#bbcac6',
        outline: '#859490',
        'outline-variant': '#3c4947',
        card: 'hsl(var(--color-card))',
        border: 'hsl(var(--color-border))',
        text: {
          DEFAULT: 'hsl(var(--color-text-primary))',
          muted: 'hsl(var(--color-text-muted))',
        },
        sidebar: {
          bg: 'hsl(var(--color-sidebar-bg))',
          text: 'hsl(var(--color-sidebar-text))',
          'active-bg': 'hsl(var(--color-sidebar-active-bg))',
          'hover-bg': 'hsl(var(--color-sidebar-hover-bg))',
          'active-text': 'hsl(var(--color-sidebar-active-text))',
        },
        success: { text: 'hsl(var(--color-success-text))', bg: 'hsl(var(--color-success-bg))' },
        warning: { text: 'hsl(var(--color-warning-text))', bg: 'hsl(var(--color-warning-bg))' },
        danger: { text: 'hsl(var(--color-danger-text))', bg: 'hsl(var(--color-danger-bg))' },
        info: { text: 'hsl(var(--color-info-text))', bg: 'hsl(var(--color-info-bg))' },
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
    }
  },
  plugins: [],
}
