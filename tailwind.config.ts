import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Backgrounds (neutros cálidos)
        "bg-primary":   "#ffffff",
        "bg-secondary": "#f5f5f3",
        "bg-tertiary":  "#eeece6",

        // Text
        "text-primary":   "#1a1a18",
        "text-secondary": "#5f5e5a",
        "text-tertiary":  "#9a9892",

        // Brand
        "brand-blue":       "#185FA5",
        "brand-blue-light": "#E6F1FB",
        "brand-blue-mid":   "#378ADD",
        "brand-blue-pale":  "#B5D4F4",

        // Status semantics
        "status-ok": {
          DEFAULT: "#3B6D11",
          bg: "#EAF3DE",
        },
        "status-warn": {
          DEFAULT: "#854F0B",
          bg: "#FAEEDA",
          mid: "#EF9F27",
        },
        "status-danger": {
          DEFAULT: "#A32D2D",
          bg: "#FCEBEB",
          mid: "#E24B4A",
        },
        "status-info": {
          DEFAULT: "#185FA5",
          bg: "#E6F1FB",
        },

        // Borders
        border: { DEFAULT: "rgba(0,0,0,0.08)", md: "rgba(0,0,0,0.16)" },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI",
          "Helvetica", "Arial", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", "Menlo",
          "Monaco", "Consolas", "monospace",
        ],
      },
      fontSize: {
        // Override defaults to match prototype densities
        xs:  ["11px", { lineHeight: "1.5" }],
        sm:  ["12px", { lineHeight: "1.5" }],
        base:["13px", { lineHeight: "1.5" }], // Body base = 13px
        md:  ["14px", { lineHeight: "1.5" }],
        lg:  ["15px", { lineHeight: "1.4" }],
        xl:  ["18px", { lineHeight: "1.3" }],
        "2xl":["24px",{ lineHeight: "1.2" }],
        "3xl":["26px",{ lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
      },
      keyframes: {
        "fade-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in":  "fade-in .15s ease",
        "slide-up": "slide-up .2s ease",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
