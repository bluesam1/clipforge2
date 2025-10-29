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
        'track-alt': '#f1f3f4',
        'clip-selected': '#2563eb',
        'playhead': '#ef4444',
        'preview-bg': '#1a1a1a',
      },
      spacing: {
        'timeline-track': '5rem', // 80px
        'clip-padding': '0.5rem',
      },
      width: {
        'clip-min': '2.5rem', // 40px minimum clip width
      },
    },
  },
  plugins: [],
};
