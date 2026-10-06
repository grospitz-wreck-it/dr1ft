import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Chrome: die App-Hülle, immer ruhig und dunkel — "Analyse-Modus"
        ink: {
          DEFAULT: "#14182B",
          light: "#1D2140",
          border: "#2A2F52",
        },
        // Content-Karten: bewusst neutral hell, wirken wie "echte" Posts
        paper: {
          DEFAULT: "#EFEFEA",
          dim: "#E2E1D9",
        },
        // Marker-Gelb: AUSSCHLIESSLICH für Manipulations-Annotationen
        marker: "#FFC857",
        // Kompetenz-/Fortschrittsanzeigen
        growth: "#2F9E8F",
        ash: "#8A8D9F",
        // Player chrome: zentrale Tokens für die expressive Social-App-Hülle.
        drift: {
          bg: "var(--drift-bg)",
          surface: "var(--drift-surface)",
          "surface-soft": "var(--drift-surface-soft)",
          ink: "var(--drift-ink)",
          "ink-soft": "var(--drift-ink-soft)",
        },
        shell: {
          DEFAULT: "rgb(23 16 39 / <alpha-value>)",
          surface: "rgb(36 26 59 / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "18px",
        panel: "30px",
        tile: "22px",
        control: "17px",
      },
      boxShadow: {
        shell: "0 24px 80px rgb(42 20 75 / 28%)",
        "shell-soft": "0 12px 42px rgb(42 20 75 / 25%)",
        "shell-nav": "0 16px 48px rgb(42 20 75 / 28%)",
        brand: "0 10px 28px rgb(168 85 247 / 38%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
