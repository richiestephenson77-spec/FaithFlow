import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, UserX, HandHeart, Church as ChurchIcon, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import UserRow from '../components/UserRow';
import { fadeUp, staggerItem } from '../utils/animations';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const ACCENT = '#2C4055';

// Discovery (empty-query) filters — believers only
const FILTERS = [
  { id: '',         label: 'All' },
  { id: 'church',  label: 'Your Church' },
  { id: 'city',    label: 'Your City' },
  { id: 'warriors',label: 'Prayer Warriors' },
  { id: 'pastors', label: 'Pastors' },
];

// Result-type tabs
const SEARCH_TABS = [
  { id: 'all',         label: 'All' },
  { id: 'people',      label: 'People' },
  { id: 'prayers',     label: 'Prayers' },
  { id: 'churches',    label: 'Churches' },
  { id: 'confessions', label: 'Confessions' },
];

const EMPTY = { people: [], prayers: [], churches: [], confessions: [] };

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

function PrayerResult({ item, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-start gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(44,64,85,0.08)' }}>
        <HandHeart size={17} color={ACCENT} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: '#163449' }}>{item.title}</p>
        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#8E8E8E' }}>{item.body}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#B0AEA8' }}>
          {item.user?.name || 'Someone'} · {item.prayerCount} prayed{item.isAnswered ? ' · Answered' : ''}
        </p>
      </div>
    </button>
  );
}

function ChurchResult({ item, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-3 px-4 py-3">
      {item.logo
        ? <img src={item.logo} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        : <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(44,64,85,0.08)' }}><ChurchIcon size={17} color={ACCENT} strokeWidth={1.8} /></div>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: '#163449' }}>{item.name}</p>
        {item.location && <p className="text-xs mt-0.5 truncate" style={{ color: '#8E8E8E' }}>{item.location}</p>}
      </div>
      <span className="text-[11px] flex-shrink-0" style={{ color: '#B0AEA8' }}>{item.followerCount} following</span>
    </button>
  );
}

function ConfessionResult({ item, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-start gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f5f0fc' }}>
        <MessageSquare size={16} color="#8A5CD0" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm line-clamp-2" style={{ color: '#3D4A57' }}>{item.content}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#B0AEA8' }}>
          Anonymous · {item.category} · {item.heartCount} ❤ · {item.commentCount} 💬
        </p>
      </div>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-5 mb-2">{title}</p>
      <div className="bg-white rounded-2xl mx-4 overflow-hidden shadow-sm divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(EMPTY);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState('all');

  const [suggested, setSuggested] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    setSuggestedLoading(true);
    api.get(`/users/suggested${activeFilter ? `?filter=${activeFilter}` : ''}`)
      .then(res => setSuggested(res.data))
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));
  }, [activeFilter]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setGrouped(EMPTY); setSearched(false); setSearching(false); return; }
    try {
      const res = await api.get('/search', { params: { q, type: 'all' } });
      setGrouped({ ...EMPTY, ...res.data });
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
      setGrouped(EMPTY);
      setSearched(false);
      setSearching(false);
    }
  }

  const showDiscovery = !query || query.trim().length < 2;

  const show = t => tab === 'all' || tab === t;
  const totalResults = grouped.people.length + grouped.prayers.length + grouped.churches.length + grouped.confessions.length;
  const tabCount = tab === 'all' ? totalResults : grouped[tab].length;

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <motion.div {...fadeUp} className="px-5 pt-5 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Search</h2>
        <p className="text-sm text-gray-400 mt-0.5">People, prayers, churches & confessions</p>
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
            placeholder="Search believers, prayers, churches..."
            className="w-full bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4055]/30 transition-all"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2C4055 transparent #2C4055 #2C4055' }} />
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {showDiscovery ? (
          <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
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
                      <motion.div key={user.id} variants={staggerItem}><UserRow user={user} /></motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Result-type tabs */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar mb-4">
              {SEARCH_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: tab === t.id ? ACCENT : '#FFFFFF',
                    color: tab === t.id ? '#FFFFFF' : '#6B7280',
                    boxShadow: tab === t.id ? 'none' : '0 1px 3px rgba(0,0,0,0.07)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {searched && !searching && tabCount === 0 ? (
              <div className="text-center py-16 px-8">
                <UserX size={38} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No {tab === 'all' ? 'results' : tab} for “{query}”</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search or tab</p>
              </div>
            ) : (
              <>
                {show('people') && grouped.people.length > 0 && (
                  <Section title="People">
                    {grouped.people.map(u => <UserRow key={u.id} user={u} />)}
                  </Section>
                )}
                {show('prayers') && grouped.prayers.length > 0 && (
                  <Section title="Prayers">
                    {grouped.prayers.map(p => <PrayerResult key={p.id} item={p} onClick={() => navigate(`/prayer/${p.id}`)} />)}
                  </Section>
                )}
                {show('churches') && grouped.churches.length > 0 && (
                  <Section title="Churches">
                    {grouped.churches.map(c => <ChurchResult key={c.id} item={c} onClick={() => navigate(`/churches/${c.id}`)} />)}
                  </Section>
                )}
                {show('confessions') && grouped.confessions.length > 0 && (
                  <Section title="Confessions">
                    {grouped.confessions.map(c => <ConfessionResult key={c.id} item={c} onClick={() => navigate(`/confessions/${c.id}`)} />)}
                  </Section>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
