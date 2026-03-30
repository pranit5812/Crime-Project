/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.4)",
      },
      colors: {
        glass: "rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
};
