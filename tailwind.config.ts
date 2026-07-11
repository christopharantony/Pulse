import type { Config } from 'tailwindcss';

function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: withOpacity('--color-background'),
        surface: {
          DEFAULT: withOpacity('--color-surface'),
          elevated: withOpacity('--color-surface-elevated'),
        },
        border: {
          DEFAULT: withOpacity('--color-border'),
          subtle: withOpacity('--color-border-subtle'),
        },
        foreground: withOpacity('--color-foreground'),
        muted: {
          DEFAULT: withOpacity('--color-muted'),
          foreground: withOpacity('--color-muted-foreground'),
        },
        accent: {
          DEFAULT: withOpacity('--color-accent'),
          strong: withOpacity('--color-accent-strong'),
          foreground: withOpacity('--color-accent-foreground'),
        },
        secondary: {
          glow: withOpacity('--color-secondary-glow'),
        },
        destructive: {
          DEFAULT: withOpacity('--color-destructive'),
          strong: withOpacity('--color-destructive-strong'),
        },
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
        label: ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow-accent)',
      },
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        toast: 'var(--z-toast)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '350ms',
      },
      transitionTimingFunction: {
        'expo-out': 'var(--ease-out-expo)',
      },
      keyframes: {
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.25s var(--ease-out-expo) both',
        'slide-in-right': 'slide-in-right 0.25s var(--ease-out-expo) both',
        'scale-in': 'scale-in 0.15s var(--ease-out-expo) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
