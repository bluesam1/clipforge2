/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,js,ts,jsx,tsx}',
    './src/renderer/index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-hover': '#1d4ed8',
        secondary: '#6b7280',
        'timeline-bg': '#f8f9fa',
        'preview-bg': '#1a1a1a',
      },
      spacing: {
        'timeline-track': '5rem',
        'clip-padding': '0.5rem',
      },
    },
  },
  plugins: [],
};
