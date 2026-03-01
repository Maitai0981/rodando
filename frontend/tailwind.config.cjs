/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1C9C4B',
          amber: '#C28A0E',
          slate: '#142235',
        },
      },
      boxShadow: {
        'mobile-nav': '0 12px 30px rgba(2, 6, 23, 0.32)',
      },
      borderRadius: {
        '2xl-plus': '1.25rem',
      },
    },
  },
  plugins: [],
}
