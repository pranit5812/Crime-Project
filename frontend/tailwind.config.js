/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Space Grotesk", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.15), 0 0 30px rgba(56,189,248,0.2), 0 20px 40px rgba(0,0,0,0.4)",
        "glow-violet": "0 0 0 1px rgba(168,85,247,0.15), 0 0 30px rgba(168,85,247,0.2), 0 20px 40px rgba(0,0,0,0.4)",
        "glow-emerald": "0 0 0 1px rgba(52,211,153,0.15), 0 0 30px rgba(52,211,153,0.2), 0 20px 40px rgba(0,0,0,0.4)",
        "glow-rose": "0 0 0 1px rgba(244,63,94,0.15), 0 0 30px rgba(244,63,94,0.2), 0 20px 40px rgba(0,0,0,0.4)",
        "card": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover": "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.07)",
      },
      colors: {
        glass: "rgba(15,23,42,0.6)",
        "glass-light": "rgba(255,255,255,0.08)",
        "neon-blue": "#38bdf8",
        "neon-violet": "#a855f7",
        "neon-emerald": "#34d399",
        "neon-rose": "#f43f5e",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "grid-pattern": "linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 4s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "fade-up": "fade-up 0.5s ease forwards",
        "slide-in": "slide-in-left 0.4s ease forwards",
        "border-glow": "border-glow 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(56, 189, 248, 0.2)" },
          "50%": { borderColor: "rgba(168, 85, 247, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};
