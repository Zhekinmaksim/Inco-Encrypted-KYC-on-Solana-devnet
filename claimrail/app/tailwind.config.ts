import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        bg:    { DEFAULT: "#f1f1f1", 1: "#e8e8e8", 2: "#ffffff" },
        ink:   { DEFAULT: "#000000", 2: "#555555", 3: "#999999" },
        blue:  { DEFAULT: "#2D5BFF" },
        green: { DEFAULT: "#1a8a4a" },
        amber: { DEFAULT: "#a06010" },
        red:   { DEFAULT: "#c02020" },
        b:     { DEFAULT: "rgba(0,0,0,0.12)", 2: "rgba(0,0,0,0.22)" },
      },
    },
  },
  plugins: [],
};
export default config;
