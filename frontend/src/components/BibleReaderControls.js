import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Type } from 'lucide-react';
import { BIBLE_VERSIONS } from '../utils/bibleVersions';
import { READING_THEMES, READING_THEME_ORDER } from '../utils/bibleThemes';
import { hapticLight } from '../utils/haptics';

const ACCENT = '#2C4055';

// Version + reading-theme controls for the Bible reader, plus (when passed)
// the chapter prev/next chevrons on the same row. The pills are deliberately
// styled with the app's normal chrome (near-black text on a faint tint)
// rather than the active reading theme's own palette — except in Scripture,
// which gets its own parchment-matched tint so the row reads as part of the
// same header sheet rather than a mismatched white bar. No background/border
// of its own otherwise: the parent header owns that paint.
export default function BibleReaderControls({
  versionId,
  onVersionChange,
  themeId,
  onThemeChange,
  onPrevChapter,
  onNextChapter,
  prevDisabled,
  nextDisabled,
}) {
  const [open, setOpen] = useState(null); // 'version' | 'theme' | null
  const version = BIBLE_VERSIONS.find(v => v.id === versionId) || BIBLE_VERSIONS[0];
  const theme = READING_THEMES[themeId] || READING_THEMES.modern;
  const scripture = themeId === 'scripture';
  const chipBg = scripture ? '#E4D8BE' : 'rgba(44,64,85,0.08)';
  const chipText = scripture ? '#4A3D28' : '#0A0A0A';
  const chevronColor = scripture ? '#4A3D28' : '#5C6672';
  const navColor = scripture ? '#4A3D28' : '#9CA3AF';

  function pick(kind, value) {
    hapticLight();
    setOpen(null);
    if (kind === 'version') onVersionChange(value);
    else onThemeChange(value);
  }

  return (
    <div className="relative flex items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex items-center gap-2">
        {/* Version pill */}
        <button
          onClick={() => { hapticLight(); setOpen(o => (o === 'version' ? null : 'version')); }}
          aria-label="Change Bible version"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: chipBg }}
        >
          <span className="text-xs font-bold tracking-wide" style={{ color: chipText }}>{version.label}</span>
          <ChevronDown size={13} strokeWidth={2.4} color={chevronColor} />
        </button>

        {/* Reading-theme pill */}
        <button
          onClick={() => { hapticLight(); setOpen(o => (o === 'theme' ? null : 'theme')); }}
          aria-label="Change reading theme"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: chipBg }}
        >
          <Type size={13} strokeWidth={2.2} color={chipText} />
          <span className="text-xs font-semibold" style={{ color: chipText }}>{theme.name}</span>
          <ChevronDown size={13} strokeWidth={2.4} color={chevronColor} />
        </button>
      </div>

      {/* Chapter prev/next */}
      {(onPrevChapter || onNextChapter) && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onPrevChapter}
            disabled={prevDisabled}
            aria-label="Previous chapter"
            className="w-8 h-8 flex items-center justify-center text-xl disabled:opacity-30"
            style={{ color: navColor }}
          >‹</button>
          <button
            onClick={onNextChapter}
            disabled={nextDisabled}
            aria-label="Next chapter"
            className="w-8 h-8 flex items-center justify-center text-xl disabled:opacity-30"
            style={{ color: navColor }}
          >›</button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Tap-away dismiss */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(null)} />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute z-50 bg-white rounded-2xl overflow-hidden"
              style={{
                top: 'calc(100% - 2px)',
                left: open === 'version' ? 16 : 88,
                minWidth: open === 'version' ? 226 : 214,
                border: '1px solid #EFEFEF',
                boxShadow: '0 8px 24px rgba(10,10,10,0.10)',
              }}
            >
              {open === 'version'
                ? BIBLE_VERSIONS.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => pick('version', v.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid #F4F4F4' }}
                    >
                      <span
                        className="text-[11px] font-bold w-9 flex-shrink-0"
                        style={{ color: v.id === versionId ? ACCENT : '#8E8E8E' }}
                      >
                        {v.label}
                      </span>
                      <span className="flex-1 text-[13px] leading-tight" style={{ color: '#0A0A0A' }}>
                        {v.name}
                      </span>
                      {v.id === versionId && <Check size={14} strokeWidth={2.6} color={ACCENT} />}
                    </button>
                  ))
                : READING_THEME_ORDER.map((id, i) => {
                    const t = READING_THEMES[id];
                    return (
                      <button
                        key={id}
                        onClick={() => pick('theme', id)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid #F4F4F4' }}
                      >
                        {/* Mini preview swatch — the theme's own bg + font */}
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: t.bg, border: `1px solid ${t.border}` }}
                        >
                          <span style={{ color: t.textColor, fontFamily: t.fontFamily, fontSize: 14, lineHeight: 1 }}>Aa</span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold leading-tight" style={{ color: '#0A0A0A' }}>{t.name}</span>
                          <span className="block text-[11px] mt-0.5" style={{ color: '#8E8E8E' }}>{t.blurb}</span>
                        </span>
                        {id === themeId && <Check size={14} strokeWidth={2.6} color={ACCENT} />}
                      </button>
                    );
                  })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
