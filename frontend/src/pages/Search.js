import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, UserX } from 'lucide-react';
import api from '../utils/api';
import UserRow from '../components/UserRow';
import { fadeUp, staggerItem } from '../utils/animations';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

const FILTERS = [
  { id: '',         label: 'All' },
  { id: 'church',  label: 'Your Church' },
  { id: 'city',    label: 'Your City' },
  { id: 'warriors',label: 'Prayer Warriors' },
  { id: 'pastors', label: 'Pastors' },
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded-full w-32" />
        <div className="h-2.5 bg-gray-100 rounded-full w-20" />
      </div>
      <div className="w-16 h-7 bg-gray-100 rounded-full" />
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [suggested, setSuggested] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const debounceRef = useRef(null);

  // Load suggested on mount and when filter changes
  useEffect(() => {
    setSuggestedLoading(true);
    api.get(`/users/suggested${activeFilter ? `?filter=${activeFilter}` : ''}`)
      .then(res => setSuggested(res.data))
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));
  }, [activeFilter]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearched(false); setSearching(false); return; }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
      setSearched(true);
    } catch {}
    setSearching(false);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      setSearching(true);
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    } else {
      setResults([]);
      setSearched(false);
      setSearching(false);
    }
  }

  const showDiscovery = !query || query.trim().length < 2;

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <motion.div {...fadeUp} className="px-5 pt-5 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Find Believers</h2>
        <p className="text-sm text-gray-400 mt-0.5">Connect with your faith community</p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="px-4 mb-4"
      >
        <div className="relative">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search believers, churches, locations..."
            className="w-full bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0603F]/30 transition-all"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#C0603F transparent #C0603F #C0603F' }} />
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {showDiscovery ? (
          <motion.div
            key="discovery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Category filter chips */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar mb-4">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className="flex-shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: activeFilter === f.id ? '#111827' : '#FFFFFF',
                    color: activeFilter === f.id ? '#FFFFFF' : '#6B7280',
                    boxShadow: activeFilter === f.id ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Suggested believers */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 mb-2">
                {activeFilter ? FILTERS.find(f => f.id === activeFilter)?.label : 'Suggested Believers'}
              </p>
              <div className="bg-white rounded-2xl mx-4 overflow-hidden shadow-sm divide-y divide-gray-100">
                {suggestedLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : suggested.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <p className="text-sm font-medium text-gray-500">No believers found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different filter</p>
                  </div>
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate">
                    {suggested.map(user => (
                      <motion.div key={user.id} variants={staggerItem}>
                        <UserRow user={user} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4"
          >
            {searched && results.length === 0 && !searching && (
              <div className="text-center py-16">
                <UserX size={40} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No believers found for "{query}"</p>
                <p className="text-sm text-gray-400 mt-1">Try searching by church or location</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
                <motion.div
                  key={query}
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  {results.map(user => (
                    <motion.div key={user.id} variants={staggerItem}>
                      <UserRow user={user} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
