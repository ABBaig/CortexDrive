import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './modules/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-slate': 'var(--cd-bg)',
        'electric-cyan': 'var(--cd-primary)',
        'emerald': 'var(--cd-success)'
      }
    }
  },
  plugins: []
};

export default config;
