import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquarePen, Search, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import PullToRefresh from '../components/PullToRefresh';
import { hapticLight } from '../utils/haptics';

function getTimeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchInputRef = useRef(null);
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingConvo, setStartingConvo] = useState(null);
  const [convoError, setConvoError] = useState(null);

  const loadConvos = useCallback(() => {
    return api.get('/messages/conversations')
      .then(res => setConvos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  async function handleSearch(val) {
    setSearch(val);
    if (val.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(val)}`);
      setSearchResults(res.data);
    } catch {}
    setSearching(false);
  }

  async function startConvo(userId) {
    if (startingConvo) return;
    setStartingConvo(userId);
    setConvoError(null);
    try {
      const res = await api.post('/messages/conversations', { userId });
      navigate(`/messages/${res.data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Something went wrong';
      setConvoError(msg);
      setStartingConvo(null);
    }
  }

  return (
    <PullToRefresh onRefresh={loadConvos}>
    <div className="bg-gray-50 min-h-full">
      <div className="bg-gray-50 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: '#163449', fontFamily: "'Fraunces', serif" }}>Messages</h1>
          <button
            onClick={() => searchInputRef.current?.focus()}
            aria-label="New chat"
            className="w-11 h-11 -mr-2 flex items-center justify-center"
          >
            <SquarePen size={22} strokeWidth={1.8} color="#163449" />
          </button>
        </div>
        <div className="relative">
          <Search size={16} strokeWidth={2} color="#9AA6AD" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Find a believer to message…"
            className="w-full bg-white rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4055]/20"
            style={{ height: 44, border: '1px solid #EFEFEF', color: '#1A1A1A' }}
          />
        </div>
      </div>

      <div className="bg-gray-50 pt-2">
        {/* Search results */}
        {search.length >= 2 && (
          <div className="px-4 mb-4">
            {convoError && (
              <div className="mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600 font-medium">
                Error: {convoError}
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8E8E8E' }}>Start a conversation</p>
            {searching ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2C4055', borderTopColor: 'transparent' }} /></div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#8E8E8E' }}>No believers found</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => startConvo(u.id)}
                    disabled={!!startingConvo}
                    className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 text-left active:scale-[0.98] transition-transform disabled:opacity-60"
                    style={{ border: '1px solid #EFEFEF' }}>
                    <Avatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#163449' }}>{u.name}</p>
                      {u.churchName && <p className="text-xs" style={{ color: '#8E8E8E' }}>{u.churchName}</p>}
                    </div>
                    {startingConvo === u.id ? (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: '#2C4055', borderTopColor: 'transparent' }} />
                    ) : (
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#2C4055' }}>Message</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversations */}
        {!search && (
          <div className="px-4">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 animate-pulse" style={{ border: '1px solid #EFEFEF' }}>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                      <div className="h-2.5 bg-gray-100 rounded-full w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : convos.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-8">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(44,64,85,0.08)' }}>
                  <MessageCircle size={24} strokeWidth={1.8} color="#2C4055" />
                </div>
                <p className="font-semibold" style={{ color: '#163449' }}>No conversations yet</p>
                <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>Find a believer to pray and talk with.</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => searchInputRef.current?.focus()}
                  className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#2C4055' }}
                >
                  Find someone to message
                </motion.button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {convos.map(c => (
                  <button key={c.id} onClick={() => { hapticLight(); navigate(`/messages/${c.id}`); }}
                    className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                    style={{ border: '1px solid #EFEFEF' }}>
                    <Avatar user={c.other} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm leading-tight truncate" style={{ color: '#163449', fontWeight: c.unread > 0 ? 700 : 600 }}>{c.other?.name}</p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: c.unread > 0 ? '#2C4055' : '#9AA6AD', fontWeight: c.unread > 0 ? 600 : 400 }}>{getTimeAgo(c.updatedAt)}</span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: c.unread > 0 ? '#3D4A57' : '#9AA6AD', fontWeight: c.unread > 0 ? 500 : 400 }}>
                        {c.lastMessage?.content || 'Start the conversation'}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: '#2C4055' }}>
                        {c.unread > 9 ? '9+' : c.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
