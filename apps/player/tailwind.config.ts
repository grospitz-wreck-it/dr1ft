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
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
} satisfies Config;
