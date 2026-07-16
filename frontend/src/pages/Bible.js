import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass } from 'lucide-react';
import BookPicker from '../components/BookPicker';
import ChapterVersePicker from '../components/ChapterVersePicker';
import WordSpan from '../components/WordSpan';
import api from '../utils/api';
import { WaterCard, WaterPill } from '../components/water';

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
  const [activeVerse, setActiveVerse] = useState(null);
  const [jumpToVerse, setJumpToVerse] = useState(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterVersePicker, setShowChapterVersePicker] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [wordPopup, setWordPopup] = useState(null);
  const [wordData, setWordData] = useState(null);
  const [wordLoading, setWordLoading] = useState(false);

  const verseCountCache = useRef({});

  const loadChapter = useCallback(async (b, ch) => {
    setLoading(true);
    setError('');
    setVerses([]);
    try {
      const res = await fetch(`${BASE}/${b.id}+${ch}?translation=kjv`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerses(data.verses || []);
      verseCountCache.current[`${b.id}-${ch}`] = data.verses?.length || 0;
    } catch {
      setError('Could not load this chapter. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadChapter(book, chapter); }, [book, chapter, loadChapter]);

  useEffect(() => {
    if (jumpToVerse == null) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`verse-${jumpToVerse}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveVerse(jumpToVerse);
      setJumpToVerse(null);
      setTimeout(() => setActiveVerse(null), 1500);
    }, 350);
    return () => clearTimeout(t);
  }, [jumpToVerse, verses]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 4); }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getVerseCount = useCallback(async (b, ch) => {
    const key = `${b.id}-${ch}`;
    if (verseCountCache.current[key] != null) return verseCountCache.current[key];
    try {
      const res = await fetch(`${BASE}/${b.id}+${ch}?translation=kjv`);
      const data = await res.json();
      const count = data.verses?.length || 0;
      verseCountCache.current[key] = count;
      return count;
    } catch {
      return 0;
    }
  }, []);

  function handleSelectBook(b) {
    setShowBookPicker(false);
    setBook(b);
    setChapter(1);
    setTimeout(() => setShowChapterVersePicker(true), 250);
  }

  function handleSelectChapterOnly(ch) {
    setShowChapterVersePicker(false);
    setBook(book);
    setChapter(ch);
  }

  function handleSelectVerse(ch, v) {
    setShowChapterVersePicker(false);
    setChapter(ch);
    setJumpToVerse(v);
  }

  async function handleWordLongPress(word, verseRef) {
    setWordPopup({ word, verseRef });
    setWordLoading(true);
    setWordData(null);
    try {
      const res = await api.get(`/bible/word-lookup?word=${encodeURIComponent(word)}`);
      setWordData(res.data);
    } catch {
      setWordData({ error: true });
    }
    setWordLoading(false);
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

  function highlightMatch(text, query) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-terracotta-200 text-gray-900 rounded px-0.5">{text.slice(idx, idx + query.trim().length)}</mark>
        {text.slice(idx + query.trim().length)}
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full bg-[#FBF8F3]"
    >
      {/* Hero */}
      <WaterCard tone="blue" style={{ borderRadius: '0 0 24px 24px', padding: '16px 16px 24px' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,52,73,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-3xl leading-tight" style={{ fontFamily: "'Dancing Script', cursive", color: '#163449' }}>Holy Bible</h2>
            <p className="text-sm" style={{ color: '#4A6674' }}>King James Version</p>
          </div>
        </div>

        <div className="inline-flex gap-2">
          {['read', 'search'].map(t => (
            <WaterPill key={t} active={tab === t} onClick={() => setTab(t)}>
              {t === 'read' ? 'Read' : 'Search'}
            </WaterPill>
          ))}
        </div>
      </WaterCard>

      {tab === 'read' && (
        <>
          {/* Sticky nav bar */}
          <div className={`sticky top-0 z-30 bg-white px-4 py-3 flex items-center gap-3 transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
            <button onClick={() => setShowBookPicker(true)} className="text-base font-semibold text-gray-900">
              {book.name}
            </button>
            <div className="flex-1 flex items-center justify-end gap-3">
              <button
                onClick={() => chapter > 1 && setChapter(c => c - 1)}
                disabled={chapter <= 1}
                className="w-9 h-9 flex items-center justify-center text-gray-400 text-xl disabled:opacity-30"
              >‹</button>
              <button onClick={() => setShowChapterVersePicker(true)} className="text-sm font-medium text-gray-700">
                Chapter {chapter}
              </button>
              <button
                onClick={() => chapter < book.chapters && setChapter(c => c + 1)}
                disabled={chapter >= book.chapters}
                className="w-9 h-9 flex items-center justify-center text-gray-400 text-xl disabled:opacity-30"
              >›</button>
            </div>
          </div>

          {/* Feelings entry */}
          <button
            onClick={() => navigate('/feelings')}
            className="w-full flex items-center justify-between px-5 py-2.5 bg-white border-b border-[#EFEFEF]"
          >
            <span className="flex items-center gap-2 text-[13px] text-[#8E8E8E]">
              <Compass size={14} strokeWidth={1.6} color="#C0603F" />
              Find a verse for how you feel
            </span>
            <X size={12} strokeWidth={1.6} color="#C7C7C7" style={{ transform: 'rotate(45deg)' }} />
          </button>

          <div className="px-5 pt-5">
            {error && (
              <div className="bg-terracotta-50 border border-terracotta-200 rounded-2xl p-4 mb-4 text-sm text-terracotta-800">
                {error}
              </div>
            )}

            <div className="mb-5">
              <h3 className="font-serif text-2xl font-bold text-gray-900">{book.name} {chapter}</h3>
              <div className="mt-2 h-[3px] w-10 bg-terracotta-500 rounded-full" />
            </div>

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
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${book.id}-${chapter}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-serif text-lg text-gray-800 leading-relaxed"
                >
                  {verses.map((v, i) => (
                    <span
                      key={i}
                      id={`verse-${v.verse}`}
                      className={`group relative inline transition-colors duration-700 rounded px-1 ${
                        activeVerse === v.verse ? 'bg-terracotta-100' : 'hover:bg-terracotta-50'
                      }`}
                    >
                      <sup className="text-xs text-terracotta-600 font-sans align-top mr-1 select-none">{v.verse}</sup>
                      {v.text.trim().split(/\s+/).map((w, wi) => (
                        <WordSpan
                          key={wi}
                          rawWord={w}
                          verseRef={`${book.name} ${chapter}:${v.verse}`}
                          onLongPress={handleWordLongPress}
                        />
                      ))}
                      <button
                        onClick={() => copyVerse(v)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center w-5 h-5 align-middle rounded bg-gray-100 transition-opacity ml-0.5"
                      >
                        {copied === v.verse ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        )}
                      </button>{' '}
                    </span>
                  ))}
                </motion.p>
              </AnimatePresence>
            )}
          </div>

          {/* Bottom chapter nav */}
          {!loading && verses.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between z-20">
              <button
                disabled={chapter <= 1}
                onClick={() => setChapter(c => c - 1)}
                className="text-sm font-medium text-gray-600 disabled:opacity-30"
              >‹ Previous Chapter</button>
              <button
                disabled={chapter >= book.chapters}
                onClick={() => setChapter(c => c + 1)}
                className="text-sm font-medium text-gray-600 disabled:opacity-30"
              >Next Chapter ›</button>
            </div>
          )}
        </>
      )}

      {tab === 'search' && (
        <div className="px-4 pt-5">
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
              className="w-full bg-white rounded-2xl pl-11 pr-20 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-400"
              autoFocus
            />
            <button
              onClick={() => doSearch(searchQuery)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-terracotta-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
            >
              Search
            </button>
          </div>

          {searching && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-terracotta-400 border-t-transparent rounded-full animate-spin" />
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
              <div className="w-16 h-16 bg-terracotta-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
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
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-terracotta-600 mb-1">
                  {v.book_name} {v.chapter}:{v.verse}
                </p>
                <p className="font-serif text-sm text-gray-800 leading-relaxed">
                  {highlightMatch(v.text.trim(), searchQuery)}
                </p>
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
        </div>
      )}

      {showBookPicker && (
        <BookPicker
          books={BOOKS}
          ntStart={NT_START}
          currentBook={book}
          onSelect={handleSelectBook}
          onClose={() => setShowBookPicker(false)}
        />
      )}

      {showChapterVersePicker && (
        <ChapterVersePicker
          book={book}
          currentChapter={chapter}
          currentVerse={null}
          getVerseCount={getVerseCount}
          onSelectChapterOnly={handleSelectChapterOnly}
          onSelectVerse={handleSelectVerse}
          onClose={() => setShowChapterVersePicker(false)}
        />
      )}

      <AnimatePresence>
        {wordPopup && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setWordPopup(null); setWordData(null); }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
              className="absolute left-4 right-4 bottom-32 max-w-md mx-auto bg-white rounded-3xl p-5 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900 capitalize">{wordPopup.word}</h3>
                <button
                  onClick={() => { setWordPopup(null); setWordData(null); }}
                  className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>

              {wordLoading && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Looking up "{wordPopup.word}"...</span>
                </div>
              )}

              {wordData && !wordData.error && (
                <div className="space-y-4 max-h-[55vh] overflow-y-auto">
                  {wordData.root && (
                    <div className="bg-terracotta-50 rounded-2xl p-3">
                      <p className="text-xs text-terracotta-600 font-semibold uppercase tracking-wider mb-1">
                        {wordData.root.lang} Origin
                      </p>
                      <p className="text-2xl font-bold text-terracotta-700 mb-1">{wordData.root.word}</p>
                      <p className="text-sm text-terracotta-600 italic">{wordData.root.transliteration}</p>
                      <p className="text-sm text-gray-700 mt-1">"{wordData.root.meaning}"</p>
                    </div>
                  )}

                  {wordData.definition && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Definition</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{wordData.definition}</p>
                    </div>
                  )}

                  {wordData.verses?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">In Scripture</p>
                      {wordData.verses.slice(0, 3).map((v, i) => (
                        <div key={i} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
                          <p className="text-xs font-semibold text-terracotta-600 mb-0.5">{v.reference}</p>
                          <p className="text-xs text-gray-600 leading-relaxed font-serif italic">{v.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {wordData?.error && (
                <p className="text-sm text-gray-400 py-2">
                  No biblical data found for "{wordPopup.word}"
                </p>
              )}

              <p className="text-xs text-gray-300 text-center mt-4">Tap outside to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
