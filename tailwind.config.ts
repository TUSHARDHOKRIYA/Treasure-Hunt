import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090F",
          900: "#0C1018",
          850: "#111623",
          800: "#161C2C",
          700: "#222A3F",
          600: "#323C57",
          500: "#56607C",
          400: "#8A93AD",
          300: "#B6BDD1",
          200: "#DCE0EB",
          100: "#F1F3F8",
        },
        gold: {
          300: "#FFE29A",
          400: "#FFD166",
          500: "#F5B700",
          600: "#C99200",
        },
        good: "#34D399",
        warn: "#FBBF24",
        bad: "#F87171",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,209,102,.25), 0 10px 40px -10px rgba(245,183,0,.45)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "60%": { transform: "scale(1.04)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        shake: { "10%,90%": { transform: "translateX(-2px)" }, "20%,80%": { transform: "translateX(4px)" }, "30%,50%,70%": { transform: "translateX(-6px)" }, "40%,60%": { transform: "translateX(6px)" } },
        scanline: { "0%": { top: "8%" }, "50%": { top: "88%" }, "100%": { top: "8%" } },
      },
      animation: {
        rise: "rise .45s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .5s cubic-bezier(.2,.8,.2,1) both",
        shake: "shake .5s both",
        scanline: "scanline 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
