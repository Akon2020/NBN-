/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens de marque NBN Express (CLAUDE.md §10) — mêmes noms que côté
      // Frontend (app/globals.css) pour une cohérence garantie par
      // construction : bg-primary-900, text-accent-600, etc.
      colors: {
        primary: {
          900: "#14294A",
          700: "#1E3A63",
        },
        accent: {
          500: "#F25414",
          600: "#C13F0B",
        },
        secondary: {
          600: "#245640",
        },
        success: {
          500: "#2F7350",
        },
        warning: {
          500: "#F59E0B",
        },
        error: {
          500: "#D92D20",
        },
        neutral: {
          900: "#16181D",
          600: "#5B6472",
          100: "#F7F7F7",
        },
      },
    },
  },
  plugins: [],
};
