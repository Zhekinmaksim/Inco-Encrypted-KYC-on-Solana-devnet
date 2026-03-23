import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { display: ['"JetBrains Mono"', 'monospace'], body: ['"DM Sans"', 'sans-serif'] },
      colors: {
        inco: { dark: '#080a0f', panel: '#0f1117', border: '#1a1d2e', accent: '#00e5a0', accent2: '#6366f1', warn: '#f59e0b', danger: '#ef4444', muted: '#6b7280', text: '#e2e8f0' }
      },
      animation: { 'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite', 'fade-in': 'fadeIn 0.5s ease-out forwards', 'slide-up': 'slideUp 0.4s ease-out forwards' },
      keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }, slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } },
    },
  },
  plugins: [],
};
export default config;
