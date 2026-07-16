import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookPicker({ books, ntStart, currentBook, onSelect, onClose }) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? books.filter(b => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    : null;

  const ot = filtered ? filtered.filter((_, i) => books.indexOf(filtered[i]) < ntStart) : books.slice(0, ntStart);
  const nt = filtered ? filtered.filter((_, i) => books.indexOf(filtered[i]) >= ntStart) : books.slice(ntStart);

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
            <h3 className="font-bold text-gray-900 text-base flex-1">Select Book</h3>
            <button onClick={onClose} className="text-gray-400 text-xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
          </div>

          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search books..."
                className="w-full bg-gray-50 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-3">
            {ot.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Old Testament</p>
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {ot.map(b => (
                    <button key={b.id} onClick={() => onSelect(b)}
                      className={`text-sm py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                        b.id === currentBook.id ? 'bg-terracotta-100 text-terracotta-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {nt.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">New Testament</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {nt.map(b => (
                    <button key={b.id} onClick={() => onSelect(b)}
                      className={`text-sm py-2 px-3 rounded-xl text-left font-medium transition-colors ${
                        b.id === currentBook.id ? 'bg-terracotta-100 text-terracotta-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {filtered && ot.length === 0 && nt.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">No books found</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
