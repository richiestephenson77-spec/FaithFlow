// Reading themes for the Bible reader's SCRIPTURE AREA only — the nav, header
// and the version/theme controls keep the app's normal chrome so they stay
// legible on every background.
//
// Same config-object pattern as chatThemes: adding a theme is one entry.
// Shape: { name, blurb, bg, textColor, fontFamily, fontSize, lineHeight,
//          textAlign, verseNum, highlight, border, headingColor }

export const READING_THEMES = {
  modern: {
    name: 'Modern',
    blurb: 'Clean and digital',
    bg: '#FFFFFF',
    textColor: '#1F2937',
    headingColor: '#0A0A0A',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    fontSize: 17,
    lineHeight: 1.75,
    textAlign: 'left',
    verseNum: '#2C4055',
    highlight: 'rgba(44,64,85,0.13)',
    border: '#EFEFEF',
  },
  paper: {
    name: 'Paper',
    blurb: 'Printed book',
    bg: '#FAF6EE',
    textColor: '#2B2620',
    headingColor: '#1C1811',
    fontFamily: "Georgia, 'Fraunces', 'Times New Roman', serif",
    fontSize: 18,
    lineHeight: 1.8,
    textAlign: 'justify',
    verseNum: '#8A6D3B',
    highlight: 'rgba(138,109,59,0.16)',
    border: '#E7DCC8',
  },
  scripture: {
    name: 'Scripture',
    blurb: 'Aged parchment',
    // Parchment tones from the Bible Maps antique palette (#DED2B0 family),
    // lightened enough that near-black ink stays comfortably readable.
    bg: '#EFE4C8',
    textColor: '#3A2E1E',
    headingColor: '#2A2114',
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
    fontSize: 18,
    lineHeight: 1.85,
    textAlign: 'justify',
    verseNum: '#8C6A2F',
    highlight: 'rgba(140,106,47,0.22)',
    border: '#DED2B0',
  },
};

export const READING_THEME_ORDER = ['modern', 'paper', 'scripture'];

export const DEFAULT_READING_THEME_ID = 'modern';

export function getReadingTheme(id) {
  return READING_THEMES[id] || READING_THEMES[DEFAULT_READING_THEME_ID];
}
