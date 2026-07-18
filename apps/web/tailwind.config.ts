import type { Config } from 'tailwindcss';

/**
 * "Rubrication" design system tokens. Colors are CSS variables holding raw
 * "R G B" channels (see globals.css) so `/alpha` modifiers work and dark mode
 * is a pure variable swap under the `.dark` class — components never branch
 * on theme themselves.
 */
const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        paper: { DEFAULT: withAlpha('--paper'), soft: withAlpha('--surface-2') },
        surface: withAlpha('--surface'),
        ink: { DEFAULT: withAlpha('--ink'), soft: withAlpha('--muted') },
        muted: withAlpha('--muted'),
        line: withAlpha('--line'),
        accent: {
          DEFAULT: withAlpha('--accent'),
          dark: withAlpha('--accent-strong'),
          soft: withAlpha('--accent-soft'),
          contrast: withAlpha('--accent-contrast'),
        },
        ok: { DEFAULT: withAlpha('--ok'), soft: withAlpha('--ok-soft') },
        warn: withAlpha('--warn'),
        danger: { DEFAULT: withAlpha('--danger'), soft: withAlpha('--danger-soft') },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
