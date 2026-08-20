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

        // --- Inbox design tokens -------------------------------------------
        // Neutral ramp for the Messages inbox (and available app-wide). Use
        // these instead of literal hex so the palette stays consistent.
        page: '#F4F2EE',      // app bg outside the column
        surface: '#FBFAF8',   // screen background
        card: '#FFFFFF',      // cards, search field, pills, tab bar
        line: '#EFEFEF',      // every 1px border  (aliased as `border` below)
        border: '#EFEFEF',    // spec name — enables `border-border`
        divider: '#F4F3F1',   // row separators, hover fill
        ink: '#0A0A0A',       // headings, unread text
        muted: '#8A857E',     // secondary text
        faint: '#A5A09A',     // timestamps, inactive icons
        accent: '#2C4055',    // active pill, unread dot, links
        recess: '#F1EFEB',    // recessed search field / active tab chip

        // Accent tint pairs (ring + fill). Used ONLY on avatars, note bubbles
        // and labels. The same values are mirrored in utils/inboxTints.js for
        // the cases where a tint has to be picked at runtime per-person.
        tint: {
          clay:  { DEFAULT: '#B8705A', fill: '#F7EFEA' },
          gold:  { DEFAULT: '#B08A3E', fill: '#F7F1E4' },
          olive: { DEFAULT: '#5F8465', fill: '#EDF3EE' },
          slate: { DEFAULT: '#2C4055', fill: '#E9EDF2' },
          rose:  { DEFAULT: '#B06A76', fill: '#F7EDEF' },
        },
      },
      fontFamily: {
        fraunces: ["'Fraunces'", 'serif'],
      },
      boxShadow: {
        // The only two shadows the design allows.
        card: '0 1px 2px rgba(10,10,10,.04)',
        tabbar: '0 2px 10px rgba(10,10,10,.05)',
      },
    },
  },
  plugins: [],
};
