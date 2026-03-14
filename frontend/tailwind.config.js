/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#9E7FFF",
        secondary: "#38bdf8",
        accent: "#f472b6",
        background: "#171717",
        surface: "#262626",
        text: "#FFFFFF",
        textSecondary: "#A3A3A3",
        border: "#2F2F2F",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        'xl': '16px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(158, 127, 255, 0.5)',
      },
    },
  },
  plugins: [],
};
