import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Search, Plus, Users, Radio } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../utils/haptics';

const ACCENT = '#2C4055';
const LIVE_RED = '#ED4956';

function CellImage({ cell, size = 52 }) {
  if (cell.imageUrl) {
    return <img src={cell.imageUrl} alt="" className="rounded-2xl object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-2xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: 'rgba(44,64,85,0.1)' }}>
      <span className="font-bold" style={{ color: ACCENT, fontSize: size * 0.4, fontFamily: "'Fraunces', serif" }}>
        {cell.name?.charAt(0).toUpperCase() || 'C'}
      </span>
    </div>
  );
}

export default function PrayerCellDirectory() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const showToast = useToast();
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const debounceRef = useRef(null);

  const fetchCells = useCallback(async (q = '') => {
    try {
      const res = await api.get('/prayer-cells', { params: q ? { q } : {} });
      setCells(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchCells(); }, [fetchCells]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCells(query.trim()), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchCells]);

  // Live-now updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchCells(query.trim());
    socket.on('cell:directory_updated', refresh);
    const interval = setInterval(refresh, 15000);
    return () => { socket.off('cell:directory_updated', refresh); clearInterval(interval); };
  }, [socket, query, fetchCells]);

  async function handleJoin(cell, e) {
    e.stopPropagation();
    setJoiningId(cell.id);
    try {
      const res = await api.post(`/prayer-cells/${cell.id}/join`);
      if (res.data.status === 'member') {
        navigate(`/prayer-cells/${cell.id}`);
      } else {
        showToast('Request sent — an admin will review it');
        fetchCells(query.trim());
      }
    } catch (err) {
      showToast(err.friendlyMessage || err.response?.data?.error || 'Could not join', 'error');
    }
    setJoiningId(null);
  }

  return (
    <div className="min-h-full" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold leading-tight" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Prayer Cells</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>Group communities that pray together</p>
        </div>
        <button
          onClick={() => { hapticLight(); navigate('/prayer-cells/create'); }}
          aria-label="Create a cell"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENT }}
        >
          <Plus size={20} color="#fff" strokeWidth={2.4} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={16} strokeWidth={2} color="#9AA6AD" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cells by name or topic…"
            className="w-full bg-white rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4055]/20"
            style={{ height: 44, border: '1px solid #EFEFEF', color: '#1A1A1A' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-1 pb-6">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3 animate-pulse" style={{ border: '1px solid #EFEFEF' }}>
                <div className="w-13 h-13 rounded-2xl bg-gray-100" style={{ width: 52, height: 52 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : cells.length === 0 ? (
          <div className="text-center py-16 px-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(44,64,85,0.08)' }}>
              <Users size={24} strokeWidth={1.8} color={ACCENT} />
            </div>
            <p className="font-semibold" style={{ color: '#0A0A0A' }}>{query ? 'No cells found' : 'No prayer cells yet'}</p>
            <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>{query ? 'Try a different search.' : 'Start the first group community.'}</p>
            {!query && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/prayer-cells/create')}
                className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-semibold"
                style={{ background: ACCENT }}
              >
                <Plus size={16} strokeWidth={2.4} /> Create a Cell
              </motion.button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {cells.map(cell => (
              <motion.button
                key={cell.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => { hapticLight(); navigate(`/prayer-cells/${cell.id}`); }}
                className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 text-left"
                style={{ border: '1px solid #EFEFEF' }}
              >
                <CellImage cell={cell} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate" style={{ color: '#0A0A0A' }}>{cell.name}</p>
                    {cell.liveNow && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(237,73,86,0.12)' }}>
                        <Radio size={9} color={LIVE_RED} strokeWidth={2.5} />
                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: LIVE_RED }}>Live</span>
                      </span>
                    )}
                  </div>
                  {cell.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#8E8E8E' }}>{cell.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Users size={12} color="#9AA6AD" strokeWidth={2} />
                    <span className="text-[11px]" style={{ color: '#9AA6AD' }}>
                      {cell.memberCount} {cell.memberCount === 1 ? 'member' : 'members'}
                      {cell.liveNow ? ` · ${cell.liveCount} praying now` : ''}
                    </span>
                  </div>
                </div>
                {/* Join affordance */}
                {cell.isMember ? (
                  <span className="text-[11px] font-semibold flex-shrink-0 px-2.5" style={{ color: '#9AA6AD' }}>Joined</span>
                ) : (
                  <span
                    onClick={e => handleJoin(cell, e)}
                    className="flex-shrink-0 font-semibold text-xs px-3.5 py-2 rounded-xl"
                    style={{ background: 'rgba(44,64,85,0.1)', color: ACCENT, opacity: joiningId === cell.id ? 0.5 : 1 }}
                  >
                    {joiningId === cell.id ? '…' : cell.joinPolicy === 'request' ? 'Request' : 'Join'}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
