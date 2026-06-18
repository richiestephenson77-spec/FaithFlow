import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// bible-api.com — free, no API key, public domain KJV
const BASE = 'https://bible-api.com';

const BOOKS = [
  { id: 'genesis', name: 'Genesis', chapters: 50 },
  { id: 'exodus', name: 'Exodus', chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', chapters: 27 },
  { id: 'numbers', name: 'Numbers', chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', chapters: 34 },
  { id: 'joshua', name: 'Joshua', chapters: 24 },
  { id: 'judges', name: 'Judges', chapters: 21 },
  { id: 'ruth', name: 'Ruth', chapters: 4 },
  { id: '1+samuel', name: '1 Samuel', chapters: 31 },
  { id: '2+samuel', name: '2 Samuel', chapters: 24 },
  { id: '1+kings', name: '1 Kings', chapters: 22 },
  { id: '2+kings', name: '2 Kings', chapters: 25 },
  { id: '1+chronicles', name: '1 Chronicles', chapters: 29 },
  { id: '2+chronicles', name: '2 Chronicles', chapters: 36 },
  { id: 'ezra', name: 'Ezra', chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', chapters: 13 },
  { id: 'esther', name: 'Esther', chapters: 10 },
  { id: 'job', name: 'Job', chapters: 42 },
  { id: 'psalms', name: 'Psalms', chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12 },
  { id: 'song+of+solomon', name: 'Song of Solomon', chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', chapters: 48 },
  { id: 'daniel', name: 'Daniel', chapters: 12 },
  { id: 'hosea', name: 'Hosea', chapters: 14 },
  { id: 'joel', name: 'Joel', chapters: 3 },
  { id: 'amos', name: 'Amos', chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', chapters: 1 },
  { id: 'jonah', name: 'Jonah', chapters: 4 },
  { id: 'micah', name: 'Micah', chapters: 7 },
  { id: 'nahum', name: 'Nahum', chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', chapters: 3 },
  { id: 'haggai', name: 'Haggai', chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', chapters: 14 },
  { id: 'malachi', name: 'Malachi', chapters: 4 },
  { id: 'matthew', name: 'Matthew', chapters: 28 },
  { id: 'mark', name: 'Mark', chapters: 16 },
  { id: 'luke', name: 'Luke', chapters: 24 },
  { id: 'john', name: 'John', chapters: 21 },
  { id: 'acts', name: 'Acts', chapters: 28 },
  { id: 'romans', name: 'Romans', chapters: 16 },
  { id: '1+corinthians', name: '1 Corinthians', chapters: 16 },
  { id: '2+corinthians', name: '2 Corinthians', chapters: 13 },
  { id: 'galatians', name: 'Galatians', chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', chapters: 6 },
  { id: 'philippians', name: 'Philippians', chapters: 4 },
  { id: 'colossians', name: 'Colossians', chapters: 4 },
  { id: '1+thessalonians', name: '1 Thessalonians', chapters: 5 },
  { id: '2+thessalonians', name: '2 Thessalonians', chapters: 3 },
  { id: '1+timothy', name: '1 Timothy', chapters: 6 },
  { id: '2+timothy', name: '2 Timothy', chapters: 4 },
  { id: 'titus', name: 'Titus', chapters: 3 },
  { id: 'philemon', name: 'Philemon', chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', chapters: 13 },
  { id: 'james', name: 'James', chapters: 5 },
  { id: '1+peter', name: '1 Peter', chapters: 5 },
  { id: '2+peter', name: '2 Peter', chapters: 3 },
  { id: '1+john', name: '1 John', chapters: 5 },
  { id: '2+john', name: '2 John', chapters: 1 },
  { id: '3+john', name: '3 John', chapters: 1 },
  { id: 'jude', name: 'Jude', chapters: 1 },
  { id: 'revelation', name: 'Revelation', chapters: 22 },
];

const NT_START = BOOKS.findIndex(b => b.id === 'matthew');

export default function Bible() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('read');
  const [book, setBook] = useState(BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState('book'); // 'book' | 'chapter' | 'verse'
  const [pickerBook, setPickerBook] = useState(null);
  const [pickerChapter, setPickerChapter] = useState(null);
  const [pickerVerseCount, setPickerVerseCount] = useState(0);
  const [loadingVerseCount, setLoadingVerseCount] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadChapter = useCallback(async (b, ch) => {
    setLoading(true);
    setError('');
    setVerses([]);
    try {
      const res = await fetch(`${BASE}/${b.id}+${ch}?translation=kjv`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerses(data.verses || []);
    } catch {
      setError('Could not load this chapter. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadChapter(book, chapter); }, [book, chapter, loadChapter]);

  function openPicker() {
    setPickerBook(book);
    setPickerChapter(null);
    setPickerStep('book');
    setShowBookPicker(true);
  }

  async function pickerSelectBook(b) {
    setPickerBook(b);
    setPickerStep('chapter');
  }

  async function pickerSelectChapter(ch) {
    setPickerChapter(ch);
    setLoadingVerseCount(true);
    try {
      const res = await fetch(`${BASE}/${pickerBook.id}+${ch}?translation=kjv`);
      const data = await res.json();
      setPickerVerseCount(data.verses?.length || 0);
    } catch {
      setPickerVerseCount(0);
    }
    setLoadingVerseCount(false);
    setPickerStep('verse');
  }

  function pickerSelectVerse(v) {
    setBook(pickerBook);
    setChapter(pickerChapter);
    setShowBookPicker(false);
    // After the chapter loads, scroll to that verse
    setTimeout(() => {
      const el = document.getElementById(`verse-${v}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 800);
  }

  function pickerSelectChapterOnly() {
    setBook(pickerBook);
    setChapter(pickerChapter);
    setShowBookPicker(false);
  }

  function copyVerse(v) {
    const text = `"${v.text.trim()}" — ${v.book_name} ${v.chapter}:${v.verse} (KJV)`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(v.verse);
    setTimeout(() => setCopied(null), 1800);
  }

  async function doSearch(q) {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetch(`${BASE}/${encodeURIComponent(q)}?translation=kjv`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResults(data.verses || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
    setSearched(true);
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
            <p className="text-white/60 text-xs">King James Version · Public Domain</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['read', 'search'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
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
                onClick={openPicker}
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 flex items-center justify-between shadow-sm"
              >
                <span>{book.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl px-2 shadow-sm">
                <button
                  onClick={() => chapter > 1 && setChapter(c => c - 1)}
                  className="w-8 h-8 flex items-center justify-center text-faith-600 font-bold text-lg disabled:opacity-30"
                  disabled={chapter <= 1}
                >‹</button>
                <span className="text-sm font-semibold text-gray-800 w-12 text-center">Ch {chapter}</span>
                <button
                  onClick={() => chapter < book.chapters && setChapter(c => c + 1)}
                  className="w-8 h-8 flex items-center justify-center text-faith-600 font-bold text-lg disabled:opacity-30"
                  disabled={chapter >= book.chapters}
                >›</button>
              </div>
            </div>

            <h3 className="text-base font-bold text-gray-700 mb-4">{book.name} {chapter}</h3>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded-full w-full" />
                    <div className="h-3 bg-gray-200 rounded-full w-4/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0">
                {verses.map((v, i) => (
                  <div key={i} id={`verse-${v.verse}`} className="group flex gap-2 py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-[10px] font-bold text-faith-400 mt-0.5 w-5 flex-shrink-0 text-right">{v.verse}</span>
                    <p className="text-sm text-gray-800 leading-relaxed flex-1">{v.text.trim()}</p>
                    <button
                      onClick={() => copyVerse(v)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 active:bg-faith-100 transition-opacity"
                    >
                      {copied === v.verse ? (
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

            {!loading && verses.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  disabled={chapter <= 1}
                  onClick={() => setChapter(c => c - 1)}
                  className="flex-1 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 disabled:opacity-40 shadow-sm"
                >← Previous</button>
                <button
                  disabled={chapter >= book.chapters}
                  onClick={() => setChapter(c => c + 1)}
                  className="flex-1 py-3 prayer-gradient text-white rounded-2xl text-sm font-semibold shadow-sm disabled:opacity-40"
                >Next →</button>
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
                placeholder='e.g. "love" or "john 3:16"'
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

            {!searching && searched && searchResults.length === 0 && (
              <div className="text-center py-12">
                <p className="font-semibold text-gray-600">No verses found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different word or reference</p>
              </div>
            )}

            {!searching && !searched && (
              <div className="text-center py-16">
                <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">Search God's Word</p>
                <p className="text-sm text-gray-400 mt-1">Try "love", "faith", or "John 3:16"</p>
              </div>
            )}

            <div className="space-y-3">
              {searchResults.map((v, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-faith-600 mb-1">
                    {v.book_name} {v.chapter}:{v.verse}
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed">{v.text.trim()}</p>
                  <button
                    onClick={() => {
                      const text = `"${v.text.trim()}" — ${v.book_name} ${v.chapter}:${v.verse} (KJV)`;
                      navigator.clipboard.writeText(text).catch(() => {});
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

      {/* Book / Chapter / Verse Picker Modal */}
      {showBookPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[82vh] flex flex-col">
            {/* Modal header */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
              {pickerStep !== 'book' && (
                <button
                  onClick={() => setPickerStep(pickerStep === 'verse' ? 'chapter' : 'book')}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">
                  {pickerStep === 'book' && 'Select Book'}
                  {pickerStep === 'chapter' && `${pickerBook?.name} — Select Chapter`}
                  {pickerStep === 'verse' && `${pickerBook?.name} ${pickerChapter} — Select Verse`}
                </h3>
                {/* Step indicator */}
                <div className="flex items-center gap-1 mt-1">
                  {['book','chapter','verse'].map((s, i) => (
                    <div key={s} className={`h-1 rounded-full transition-all ${
                      pickerStep === s ? 'w-6 bg-faith-500' :
                      (['book','chapter','verse'].indexOf(pickerStep) > i) ? 'w-3 bg-faith-300' : 'w-3 bg-gray-200'
                    }`} />
                  ))}
                </div>
              </div>
              <button onClick={() => setShowBookPicker(false)} className="text-gray-400 text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3">
              {/* Step 1 — Book */}
              {pickerStep === 'book' && (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Old Testament</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {BOOKS.slice(0, NT_START).map(b => (
                      <button key={b.id} onClick={() => pickerSelectBook(b)}
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
                      <button key={b.id} onClick={() => pickerSelectBook(b)}
                        className={`text-sm py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                          b.id === book.id ? 'bg-faith-100 text-faith-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 2 — Chapter */}
              {pickerStep === 'chapter' && pickerBook && (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: pickerBook.chapters }, (_, i) => i + 1).map(ch => (
                    <button key={ch} onClick={() => pickerSelectChapter(ch)}
                      className={`aspect-square rounded-xl text-sm font-bold transition-colors flex items-center justify-center ${
                        ch === chapter && pickerBook.id === book.id
                          ? 'prayer-gradient text-white shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-faith-50 hover:text-faith-700'
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3 — Verse */}
              {pickerStep === 'verse' && (
                <>
                  {loadingVerseCount ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-faith-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={pickerSelectChapterOnly}
                        className="w-full mb-3 py-3 bg-faith-50 border border-faith-200 rounded-2xl text-sm font-bold text-faith-700"
                      >
                        Read from beginning of chapter
                      </button>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Or jump to verse</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: pickerVerseCount }, (_, i) => i + 1).map(v => (
                          <button key={v} onClick={() => pickerSelectVerse(v)}
                            className="aspect-square rounded-xl text-sm font-bold bg-gray-50 text-gray-700 hover:bg-faith-50 hover:text-faith-700 transition-colors flex items-center justify-center">
                            {v}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
