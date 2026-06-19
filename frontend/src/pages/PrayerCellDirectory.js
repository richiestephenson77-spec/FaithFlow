import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Radio } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useSocket } from '../contexts/SocketContext';

const BG = '#0A0F1E';

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function PrayerCellDirectory() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [activeCells, setActiveCells] = useState([]);
  const [recentCells, setRecentCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  const fetchCells = useCallback(async () => {
    try {
      const res = await api.get('/prayer-cells');
      const data = res.data;
      // Handle both old array shape and new object shape
      if (Array.isArray(data)) {
        setActiveCells(data);
        setRecentCells([]);
      } else {
        setActiveCells(data.activeCells || []);
        setRecentCells(data.recentCells || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCells();
    const interval = setInterval(fetchCells, 10000);
    return () => clearInterval(interval);
  }, [fetchCells]);

  useEffect(() => {
    if (!socket) return;
    socket.on('cell:directory_updated', fetchCells);
    return () => socket.off('cell:directory_updated', fetchCells);
  }, [socket, fetchCells]);

  async function handleStartHosting() {
    setStarting(true);
    try {
      const res = await api.post('/prayer-cells/start');
      navigate(`/prayer-cells/${res.data.id}/host`);
    } catch {}
    setStarting(false);
  }

  async function handleJoin(cell) {
    setJoiningId(cell.id);
    try {
      await api.post(`/prayer-cells/${cell.id}/join`);
      navigate(`/prayer-cells/${cell.id}/guest`, {
        state: { hostName: cell.host.name, hostPhoto: cell.host.profilePhoto, cellId: cell.id, host: cell.host },
      });
    } catch {}
    setJoiningId(null);
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: BG }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-5 pt-5 pb-4 flex items-center gap-3"
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color="white" strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">Prayer Cells</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,1)' }}>Live prayer sessions</p>
        </div>
      </motion.div>

      {/* Start hosting card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mx-4 mt-1"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStartHosting}
          disabled={starting}
          className="w-full flex items-center justify-between p-5 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
        >
          <div className="flex items-center gap-3">
            <Mic size={24} color="white" strokeWidth={1.8} />
            <div className="text-left">
              <p className="text-white font-bold text-base leading-tight">
                {starting ? 'Starting…' : 'Start a Prayer Cell'}
              </p>
              <p className="text-white/70 text-xs mt-0.5">Open your room · pray for others</p>
            </div>
          </div>
          <ChevronRight size={20} color="white" />
        </motion.button>
      </motion.div>

      {/* Live cells */}
      <div className="mt-6 px-4">
        <p className="text-white font-bold text-sm mb-3">🔴 Live Now</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : activeCells.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Radio size={48} color="rgba(255,255,255,0.15)" strokeWidth={1.5} />
            <p className="text-white/60 font-semibold mt-4">No active prayer cells</p>
            <p className="text-white/30 text-sm mt-1">Be the first to open one 🙏</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartHosting}
              disabled={starting}
              className="mt-6 px-6 py-3 rounded-full text-white font-semibold text-sm"
              style={{ background: '#f59e0b' }}
            >
              Start Hosting
            </motion.button>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              className="space-y-3"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
            >
              {activeCells.map(cell => (
                <CellCard
                  key={cell.id}
                  cell={cell}
                  onJoin={() => handleJoin(cell)}
                  joining={joiningId === cell.id}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Recent sessions */}
      {!loading && recentCells.length > 0 && (
        <div className="mt-8 px-4">
          <p className="font-bold text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Recent Sessions
          </p>
          <div className="space-y-3">
            {recentCells.map(cell => (
              <RecentCellCard key={cell.id} cell={cell} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CellCard({ cell, onJoin, joining }) {
  const guestCount = cell.sessions?.length ?? 0;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
      className="rounded-2xl p-4"
      style={{ background: '#1A1F35', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: 48, height: 48,
              boxShadow: cell.host.isVerifiedPastor ? '0 0 0 2px #f59e0b' : 'none',
            }}
          >
            <Avatar user={cell.host} size="md" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{cell.host.name}</p>
            {cell.host.isVerifiedPastor && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                ✝️ Pastor
              </span>
            )}
            {cell.host.prayerWarriorBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}>
                🏆 Warrior
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>
              {cell.sessionCount} prayed this session
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              · {cell.host.totalPeoplesPrayedFor} total
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Live · Started {timeAgo(cell.startedAt)}
              {guestCount > 0 && ` · ${guestCount} in room`}
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onJoin}
          disabled={joining}
          className="flex-shrink-0 text-white text-sm font-medium px-4 py-2 rounded-full"
          style={{ background: '#f59e0b' }}
        >
          {joining ? '…' : 'Join'}
        </motion.button>
      </div>
    </motion.div>
  );
}

function RecentCellCard({ cell }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#1A1F35', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.65 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: 48, height: 48 }}
        >
          <Avatar user={cell.host} size="md" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{cell.host.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#fbbf24' }}>
            Prayed for {cell.sessionCount} {cell.sessionCount === 1 ? 'person' : 'people'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Ended {timeAgo(cell.endedAt)}
            </p>
          </div>
        </div>

        <span className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
          Ended
        </span>
      </div>
    </div>
  );
}
