import { useRef } from 'react';

export default function WordSpan({ rawWord, verseRef, onLongPress, fontFamily }) {
  const pressTimer = useRef(null);
  const fired = useRef(false);
  const cleanWord = rawWord.replace(/[^a-zA-Z]/g, '');

  function handleStart() {
    fired.current = false;
    if (!cleanWord) return;
    pressTimer.current = setTimeout(() => {
      fired.current = true;
      onLongPress(cleanWord, verseRef);
    }, 600);
  }

  function handleEnd() {
    clearTimeout(pressTimer.current);
  }

  if (!rawWord) return null;

  return (
    <span
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleEnd}
      onContextMenu={(e) => fired.current && e.preventDefault()}
      className="cursor-pointer hover:bg-terracotta-50 rounded px-0.5 transition-colors"
      // index.css has `* { font-family: 'Inter', sans-serif; }` — a universal
      // rule that matches (and wins on) every element directly, so a reading
      // theme's font set only on an ancestor never actually reaches these
      // word spans via inheritance. Setting it inline here, same as the
      // reader's own heading already does, is what makes it stick.
      style={fontFamily ? { fontFamily } : undefined}
    >
      {rawWord}{' '}
    </span>
  );
}
