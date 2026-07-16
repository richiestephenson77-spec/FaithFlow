module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        faith: { 50: '#f0f4ff', 100: '#e0e9ff', 500: '#3b5bdb', 600: '#2f4ac0', 700: '#1e3a8a' },
        // Accent scale (centered on #2C4055, deep slate-navy). Named "terracotta" for
        // historical reasons — the token, not the hue, is what's referenced app-wide.
        terracotta: {
          50: '#EEF2F5', 100: '#DCE3EA', 200: '#B8C5D2', 300: '#8DA0B3',
          400: '#5C7289', 500: '#2C4055', 600: '#25374A', 700: '#1E2D3D', 800: '#172230',
        },
      },
    },
  },
  plugins: [],
};
