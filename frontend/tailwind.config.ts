import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f4ff",
        ink: "#1f1b2e",
        accent: "#7c3aed",
        panel: "#fcfaff",
      },
    },
  },
  plugins: [],
};

export default config;
