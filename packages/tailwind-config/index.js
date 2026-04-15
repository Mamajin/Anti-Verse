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
          "primary": "#6B705C",       // Muted olive green
          "primary-focus": "#545749", // Darker olive
          "primary-content": "#ffffff",
          "secondary": "#CB997E",     // Terracotta / warm clay
          "secondary-focus": "#B48369",
          "secondary-content": "#ffffff",
          "accent": "#A5A58D",        // Light sage
          "neutral": "#8B7355",       // Warm bark brown
          "base-100": "#FDFBF7",      // Parchment / light sand background
          "base-200": "#F4EFE6",      // Soft beige
          "base-300": "#E8DCC8",      // Deeper beige
          "info": "#B7B7A4",
          "success": "#728C69",
          "warning": "#DDBEA9",
          "error": "#9E2A2B",
        },
      },
      "dark",
    ],
  },
};
