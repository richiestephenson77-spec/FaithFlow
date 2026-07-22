// Chat theme system. Each theme is pure config (no image assets this batch);
// adding an image-background theme later is just a new entry with an extra
// `backgroundImage` field the ChatThread can read.
//
// Shape: { name, background, myBubble, myBubbleText, theirBubble,
//          theirBubbleText, theirBubbleBorder, headerBg, headerText, composerBg }

export const CHAT_THEMES = {
  light: {
    name: 'Light',
    background: '#FFFFFF',
    myBubble: '#2C4055', myBubbleText: '#FFFFFF',
    theirBubble: '#FFFFFF', theirBubbleText: '#1A1A1A', theirBubbleBorder: '#EFEFEF',
    headerBg: '#FFFFFF', headerText: '#0A0A0A', composerBg: '#FFFFFF',
  },
  dark: {
    name: 'Dark',
    background: '#0A0A0A',
    myBubble: '#2C4055', myBubbleText: '#FFFFFF',
    theirBubble: '#1E1E1E', theirBubbleText: '#F4F4F5', theirBubbleBorder: '#2A2A2A',
    headerBg: '#0A0A0A', headerText: '#FFFFFF', composerBg: '#141414',
  },
  blue: {
    name: 'Blue',
    background: '#EAF1FB',
    myBubble: '#2563EB', myBubbleText: '#FFFFFF',
    theirBubble: '#FFFFFF', theirBubbleText: '#1A1A1A', theirBubbleBorder: '#DCE7F7',
    headerBg: '#EAF1FB', headerText: '#0A0A0A', composerBg: '#EAF1FB',
  },
  green: {
    name: 'Green',
    background: '#E9F6EE',
    myBubble: '#1E7E45', myBubbleText: '#FFFFFF',
    theirBubble: '#FFFFFF', theirBubbleText: '#1A1A1A', theirBubbleBorder: '#D6ECDE',
    headerBg: '#E9F6EE', headerText: '#0A0A0A', composerBg: '#E9F6EE',
  },
  purple: {
    name: 'Purple',
    background: '#F1ECFB',
    myBubble: '#7A5CD0', myBubbleText: '#FFFFFF',
    theirBubble: '#FFFFFF', theirBubbleText: '#1A1A1A', theirBubbleBorder: '#E3DAF6',
    headerBg: '#F1ECFB', headerText: '#0A0A0A', composerBg: '#F1ECFB',
  },
  rose: {
    name: 'Rose',
    background: '#FCECF1',
    myBubble: '#C64B72', myBubbleText: '#FFFFFF',
    theirBubble: '#FFFFFF', theirBubbleText: '#1A1A1A', theirBubbleBorder: '#F6D9E2',
    headerBg: '#FCECF1', headerText: '#0A0A0A', composerBg: '#FCECF1',
  },
};

// Order for the theme picker swatches.
export const CHAT_THEME_ORDER = ['light', 'dark', 'blue', 'green', 'purple', 'rose'];

export function getChatTheme(id) {
  return CHAT_THEMES[id] || CHAT_THEMES.light;
}
