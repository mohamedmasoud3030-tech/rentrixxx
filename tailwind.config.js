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
        background: 'hsl(var(--color-bg))',
        surface: 'hsl(var(--color-card))',

        'surface-dim': 'hsl(var(--color-bg))',
        'surface-container-lowest': 'hsl(var(--color-bg))',
        'surface-container-low': 'hsl(var(--color-card))',
        'surface-container': 'hsl(var(--color-card))',
        'surface-container-high': 'color-mix(in srgb, hsl(var(--color-card)) 72%, hsl(var(--color-border)))',
        'surface-container-highest': 'color-mix(in srgb, hsl(var(--color-card)) 64%, hsl(var(--color-border)))',
        'surface-bright': 'color-mix(in srgb, hsl(var(--color-card)) 58%, hsl(var(--color-border)))',
        'primary-container': 'color-mix(in srgb, hsl(var(--color-primary)) 24%, hsl(var(--color-card)))',
        'on-primary': 'hsl(var(--color-primary-fg))',
        'on-primary-container': 'color-mix(in srgb, hsl(var(--color-primary-fg)) 86%, hsl(var(--color-primary)) 14%)',
        secondary: 'hsl(var(--color-text-muted))',
        tertiary: 'color-mix(in srgb, hsl(var(--color-primary)) 40%, hsl(var(--color-card)))',
        error: 'hsl(var(--color-danger-text))',
        'error-container': 'hsl(var(--color-danger-bg))',
        'on-surface': 'hsl(var(--color-text-primary))',
        'on-surface-variant': 'hsl(var(--color-text-muted))',
        outline: 'hsl(var(--color-border))',
        'outline-variant': 'hsl(var(--color-border))',
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
