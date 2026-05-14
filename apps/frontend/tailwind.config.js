/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1a2744',
        accent: { DEFAULT: '#f97316', hover: '#ea6c0a' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '0.75rem' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
};
