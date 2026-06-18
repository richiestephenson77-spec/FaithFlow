import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

function useDebounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Find Believers</h2>

      {/* Search Input */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search by name, church, or location..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 shadow-sm"
          autoFocus
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Searching...</span>
        )}
      </div>

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🙏</div>
          <p className="font-medium">Search for fellow believers</p>
          <p className="text-sm mt-1">Find by name, church, or location</p>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">😔</div>
          <p>No believers found for "{query}"</p>
          <p className="text-sm mt-1">Try a different name or church</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map(user => (
          <div
            key={user.id}
            onClick={() => navigate(`/profile/${user.id}`)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
          >
            <Avatar user={user} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
              {user.churchName && (
                <p className="text-xs text-faith-600 mt-0.5">⛪ {user.churchName}</p>
              )}
              {user.location && (
                <p className="text-xs text-gray-400">📍 {user.location}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{user._count?.followers || 0} believers</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
