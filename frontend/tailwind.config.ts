import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0d1a",
        accent: {
          pink: "#e040fb",
          purple: "#7c4dff"
        }
      },
      fontFamily: {
        sans: ['"Syne"', '"Clash Display"', 'sans-serif']
      }
    },
  },
  plugins: [],
};
export default config;
