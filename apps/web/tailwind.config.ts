import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
      colors: {
        // Warm, editorial palette — cream/paper background, ink-charcoal
        // text, and a single amber accent (matches the generated hero art).
        paper: {
          DEFAULT: '#FBF8F2',
          soft: '#F5F0E6',
        },
        ink: {
          DEFAULT: '#1A1917',
          soft: '#3D3A34',
        },
        accent: {
          DEFAULT: '#C2703D',
          dark: '#A85A2C',
          soft: '#E8C9AE',
        },
      },
    },
  },
  plugins: [],
};

export default config;
