import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
      setSearched(true);
    } catch {}
    setLoading(false);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      setLoading(true);
      setTimeout(() => doSearch(val), 400);
    } else {
      setResults([]);
      setSearched(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Find Believers</h2>
        <p className="text-white/70 text-sm">Connect with your faith community</p>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-4">
        {/* Search Input */}
        <div className="relative mb-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Name, church, or location..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 shadow-sm"
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-faith-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Empty state */}
        {!searched && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-700">Search for fellow believers</p>
            <p className="text-sm text-gray-400 mt-1">Find by name, church, or location</p>
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="font-semibold text-gray-600">No believers found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different name or church</p>
          </div>
        )}

        <div className="space-y-2">
          {results.map(user => (
            <div
              key={user.id}
              onClick={() => navigate(`/profile/${user.id}`)}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <Avatar user={user} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{user.name}</p>
                {user.churchName && (
                  <p className="text-xs text-faith-600 mt-0.5 font-medium">{user.churchName}</p>
                )}
                {user.location && (
                  <p className="text-xs text-gray-400 mt-0.5">{user.location}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{user._count?.followers || 0} believers</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
