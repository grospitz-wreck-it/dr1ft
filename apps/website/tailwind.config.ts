import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#E8EDF7",
        marker: "#22D3EE",
        growth: "#22D3EE",
        ash: "#94A3B8",
        canvas: "#080D1D",
        subtle: "#0D1226",
        border: "#24304A",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
