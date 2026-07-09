import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Award, BadgeCheck } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useSocket } from '../contexts/SocketContext';

const GOLD = '#C9932F';
const LIVE_RED = '#ED4956';

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function LiveAvatar({ user }) {
  return (
    <div className="relative flex-shrink-0">
      {/* Instagram-style live ring: color ring → white gap → avatar */}
      <div className="rounded-full p-[2px]" style={{ background: LIVE_RED }}>
        <div className="rounded-full p-[2px] bg-white">
          <div className="rounded-full overflow-hidden" style={{ width: 48, height: 48 }}>
            <Avatar user={user} size="md" />
          </div>
        </div>
      </div>
      {/* LIVE pill — bottom-centre, overlapping */}
      <span
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 text-white font-bold rounded uppercase tracking-wide"
        style={{ fontSize: 8, background: LIVE_RED, padding: '1px 5px', borderRadius: 3 }}
      >
        LIVE
      </span>
    </div>
  );
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
    <div className="min-h-screen" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-4 pt-5 pb-4 flex items-center gap-3"
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color="#262626" strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: '#262626' }}>Prayer Cells</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>Live prayer sessions</p>
        </div>
      </motion.div>

      {/* Start a Prayer Cell CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mx-4 mt-1"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleStartHosting}
          disabled={starting}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white"
          style={{ border: '1px solid #DBDBDB' }}
        >
          <div className="flex items-center gap-3">
            <Mic size={20} color={GOLD} strokeWidth={1.8} />
            <div className="text-left">
              <p className="font-bold text-sm leading-tight" style={{ color: '#262626' }}>
                {starting ? 'Starting…' : 'Start a Prayer Cell'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>Open your room · pray for others</p>
            </div>
          </div>
          <ChevronRight size={18} color="#C7C7C7" />
        </motion.button>
      </motion.div>

      {/* Live Now */}
      <div className="mt-6 px-4">
        <p className="font-semibold text-sm mb-1" style={{ color: '#262626' }}>Live Now</p>

        {loading ? (
          <div className="mt-2 space-y-0">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-[#DBDBDB]">
                <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: '#F0F0F0' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded animate-pulse" style={{ background: '#F0F0F0' }} />
                  <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: '#F0F0F0' }} />
                </div>
              </div>
            ))}
          </div>
        ) : activeCells.length === 0 ? (
          <div className="flex flex-col items-center py-14">
            <Mic size={24} color="#C7C7C7" strokeWidth={1.5} />
            <p className="font-semibold mt-4" style={{ color: '#262626' }}>No active prayer cells</p>
            <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>Be the first to open one</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleStartHosting}
              disabled={starting}
              className="mt-6 px-6 py-2.5 rounded-lg bg-white font-semibold text-sm"
              style={{ border: '1px solid #DBDBDB', color: '#262626' }}
            >
              Start Hosting
            </motion.button>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate="show"
            >
              {activeCells.map(cell => (
                <CellRow
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
        <div className="mt-6 px-4">
          <p className="font-semibold text-sm mb-1" style={{ color: '#8E8E8E' }}>Recent Sessions</p>
          {recentCells.map(cell => (
            <RecentCellRow key={cell.id} cell={cell} />
          ))}
        </div>
      )}
    </div>
  );
}

function CellRow({ cell, onJoin, joining }) {
  const guestCount = cell.sessions?.length ?? 0;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
      className="flex items-center gap-3 py-3 border-b border-[#DBDBDB]"
    >
      <LiveAvatar user={cell.host} />

      <div className="flex-1 min-w-0">
        {/* Name + verified mark */}
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate" style={{ color: '#262626' }}>{cell.host.name}</p>
          {cell.host.isVerifiedPastor && (
            <BadgeCheck size={14} color={GOLD} strokeWidth={2} className="flex-shrink-0" />
          )}
        </div>

        {/* Stats + warrior */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <p className="text-xs" style={{ color: '#8E8E8E' }}>
            {cell.sessionCount} prayed · {cell.host.totalPeoplesPrayedFor} total
          </p>
          {cell.host.prayerWarriorBadge && (
            <>
              <span style={{ color: '#C7C7C7', fontSize: 10 }}>·</span>
              <Award size={10} color="#8E8E8E" strokeWidth={2} />
              <span className="text-xs" style={{ color: '#8E8E8E' }}>Warrior</span>
            </>
          )}
        </div>

        {/* Time / room count */}
        <p className="text-xs mt-0.5" style={{ color: '#C7C7C7' }}>
          Started {timeAgo(cell.startedAt)}{guestCount > 0 ? ` · ${guestCount} in room` : ''}
        </p>
      </div>

      {/* Join button — outlined, Instagram "Follow" style */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onJoin}
        disabled={joining}
        className="flex-shrink-0 font-semibold text-xs px-4 py-1.5 rounded-lg bg-white"
        style={{ border: '1px solid #DBDBDB', color: '#262626' }}
      >
        {joining ? '…' : 'Join'}
      </motion.button>
    </motion.div>
  );
}

function RecentCellRow({ cell }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#DBDBDB]">
      {/* Plain avatar, no live ring */}
      <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 52, height: 52 }}>
        <Avatar user={cell.host} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: '#262626' }}>{cell.host.name}</p>
        <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>
          Prayed for {cell.sessionCount} {cell.sessionCount === 1 ? 'person' : 'people'}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#C7C7C7' }}>Ended {timeAgo(cell.endedAt)}</p>
      </div>

      <span className="flex-shrink-0 text-xs" style={{ color: '#C7C7C7' }}>Ended</span>
    </div>
  );
}
