import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChapterVersePicker({ book, currentChapter, currentVerse, getVerseCount, onSelectChapterOnly, onSelectVerse, onClose }) {
  const [selectedChapter, setSelectedChapter] = useState(currentChapter);
  const [verseCount, setVerseCount] = useState(0);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingVerses(true);
    getVerseCount(book, selectedChapter).then(count => {
      if (active) {
        setVerseCount(count);
        setLoadingVerses(false);
      }
    });
    return () => { active = false; };
  }, [book, selectedChapter, getVerseCount]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[82vh] flex flex-col"
        >
          <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
            <h3 className="font-bold text-gray-900 text-base flex-1">{book.name}</h3>
            <button onClick={onClose} className="text-gray-400 text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Chapter</p>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => (
                <button key={ch} onClick={() => setSelectedChapter(ch)}
                  className={`aspect-square rounded-xl text-sm font-bold transition-colors flex items-center justify-center ${
                    ch === selectedChapter
                      ? 'bg-terracotta-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-terracotta-100'
                  }`}>
                  {ch}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Verse — Chapter {selectedChapter}
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedChapter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => onSelectChapterOnly(selectedChapter)}
                  className="w-full mb-3 py-3 bg-terracotta-50 border border-terracotta-200 rounded-2xl text-sm font-bold text-terracotta-700"
                >
                  Read from beginning
                </button>

                {loadingVerses ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-terracotta-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2 pb-2">
                    {Array.from({ length: verseCount }, (_, i) => i + 1).map(v => {
                      const isCurrent = selectedChapter === currentChapter && v === currentVerse;
                      return (
                        <button key={v} onClick={() => onSelectVerse(selectedChapter, v)}
                          className={`aspect-square rounded-xl text-sm font-bold transition-colors flex items-center justify-center ${
                            isCurrent
                              ? 'bg-white text-terracotta-600 ring-2 ring-terracotta-500'
                              : 'bg-gray-50 text-gray-700 hover:bg-terracotta-100'
                          }`}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
