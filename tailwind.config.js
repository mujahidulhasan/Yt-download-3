/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
        },
      },
      borderRadius: {
        'card': '12px',
        'button': '12px',
        'input': '14px',
        'modal': '18px',
        'thumbnail': '14px',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
