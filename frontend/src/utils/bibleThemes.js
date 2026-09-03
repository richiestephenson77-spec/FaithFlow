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
    lineHeight: 1.7,
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
    lineHeight: 1.7,
    // Left, not justified — justification on a narrow reader column produces
    // rivers of whitespace, worse with one-verse-per-line's short blocks.
    textAlign: 'left',
    verseNum: '#8A6D3B',
    highlight: 'rgba(138,109,59,0.16)',
    border: '#E7DCC8',
  },
  scripture: {
    name: 'Scripture',
    blurb: 'Aged parchment',
    // Parchment tones from the Bible Maps antique palette (#DED2B0 family),
    // lightened enough that near-black ink stays comfortably readable. This
    // pair is intentionally distinct from — and must not be confused with —
    // the Bible Maps antique-atlas palette (#7A2E2E/#A8823C/#DED2B0), which
    // is untouched.
    bg: '#E8DCC0',
    textColor: '#33291B',
    headingColor: '#2A2114',
    // EB Garamond leads for the parchment reading feel; the old system-serif
    // stack stays as a fallback chain if the webfont hasn't loaded yet.
    fontFamily: "'EB Garamond', 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
    fontSize: 18,
    lineHeight: 1.7,
    textAlign: 'left',
    verseNum: '#9C7B3F',
    highlight: 'rgba(156,123,63,0.22)',
    border: '#DED2B0',
  },
};

export const READING_THEME_ORDER = ['modern', 'paper', 'scripture'];

export const DEFAULT_READING_THEME_ID = 'modern';

export function getReadingTheme(id) {
  return READING_THEMES[id] || READING_THEMES[DEFAULT_READING_THEME_ID];
}
