import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

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
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingConvo, setStartingConvo] = useState(null);
  const [convoError, setConvoError] = useState(null);

  useEffect(() => {
    api.get('/messages/conversations')
      .then(res => setConvos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    <div className="bg-gray-50 min-h-full">
      <div className="bg-gray-50 px-4 pt-4 pb-3">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Messages</h2>
        <div className="water-tile-static water-tile-blue relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#4A6674', zIndex: 1, position: 'absolute' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Find a believer to message..."
            className="w-full text-gray-700 placeholder-gray-400 pl-9 pr-4 py-2.5 text-sm focus:outline-none bg-transparent"
            style={{ position: 'relative', zIndex: 1 }}
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Start a conversation</p>
            {searching ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-faith-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No believers found</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => startConvo(u.id)}
                    disabled={!!startingConvo}
                    className="w-full flex items-center gap-3 water-tile-static water-tile-blue rounded-2xl p-3 text-left active:scale-[0.98] transition-transform disabled:opacity-60">
                    <Avatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                      {u.churchName && <p className="text-xs text-faith-500">{u.churchName}</p>}
                    </div>
                    {startingConvo === u.id ? (
                      <div className="w-4 h-4 border-2 border-faith-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <span className="text-xs text-faith-600 font-semibold flex-shrink-0">Message</span>
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
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : convos.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 water-tile-blue rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-700">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Search for a believer above to start a conversation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {convos.map(c => (
                  <button key={c.id} onClick={() => navigate(`/messages/${c.id}`)}
                    className="w-full flex items-center gap-3 water-tile-static water-tile-blue rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform">
                    <Avatar user={c.other} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm leading-tight ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>{c.other?.name}</p>
                        <span className="text-[10px] text-gray-400">{getTimeAgo(c.updatedAt)}</span>
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${c.unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                        {c.lastMessage?.content || 'Start the conversation'}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="w-5 h-5 bg-faith-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
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
  );
}
