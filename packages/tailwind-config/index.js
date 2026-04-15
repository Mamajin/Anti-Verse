/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // We defer to daisyUI for most things, but can add custom utility colors here
        'off-white': '#f5f5f7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        antiverseTheme: {
          "primary": "#34d399",     // Emerald 400
          "primary-focus": "#059669",// Emerald 600
          "secondary": "#38bdf8",   // Light Blue 400
          "accent": "#f472b6",      // Pink 400
          "neutral": "#1f2937",     // Gray 800
          "base-100": "#ffffff",    // Background
          "base-200": "#f3f4f6",    // Slightly darker background
          "base-300": "#e5e7eb",    // Even darker
          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
      },
      "dark",
    ],
  },
};
