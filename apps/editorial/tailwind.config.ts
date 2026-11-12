import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FA", // Seitenhintergrund — sehr helles neutrales Grau
        panel: "#FFFFFF",
        border: "#E4E7EC",
        accent: {
          DEFAULT: "#4F46E5", // einzige Akzentfarbe, für primäre Aktionen
          hover: "#4338CA",
        },
        // Feste Statusfarben — durchgängig über die ganze Redaktion
        status: {
          draft: "#6B7280",
          review: "#B45309",
          approved: "#1D4ED8",
          live: "#15803D",
          rejected: "#B91C1C",
          archived: "#9CA3AF",
        },
      },
      fontSize: {
        xs2: ["11px", "16px"],
      },
    },
  },
  plugins: [],
} satisfies Config;
