import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search } from 'lucide-react';
import api from '../utils/api';

const POPULAR_WORDS = ['Grace', 'Faith', 'Love', 'Peace', 'Hope', 'Mercy', 'Prayer', 'Salvation', 'Wisdom', 'Covenant'];

export default function BibleDictionary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchWord(query.trim());
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [query]);

  async function searchWord(word) {
    setLoading(true);
    try {
      const res = await api.get(`/bible/word-lookup?word=${encodeURIComponent(word)}`);
      setResults(res.data);
    } catch {
      setResults({ error: true, word });
    }
    setLoading(false);
  }

  function searchChip(word) {
    setQuery(word);
  }

  return (
    <div className="min-h-full bg-[#FBF8F3]">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft size={22} color="#111827" strokeWidth={2} />
          </button>
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900 leading-tight">Bible Dictionary</h2>
            <p className="text-sm text-gray-400">Search any word, name or topic</p>
          </div>
        </div>

        <div className="relative">
          <Search size={16} color="#2C4055" strokeWidth={2.2} className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search... (e.g. grace, Moses, covenant)"
            className="w-full bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-400"
            autoFocus
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </motion.div>
        ) : !results ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            <p className="text-sm text-gray-400 mb-3">Tap any word to explore its biblical meaning</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_WORDS.map(w => (
                <button
                  key={w}
                  onClick={() => searchChip(w)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-terracotta-100 text-terracotta-700"
                >
                  {w}
                </button>
              ))}
            </div>
          </motion.div>
        ) : results.error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 px-8">
            <p className="font-semibold text-gray-700">No biblical data found for "{results.word || query}"</p>
            <p className="text-sm text-gray-400 mt-1">Try another word or check the spelling</p>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-10">
            {/* Word header */}
            <div className="px-4 mb-3">
              <h1 className="font-serif text-3xl text-gray-900 capitalize">{results.word}</h1>
              {results.root && (
                <span className="inline-block mt-2 text-xs font-medium bg-terracotta-100 text-terracotta-700 rounded-full px-3 py-1">
                  {results.root.lang} · {results.root.word} · {results.root.transliteration}
                </span>
              )}
            </div>

            {/* Biblical meaning */}
            {(results.root || results.definition) && (
              <div className="bg-white rounded-2xl p-5 mx-4 mb-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Biblical Meaning</p>
                {results.root && (
                  <p className="font-serif italic text-lg text-terracotta-700 mb-2">"{results.root.meaning}"</p>
                )}
                {results.definition && (
                  <p className="text-sm text-gray-700 leading-relaxed">{results.definition}</p>
                )}
              </div>
            )}

            {/* In Scripture */}
            {results.verses?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 mx-4 mb-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Found in Scripture</p>
                {results.verses.slice(0, 5).map((v, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0"
                  >
                    <p className="text-terracotta-600 font-semibold text-sm mb-1">{v.reference}</p>
                    <p className="font-serif italic text-gray-700 text-sm leading-relaxed">{v.text}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Related words */}
            {results.related?.length > 0 && (
              <div className="px-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Related Words</p>
                <div className="flex flex-wrap gap-2">
                  {results.related.map(w => (
                    <button
                      key={w}
                      onClick={() => searchChip(w)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium bg-terracotta-100 text-terracotta-700 capitalize"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
