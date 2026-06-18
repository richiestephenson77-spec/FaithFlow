import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_KEY = process.env.REACT_APP_BIBLE_API_KEY || '';
const KJV_BIBLE_ID = 'de4e12af7f28f599-02'; // KJV on API.Bible

const BOOKS = [
  { id: 'GEN', name: 'Genesis' }, { id: 'EXO', name: 'Exodus' }, { id: 'LEV', name: 'Leviticus' },
  { id: 'NUM', name: 'Numbers' }, { id: 'DEU', name: 'Deuteronomy' }, { id: 'JOS', name: 'Joshua' },
  { id: 'JDG', name: 'Judges' }, { id: 'RUT', name: 'Ruth' }, { id: '1SA', name: '1 Samuel' },
  { id: '2SA', name: '2 Samuel' }, { id: '1KI', name: '1 Kings' }, { id: '2KI', name: '2 Kings' },
  { id: '1CH', name: '1 Chronicles' }, { id: '2CH', name: '2 Chronicles' }, { id: 'EZR', name: 'Ezra' },
  { id: 'NEH', name: 'Nehemiah' }, { id: 'EST', name: 'Esther' }, { id: 'JOB', name: 'Job' },
  { id: 'PSA', name: 'Psalms' }, { id: 'PRO', name: 'Proverbs' }, { id: 'ECC', name: 'Ecclesiastes' },
  { id: 'SNG', name: 'Song of Solomon' }, { id: 'ISA', name: 'Isaiah' }, { id: 'JER', name: 'Jeremiah' },
  { id: 'LAM', name: 'Lamentations' }, { id: 'EZK', name: 'Ezekiel' }, { id: 'DAN', name: 'Daniel' },
  { id: 'HOS', name: 'Hosea' }, { id: 'JOL', name: 'Joel' }, { id: 'AMO', name: 'Amos' },
  { id: 'OBA', name: 'Obadiah' }, { id: 'JON', name: 'Jonah' }, { id: 'MIC', name: 'Micah' },
  { id: 'NAM', name: 'Nahum' }, { id: 'HAB', name: 'Habakkuk' }, { id: 'ZEP', name: 'Zephaniah' },
  { id: 'HAG', name: 'Haggai' }, { id: 'ZEC', name: 'Zechariah' }, { id: 'MAL', name: 'Malachi' },
  { id: 'MAT', name: 'Matthew' }, { id: 'MRK', name: 'Mark' }, { id: 'LUK', name: 'Luke' },
  { id: 'JHN', name: 'John' }, { id: 'ACT', name: 'Acts' }, { id: 'ROM', name: 'Romans' },
  { id: '1CO', name: '1 Corinthians' }, { id: '2CO', name: '2 Corinthians' }, { id: 'GAL', name: 'Galatians' },
  { id: 'EPH', name: 'Ephesians' }, { id: 'PHP', name: 'Philippians' }, { id: 'COL', name: 'Colossians' },
  { id: '1TH', name: '1 Thessalonians' }, { id: '2TH', name: '2 Thessalonians' }, { id: '1TI', name: '1 Timothy' },
  { id: '2TI', name: '2 Timothy' }, { id: 'TIT', name: 'Titus' }, { id: 'PHM', name: 'Philemon' },
  { id: 'HEB', name: 'Hebrews' }, { id: 'JAS', name: 'James' }, { id: '1PE', name: '1 Peter' },
  { id: '2PE', name: '2 Peter' }, { id: '1JN', name: '1 John' }, { id: '2JN', name: '2 John' },
  { id: '3JN', name: '3 John' }, { id: 'JUD', name: 'Jude' }, { id: 'REV', name: 'Revelation' },
];

const NT_START = BOOKS.findIndex(b => b.id === 'MAT');

async function apiBible(path) {
  const res = await fetch(`https://api.scripture.api.bible/v1/bibles/${KJV_BIBLE_ID}${path}`, {
    headers: { 'api-key': API_KEY },
  });
  if (!res.ok) throw new Error('API error');
  const json = await res.json();
  return json.data;
}

function parseVerses(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('.note, .nd, .wj').forEach(el => {
    if (el.tagName === 'SPAN' && el.classList.contains('nd')) return;
    el.remove();
  });
  const verseEls = div.querySelectorAll('[data-number]');
  const verses = [];
  verseEls.forEach(el => {
    const num = el.getAttribute('data-number');
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (text) verses.push({ num, text });
  });
  if (verses.length === 0) {
    const raw = div.textContent.replace(/\s+/g, ' ').trim();
    if (raw) verses.push({ num: '', text: raw });
  }
  return verses;
}

export default function Bible() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('read'); // read | search
  const [book, setBook] = useState(BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [chapterCount, setChapterCount] = useState(50);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadChapter = useCallback(async (b, ch) => {
    if (!API_KEY) {
      setError('Bible API key not set. Add REACT_APP_BIBLE_API_KEY to your Vercel environment variables.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiBible(`/chapters/${b.id}.${ch}?content-type=html&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`);
      const parsed = parseVerses(data.content);
      setVerses(parsed);
    } catch (e) {
      setError('Could not load chapter. Check your API key.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChapter(book, chapter);
  }, [book, chapter, loadChapter]);

  async function fetchChapterCount(b) {
    if (!API_KEY) return;
    try {
      const data = await apiBible(`/books/${b.id}/chapters`);
      setChapterCount(data.length - 1); // -1 to exclude intro chapter
    } catch {}
  }

  function selectBook(b) {
    setBook(b);
    setChapter(1);
    setShowBookPicker(false);
    fetchChapterCount(b);
  }

  function copyVerse(v) {
    const text = `"${v.text}" — ${book.name} ${chapter}:${v.num} (KJV)`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(v.num);
    setTimeout(() => setCopied(null), 1800);
  }

  async function doSearch(q) {
    if (!q.trim() || !API_KEY) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.scripture.api.bible/v1/bibles/${KJV_BIBLE_ID}/search?query=${encodeURIComponent(q)}&limit=20`,
        { headers: { 'api-key': API_KEY } }
      );
      const json = await res.json();
      setSearchResults(json.data?.verses || []);
    } catch {}
    setSearching(false);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="prayer-gradient px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Holy Bible</h2>
            <p className="text-white/60 text-xs">King James Version</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2">
          {['read', 'search'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                tab === t ? 'bg-white text-faith-700' : 'bg-white/20 text-white'
              }`}>
              {t === 'read' ? '📖 Read' : '🔍 Search'}
            </button>
          ))}
        </div>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        {tab === 'read' && (
          <>
            {/* Book + Chapter selector */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setShowBookPicker(true)}
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 flex items-center justify-between shadow-sm"
              >
                <span>{book.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl px-2 shadow-sm">
                <button onClick={() => chapter > 1 && setChapter(c => c - 1)} className="w-8 h-8 flex items-center justify-center text-faith-600 font-bold text-lg">‹</button>
                <span className="text-sm font-semibold text-gray-800 w-12 text-center">Ch {chapter}</span>
                <button onClick={() => chapter < chapterCount && setChapter(c => c + 1)} className="w-8 h-8 flex items-center justify-center text-faith-600 font-bold text-lg">›</button>
              </div>
            </div>

            {/* Chapter heading */}
            <h3 className="text-base font-bold text-gray-700 mb-4">{book.name} — Chapter {chapter}</h3>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3 bg-gray-200 rounded-full w-full mb-1" />
                    <div className="h-3 bg-gray-200 rounded-full w-4/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {verses.map((v, i) => (
                  <div key={i} className="group flex gap-2 py-2 border-b border-gray-100 last:border-0">
                    {v.num && (
                      <span className="text-[10px] font-bold text-faith-400 mt-1 w-5 flex-shrink-0 text-right leading-tight">{v.num}</span>
                    )}
                    <p className="text-sm text-gray-800 leading-relaxed flex-1">{v.text}</p>
                    <button
                      onClick={() => copyVerse(v)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 active:bg-faith-100 transition-opacity"
                    >
                      {copied === v.num ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Next/Prev nav */}
            {!loading && verses.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  disabled={chapter <= 1}
                  onClick={() => setChapter(c => c - 1)}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 disabled:opacity-40 shadow-sm"
                >
                  ← Previous
                </button>
                <button
                  disabled={chapter >= chapterCount}
                  onClick={() => setChapter(c => c + 1)}
                  className="flex-1 py-3 prayer-gradient text-white rounded-2xl text-sm font-semibold shadow-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'search' && (
          <>
            <div className="relative mb-5">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(searchQuery)}
                placeholder="Search scripture..."
                className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-20 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 shadow-sm"
                autoFocus
              />
              <button
                onClick={() => doSearch(searchQuery)}
                className="absolute right-3 top-1/2 -translate-y-1/2 prayer-gradient text-white text-xs font-bold px-3 py-1.5 rounded-xl"
              >
                Search
              </button>
            </div>

            {searching && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-faith-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery.length > 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="font-semibold text-gray-600">No results found</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            )}

            {!searching && searchResults.length === 0 && !searchQuery && (
              <div className="text-center py-16">
                <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">Search God's Word</p>
                <p className="text-sm text-gray-400 mt-1">Type a word or phrase and press Search</p>
              </div>
            )}

            <div className="space-y-3">
              {searchResults.map((v, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-faith-600 mb-1">{v.reference}</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{v.text}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`"${v.text}" — ${v.reference} (KJV)`).catch(() => {});
                    }}
                    className="mt-2 text-xs text-gray-400 flex items-center gap-1"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy verse
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Book Picker Modal */}
      {showBookPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Select Book</h3>
              <button onClick={() => setShowBookPicker(false)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Old Testament</p>
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {BOOKS.slice(0, NT_START).map(b => (
                  <button key={b.id} onClick={() => selectBook(b)}
                    className={`text-sm py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                      b.id === book.id ? 'bg-faith-100 text-faith-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    {b.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Testament</p>
              <div className="grid grid-cols-2 gap-1.5">
                {BOOKS.slice(NT_START).map(b => (
                  <button key={b.id} onClick={() => selectBook(b)}
                    className={`text-sm py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                      b.id === book.id ? 'bg-faith-100 text-faith-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
