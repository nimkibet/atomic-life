import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode color palette
        'dark-bg': '#0a0a0f',
        'dark-card': '#151520',
        'dark-border': '#252535',
        // Accent colors
        'accent-success': '#10b981',
        'accent-warning': '#f59e0b',
        'accent-error': '#ef4444',
        'accent-info': '#3b82f6',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's reset to avoid conflicts with our custom styles
  },
};

export default config;
