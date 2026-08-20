// Accent tint pairs for the inbox. These same five pairs are declared in
// tailwind.config.js as `tint.*`; they're mirrored here because a person's
// tint is chosen at RUNTIME from their id, which Tailwind can't do statically.
// Components import from here rather than writing hex inline.
export const TINTS = [
  { id: 'clay',  ring: '#B8705A', fill: '#F7EFEA' },
  { id: 'gold',  ring: '#B08A3E', fill: '#F7F1E4' },
  { id: 'olive', ring: '#5F8465', fill: '#EDF3EE' },
  { id: 'slate', ring: '#2C4055', fill: '#E9EDF2' },
  { id: 'rose',  ring: '#B06A76', fill: '#F7EDEF' },
];

export const TINT_BY_ID = Object.fromEntries(TINTS.map(t => [t.id, t]));

// Stable per-person tint: the same user always gets the same colour, so the
// inbox doesn't reshuffle its palette on every render or refetch.
export function tintFor(key = '') {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return TINTS[sum % TINTS.length];
}

// Tokens that aren't person-specific but are needed as runtime values
// (inline styles on ring/cutout colours, etc.).
export const INK = '#0A0A0A';
export const MUTED = '#8A857E';
export const FAINT = '#A5A09A';
export const ACCENT = '#2C4055';
export const SURFACE = '#FBFAF8';
export const CARD = '#FFFFFF';
export const BORDER = '#EFEFEF';
export const DIVIDER = '#F4F3F1';
export const RECESS = '#F1EFEB';
export const OLIVE = '#5F8465'; // online dot
export const CLAY = '#B8705A';  // unread / badge dot
