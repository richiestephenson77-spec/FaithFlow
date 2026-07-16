// Flat design tokens (the former "water-glass" system is now flat mono).
// White surfaces, hairline #EFEFEF borders, no gradients / shadows / specular.
export const FLAT_CARD = {
  background: '#FFFFFF',
  boxShadow: 'none',
  border: '1px solid #EFEFEF',
};

export const WATER_BLUE = FLAT_CARD;
export const WATER_NEUTRAL = FLAT_CARD;

// Terracotta accent surface (used by primary buttons)
export const WATER_GOLD = {
  background: '#C0603F',
  boxShadow: 'none',
  border: '1px solid #C0603F',
};

// Confession Wall's purple hero is an allowed exception — kept as a flat violet.
export const WATER_VIOLET = {
  background: '#8A5CD0',
  boxShadow: 'none',
  border: '1px solid #8A5CD0',
};

// No specular highlight in the flat system.
export const SPECULAR = { display: 'none' };

export const TONES = { blue: WATER_BLUE, violet: WATER_VIOLET, gold: WATER_GOLD, neutral: WATER_NEUTRAL };
