import { useRef } from 'react';

export default function WordSpan({ rawWord, verseRef, onLongPress }) {
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
      className="cursor-pointer hover:bg-amber-50 rounded px-0.5 transition-colors"
    >
      {rawWord}{' '}
    </span>
  );
}
