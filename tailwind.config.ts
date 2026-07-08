import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: "#FF6B00",
          hover: "#E05A00",
          light: "var(--cream)",
        },
        green: {
          DEFAULT: "#1A6B3A",
          light: "#EAF6ED",
        },
        cream: "var(--cream)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        border: "var(--border)",
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
        },
        // Status colors
        placed: "#6B7280",
        confirmed: "#3B82F6",
        preparing: "#F59E0B",
        out_for_delivery: "#8B5CF6",
        delivered: "#10B981",
        cancelled: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "Yatra One", "cursive"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        premium: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
        saffron: "0 4px 20px rgba(255, 107, 0, 0.15)",
      },
      animation: {
        "pulse-fast": "pulseDot 2s infinite",
        "fade-in-up": "fadeInUp 0.3s ease-out forwards",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: "0.6" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
