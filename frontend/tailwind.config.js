/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1976d2',
          dark: '#1565c0',
          light: '#42a5f5',
        },
        surface: '#ffffff',
        background: '#fafafa',
      },
      boxShadow: {
        'md-1': '0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)',
        'md-2': '0px 3px 6px rgba(0,0,0,0.15), 0px 2px 4px rgba(0,0,0,0.12)',
        'md-4': '0px 6px 10px rgba(0,0,0,0.14), 0px 1px 18px rgba(0,0,0,0.12)',
      },
      minWidth: {
        'platform': '1280px',
      },
    },
  },
  plugins: [],
}
