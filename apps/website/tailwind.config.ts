import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14182B",
        marker: "#FFC857",
        growth: "#2F9E8F",
        ash: "#6B7280",
        canvas: "#FFFFFF",
        subtle: "#F7F7F5",
        border: "#E7E5E0",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
