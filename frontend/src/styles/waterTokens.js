export const WATER_BLUE = {
  background: 'radial-gradient(circle at 32% 22%, rgba(255,255,255,0.97) 0%, rgba(232,248,252,0.75) 32%, rgba(196,232,244,0.55) 65%, rgba(155,210,230,0.5) 100%)',
  boxShadow: [
    '0 2px 4px rgba(20,50,80,0.05)',
    '0 22px 42px -8px rgba(20,60,95,0.22)',
    '0 8px 18px -4px rgba(20,60,95,0.1)',
    'inset 0 -10px 18px rgba(90,180,205,0.2)',
    'inset 0 3px 3px rgba(255,255,255,0.95)',
  ].join(', '),
  border: '0.5px solid rgba(255,255,255,0.7)',
};

export const WATER_VIOLET = {
  background: 'radial-gradient(circle at 32% 22%, rgba(230,215,245,0.97) 0%, rgba(195,165,225,0.8) 32%, rgba(160,125,205,0.6) 65%, rgba(130,95,185,0.55) 100%)',
  boxShadow: [
    '0 2px 4px rgba(60,30,100,0.08)',
    '0 22px 42px -8px rgba(60,30,100,0.22)',
    '0 8px 18px -4px rgba(60,30,100,0.1)',
    'inset 0 -10px 18px rgba(120,80,180,0.2)',
    'inset 0 3px 3px rgba(255,255,255,0.7)',
  ].join(', '),
  border: '0.5px solid rgba(255,255,255,0.7)',
};

// Terracotta accent (was gold) — tuned around #C0603F
export const WATER_GOLD = {
  background: 'radial-gradient(circle at 32% 22%, rgba(252,240,234,0.98) 0%, rgba(244,208,190,0.82) 32%, rgba(220,150,120,0.65) 65%, rgba(192,96,63,0.55) 100%)',
  boxShadow: [
    '0 2px 4px rgba(90,40,25,0.06)',
    '0 22px 42px -8px rgba(90,40,25,0.2)',
    '0 8px 18px -4px rgba(90,40,25,0.1)',
    'inset 0 -10px 18px rgba(170,80,50,0.2)',
    'inset 0 3px 3px rgba(255,255,255,0.95)',
  ].join(', '),
  border: '0.5px solid rgba(255,255,255,0.7)',
};

export const WATER_NEUTRAL = {
  background: 'radial-gradient(circle at 32% 15%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 40%, rgba(240,241,243,0.8) 100%)',
  boxShadow: [
    '0 2px 4px rgba(20,20,30,0.05)',
    '0 16px 32px -6px rgba(20,20,30,0.18)',
    '0 6px 14px -4px rgba(20,20,30,0.1)',
    'inset 0 -6px 12px rgba(200,205,212,0.35)',
    'inset 0 2px 2px rgba(255,255,255,0.95)',
  ].join(', '),
  border: '0.5px solid rgba(255,255,255,0.8)',
};

export const SPECULAR = {
  content: "''",
  position: 'absolute',
  top: '-25%',
  left: '-15%',
  width: '60%',
  height: '60%',
  background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 45%, transparent 70%)',
  pointerEvents: 'none',
};

export const TONES = { blue: WATER_BLUE, violet: WATER_VIOLET, gold: WATER_GOLD, neutral: WATER_NEUTRAL };
