module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        faith: { 50: '#f0f4ff', 100: '#e0e9ff', 500: '#3b5bdb', 600: '#2f4ac0', 700: '#1e3a8a' },
        // Terracotta accent scale (centered on #C0603F). Replaces the old amber palette.
        terracotta: {
          50: '#FBF0EC', 100: '#F5DDD3', 200: '#E9B9A6', 300: '#DA8E71',
          400: '#CE7150', 500: '#C0603F', 600: '#A64E30', 700: '#8A3F27', 800: '#6E3220',
        },
      },
    },
  },
  plugins: [],
};
