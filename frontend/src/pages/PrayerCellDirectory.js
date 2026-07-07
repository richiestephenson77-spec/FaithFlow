import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Cross, Award } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useSocket } from '../contexts/SocketContext';

const BG = '#0A0F1E';
const CARD_BG = '#141A2E';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const GOLD = '#C9932F';
const GOLD_GLOW = 'rgba(201,147,47,0.15)';
const LIVE_RED = '#DC5F5F';
const TEXT_PRIMARY = '#F5F3EE';
const TEXT_SECONDARY = 'rgba(245,243,238,0.5)';
const TEXT_TERTIARY = 'rgba(245,243,238,0.3)';

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function PulseDot({ size = 6, color = LIVE_RED }) {
  return (
    <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {[1.8, 1.4].map((scale, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, scale], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
        />
      ))}
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
      />
    </span>
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
    <div className="min-h-screen pb-32" style={{ background: BG }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-5 pt-5 pb-4 flex items-center gap-3"
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color={TEXT_PRIMARY} strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>Prayer Cells</h2>
          <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>Live prayer sessions</p>
        </div>
      </motion.div>

      {/* Start hosting CTA */}
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
          style={{ background: GOLD, boxShadow: '0 4px 20px rgba(201,147,47,0.25)' }}
        >
          <div className="flex items-center gap-3">
            <Mic size={24} color={BG} strokeWidth={1.8} />
            <div className="text-left">
              <p className="font-bold text-base leading-tight" style={{ color: BG }}>
                {starting ? 'Starting…' : 'Start a Prayer Cell'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(10,15,30,0.6)' }}>Open your room · pray for others</p>
            </div>
          </div>
          <ChevronRight size={20} color={BG} />
        </motion.button>
      </motion.div>

      {/* Live cells */}
      <div className="mt-6 px-4">
        <div className="flex items-center gap-2 mb-3">
          <PulseDot size={6} color={LIVE_RED} />
          <p className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>Live Now</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : activeCells.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            {/* Concentric rings empty state */}
            <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <div className="absolute rounded-full" style={{ width: 80, height: 80, border: `1px solid ${GOLD}`, opacity: 0.1 }} />
              <div className="absolute rounded-full" style={{ width: 56, height: 56, border: `1px solid ${GOLD}`, opacity: 0.2 }} />
              <div className="absolute rounded-full" style={{ width: 32, height: 32, border: `1px solid ${GOLD}`, opacity: 0.3 }} />
              <Mic size={16} color={GOLD} strokeWidth={1.8} />
            </div>
            <p className="font-semibold mt-4" style={{ color: TEXT_SECONDARY }}>No active prayer cells</p>
            <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Be the first to open one</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartHosting}
              disabled={starting}
              className="mt-6 px-6 py-3 rounded-full font-semibold text-sm"
              style={{ background: GOLD, color: BG }}
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
          <p className="font-bold text-sm mb-3" style={{ color: TEXT_TERTIARY }}>
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
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: 48, height: 48,
              boxShadow: cell.host.isVerifiedPastor ? `0 0 0 2px ${GOLD}` : 'none',
            }}
          >
            <Avatar user={cell.host} size="md" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>{cell.host.name}</p>
            {cell.host.isVerifiedPastor && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: GOLD_GLOW, color: GOLD }}>
                <Cross size={10} strokeWidth={2.5} />
                Pastor
              </span>
            )}
            {cell.host.prayerWarriorBadge && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: CARD_BORDER, color: TEXT_SECONDARY }}>
                <Award size={10} strokeWidth={2} />
                Warrior
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs font-medium" style={{ color: GOLD }}>
              {cell.sessionCount} prayed this session
            </p>
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
              · {cell.host.totalPeoplesPrayedFor} total
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <PulseDot size={4} color={LIVE_RED} />
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>
              Live · Started {timeAgo(cell.startedAt)}
              {guestCount > 0 && ` · ${guestCount} in room`}
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onJoin}
          disabled={joining}
          className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-full"
          style={{ background: GOLD, color: BG }}
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
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, opacity: 0.65 }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 48, height: 48 }}>
          <Avatar user={cell.host} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>{cell.host.name}</p>
          <p className="text-xs mt-0.5" style={{ color: GOLD }}>
            Prayed for {cell.sessionCount} {cell.sessionCount === 1 ? 'person' : 'people'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 4, background: TEXT_TERTIARY }} />
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Ended {timeAgo(cell.endedAt)}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full"
          style={{ background: CARD_BORDER, color: TEXT_TERTIARY }}>
          Ended
        </span>
      </div>
    </div>
  );
}
