import { useId } from 'react';
import WordSpan from '../WordSpan';
import { ScripturePaper, ScriptureMarginArt, ScriptureCrest, getInitial } from './ScriptureArt';
import '../../styles/scripture.css';

// The manuscript treatment for the Scripture theme only. Modern and Paper
// never reach this file — Bible.js branches before rendering.
//
// Everything decorative lives in aria-hidden SVGs, and the verse strings come
// straight from the Bible data source, so copy/share still hands back the
// original text rather than anything this file draws.

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
function roman(n) {
  let rest = n, out = '';
  for (const [value, numeral] of ROMAN) {
    while (rest >= value) { out += numeral; rest -= value; }
  }
  return out || String(n);
}

// Splits a verse so an original capital can stand in for its first letter,
// keeping any punctuation that precedes it. Returns null when the opening
// character isn't a Latin letter we have art for — the caller then leaves the
// text intact, which is what the handoff asks for on unsupported scripts.
function splitForInitial(text) {
  const match = text.match(/^([^\p{L}]*)(\p{L})([\s\S]*)$/u);
  if (!match) return null;
  const [, lead, letter, rest] = match;
  const art = getInitial(letter);
  if (!art) return null;
  return { lead, letter, rest, art };
}

function VerseWords({ words, verseRef, onWordLongPress, firstWordDisplay }) {
  return words.map((word, i) => (
    <WordSpan
      key={i}
      rawWord={word}
      displayText={i === 0 && firstWordDisplay != null ? firstWordDisplay : undefined}
      verseRef={verseRef}
      onLongPress={onWordLongPress}
    />
  ));
}

export default function ScriptureReader({
  book,
  chapter,
  verses,
  versionLabel,
  activeVerse,
  copied,
  onCopyVerse,
  onWordLongPress,
  highlight,
}) {
  // Two readers can be mounted at once (the tab-slide peek layer renders a
  // second copy), so the paper's six defs need an id namespace per instance.
  const uid = useId();
  const idPrefix = `${uid.replace(/[^a-zA-Z0-9]/g, '')}-`;

  return (
    <article data-reader-theme="scripture" aria-labelledby={`${idPrefix}chapter-heading`}>
      <ScripturePaper p={idPrefix} />
      <ScriptureCrest />

      <div className="ms-content">
        <ScriptureMarginArt />

        <h1 className="ms-heading" id={`${idPrefix}chapter-heading`}>
          <small>{versionLabel}</small>
          {book.name} <span>{roman(chapter)}</span>
        </h1>

        <ol className="ms-verses">
          {verses.map((v, i) => {
            const text = (v.text || '').trim();
            const words = text.split(/\s+/).filter(Boolean);
            const initial = i === 0 ? splitForInitial(text) : null;

            return (
              <li
                key={i}
                id={`verse-${v.verse}`}
                className="ms-verse group"
                style={{ background: activeVerse === v.verse ? highlight : 'transparent' }}
              >
                <span className="ms-number">{v.verse}</span>

                {initial ? (
                  <>
                    {initial.lead}
                    {initial.art}
                    {/* The capital is drawn, so the letter it stands for is
                        repeated here for screen readers and the spoken verse
                        stays complete. */}
                    <span className="ms-sr">{initial.letter}</span>
                    <VerseWords
                      words={words}
                      verseRef={`${book.name} ${chapter}:${v.verse}`}
                      onWordLongPress={onWordLongPress}
                      // The first word keeps its full value for word lookup
                      // while displaying only what follows the drawn capital.
                      firstWordDisplay={words[0].slice(initial.lead.length + 1)}
                    />
                  </>
                ) : (
                  <VerseWords
                    words={words}
                    verseRef={`${book.name} ${chapter}:${v.verse}`}
                    onWordLongPress={onWordLongPress}
                  />
                )}

                <button
                  onClick={() => onCopyVerse(v)}
                  aria-label={`Copy ${book.name} ${chapter}:${v.verse}`}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center w-5 h-5 align-middle rounded transition-opacity ml-0.5"
                  style={{ background: 'rgba(122,46,46,0.12)' }}
                >
                  {copied === v.verse ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7A2E2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </article>
  );
}
