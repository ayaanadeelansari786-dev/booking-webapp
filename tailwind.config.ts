import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#f5f7fa",
        line: "#d7dde6",
        brand: "#0f766e",
        "brand-dark": "#134e4a",
        accent: "#b45309"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(17, 24, 39, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
