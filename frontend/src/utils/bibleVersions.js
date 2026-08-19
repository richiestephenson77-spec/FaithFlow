// Bible version registry + per-source adapters.
//
// Every source normalizes to ONE internal verse shape so the reader renders
// all translations identically regardless of where the text came from:
//     { book_name, chapter, verse, text }
// That is bible-api.com's native shape — the shape the reader already used —
// so adding new sources required no change to the rendering code at all.
//
// Adding a version later (e.g. a licensed NIV via API.Bible) = one entry in
// BIBLE_VERSIONS + one adapter in ADAPTERS if it's a new host. Nothing else.

export const BIBLE_VERSIONS = [
  { id: 'kjv', label: 'KJV', name: 'King James Version', source: 'bibleapi', apiId: 'kjv' },
  { id: 'web', label: 'WEB', name: 'World English Bible', source: 'bibleapi', apiId: 'web' },
  { id: 'bsb', label: 'BSB', name: 'Berean Standard Bible', source: 'helloao', apiId: 'BSB' },
];

export const DEFAULT_VERSION_ID = 'kjv';

export function getVersion(id) {
  return BIBLE_VERSIONS.find(v => v.id === id) || BIBLE_VERSIONS[0];
}

// The reader's book ids ("1+samuel") -> USFM 3-letter ids that
// bible.helloao.org addresses books by ("1SA"). Keyed by the reader's stable
// book id rather than by array position, so reordering the BOOKS list can
// never silently misalign this mapping.
const USFM_BY_BOOK_ID = {
  'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
  'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
  '1+samuel': '1SA', '2+samuel': '2SA', '1+kings': '1KI', '2+kings': '2KI',
  '1+chronicles': '1CH', '2+chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
  'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
  'ecclesiastes': 'ECC', 'song+of+solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
  'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
  'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON',
  'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP',
  'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL', 'matthew': 'MAT',
  'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN', 'acts': 'ACT',
  'romans': 'ROM', '1+corinthians': '1CO', '2+corinthians': '2CO', 'galatians': 'GAL',
  'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL', '1+thessalonians': '1TH',
  '2+thessalonians': '2TH', '1+timothy': '1TI', '2+timothy': '2TI', 'titus': 'TIT',
  'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS', '1+peter': '1PE',
  '2+peter': '2PE', '1+john': '1JN', '2+john': '2JN', '3+john': '3JN',
  'jude': 'JUD', 'revelation': 'REV',
};

export function toUsfm(bookId) {
  return USFM_BY_BOOK_ID[bookId] || null;
}

// --- adapter: bible-api.com (KJV, WEB) --------------------------------------
// GET https://bible-api.com/{book}+{chapter}?translation={kjv|web}
// -> { reference, verses: [{ book_name, chapter, verse, text }], text }
// Already our internal shape; only trims the trailing newline each verse carries.
async function fetchBibleApi({ book, chapter, apiId }) {
  const res = await fetch(`https://bible-api.com/${book.id}+${chapter}?translation=${apiId}`);
  if (!res.ok) throw new Error('bible-api request failed');
  const data = await res.json();
  if (!Array.isArray(data.verses) || data.verses.length === 0) throw new Error('no verses');
  return data.verses.map(v => ({
    book_name: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: (v.text || '').trim(),
  }));
}

// A helloao verse's `content` array is NOT plain strings. Entries are any of:
//   "plain string"                      — ordinary prose
//   { text: "...", poem: 1 }            — a poetry line (Psalms, Proverbs…)
//   { noteId: 50 }                      — a footnote marker, carries NO readable
//                                         text and must be dropped or it would
//                                         render as "[object Object]"
// Flatten whatever mix appears into one clean string per verse.
function helloaoVerseText(content) {
  return (content || [])
    .map(part => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return ''; // footnote markers and any future non-text node type
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- adapter: bible.helloao.org / Free Use Bible API (BSB) -------------------
// GET https://bible.helloao.org/api/{TRANSLATION}/{USFM}/{chapter}.json
// -> { chapter: { number, content: [ … ] } } where content mixes
//    { type:'verse', number, content:[…] } with 'heading' / 'line_break' /
//    'hebrew_subtitle' items. We keep only the verses and normalize them.
async function fetchHelloao({ book, chapter, apiId }) {
  const usfm = toUsfm(book.id);
  if (!usfm) throw new Error(`no USFM id for "${book.id}"`);
  const res = await fetch(`https://bible.helloao.org/api/${apiId}/${usfm}/${chapter}.json`);
  if (!res.ok) throw new Error('helloao request failed');
  const data = await res.json();
  const items = data?.chapter?.content;
  if (!Array.isArray(items)) throw new Error('unexpected chapter shape');
  const verses = items
    .filter(i => i && i.type === 'verse')
    .map(i => ({
      book_name: book.name,          // helloao nests its own name; use ours for
      chapter: Number(chapter),      // consistent display across all versions
      verse: i.number,
      text: helloaoVerseText(i.content),
    }))
    .filter(v => v.text);
  if (verses.length === 0) throw new Error('no verses');
  return verses;
}

const ADAPTERS = {
  bibleapi: fetchBibleApi,
  helloao: fetchHelloao,
};

// Scripture never changes, so a fetched chapter is cached for the session,
// keyed by version+book+chapter. Repeat views (and flipping back and forth
// between translations) are instant and cost the free APIs nothing.
const chapterCache = new Map();

export async function fetchChapter(version, book, chapter) {
  const key = `${version.id}:${book.id}:${chapter}`;
  if (chapterCache.has(key)) return chapterCache.get(key);
  const adapter = ADAPTERS[version.source];
  if (!adapter) throw new Error(`no adapter for source "${version.source}"`);
  const verses = await adapter({ book, chapter, apiId: version.apiId });
  chapterCache.set(key, verses);
  return verses;
}

// bible-api.com doubles as a reference/keyword search endpoint; helloao does
// not offer an equivalent. For a helloao-backed version we search the closest
// public-domain text bible-api does carry and let the caller label it, rather
// than silently returning nothing.
export function searchVersionFor(version) {
  return version.source === 'bibleapi' ? version : getVersion('kjv');
}

export async function searchScripture(version, query) {
  const target = searchVersionFor(version);
  const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${target.apiId}`);
  if (!res.ok) throw new Error('search failed');
  const data = await res.json();
  return (data.verses || []).map(v => ({
    book_name: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: (v.text || '').trim(),
  }));
}
