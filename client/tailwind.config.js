/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'handwriting': ['Handlee', 'cursive'],
      },
      colors: {
        'matte-black': '#121212',
        'dark-surface': '#1E1E1E',
        'dark-border': '#333333',
        'dark-text': '#E0E0E0',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 