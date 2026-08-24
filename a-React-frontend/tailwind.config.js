/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NeoCloud Brand Colors
        'neo-blue': '#0ea5e9',    // Bright Cyan for primary actions
        'neo-dark': '#0f172a',    // Deep Slate for sidebars/headers
        'neo-success': '#10b981', // Emerald for completed topics
        'neo-danger': '#ef4444',  // Red for disputes/errors
        'neo-bg': '#f8fafc',      // Light gray-blue for page backgrounds
      },
      fontFamily: {
        // "Inter" is the standard for modern dashboards
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Soft shadows for your cards
        'neo': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}