import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      boxShadow: {
        "inner-lg": "inset 0 2px 4px 0 rgb(15 23 42 / 0.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
