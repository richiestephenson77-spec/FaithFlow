import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronUp, Globe } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { hapticMedium, hapticSuccess } from '../utils/haptics';
import { useToast } from '../contexts/ToastContext';

const ACCENT = '#2C4055';
const DASH_EMPTY = '#E5E3DE';

function firstName(person) {
  return person?.name?.split(' ')[0] || 'them';
}

function Avatar72({ request }) {
  const person = request.user;
  if (request.isAnonymous) {
    return (
      <div className="rounded-full flex items-center justify-center" style={{ width: 72, height: 72, background: 'rgba(44,64,85,0.12)' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }
  if (person?.profilePhoto) {
    return <img loading="lazy" decoding="async" src={person.profilePhoto} alt={person.name} className="rounded-full object-cover" style={{ width: 72, height: 72 }} />;
  }
  const initials = person?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold" style={{ width: 72, height: 72, fontSize: 26, background: '#5C6672' }}>
      {initials}
    </div>
  );
}

// Slide variants for the Stories/Reels-style vertical paging
const variants = {
  enter: (dir) => ({ y: dir > 0 ? '100%' : '-100%', opacity: 0.4 }),
  center: { y: 0, opacity: 1 },
  exit: (dir) => ({ y: dir > 0 ? '-100%' : '100%', opacity: 0.4 }),
};

export default function PrayerImmersive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const showToast = useToast();

  const stateQueue = location.state?.queue;
  const [queue, setQueue] = useState(Array.isArray(stateQueue) ? stateQueue : null);
  const [quota, setQuota] = useState(location.state?.quota || null);
  const [[index, dir], setPos] = useState([0, 0]);
  const [prayedIds, setPrayedIds] = useState(() => new Set());
  const [praying, setPraying] = useState(false);
  const [ready, setReady] = useState(Array.isArray(stateQueue));
  const [done, setDone] = useState(false);

  // Fallback for deep-link / refresh (no router state): rebuild the queue
  useEffect(() => {
    if (queue) return;
    api.get('/prayers/feed').then(res => {
      const q = [...(res.data.top3 || []), ...(res.data.rest || [])];
      setQueue(q);
      setReady(true);
    }).catch(() => { setQueue([]); setReady(true); });
  }, [queue]);

  // Set starting index from the :id param once the queue is available
  useEffect(() => {
    if (!queue) return;
    const i = queue.findIndex(r => r.id === id);
    setPos([i >= 0 ? i : 0, 0]);
  }, [queue, id]);

  // Quota (top-bar dashes)
  useEffect(() => {
    if (quota) return;
    api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {});
  }, [quota]);

  // Live worldwide-count updates while on this screen
  useEffect(() => {
    if (!socket) return;
    const handler = ({ prayerRequestId, newCount }) => {
      setQueue(prev => prev ? prev.map(r => r.id === prayerRequestId ? { ...r, prayerCount: newCount, totalPrayerCount: newCount } : r) : prev);
    };
    socket.on('prayer_count_updated', handler);
    return () => socket.off('prayer_count_updated', handler);
  }, [socket]);

  const paginate = useCallback((newDir) => {
    setPos(([i]) => {
      const ni = i + newDir;
      if (ni < 0) return [i, 0];
      if (queue && ni >= queue.length) { setDone(true); return [i, 0]; }
      return [ni, newDir];
    });
  }, [queue]);

  const current = queue && queue[index];

  async function pray() {
    if (!current || praying || prayedIds.has(current.id) || current.isOwner) return;
    hapticMedium();
    setPraying(true);
    try {
      // Reuse the existing quick-prayer flow exactly: start → end → complete-prayer
      const startRes = await api.post(`/prayers/${current.id}/start`);
      await api.post(`/prayers/session/${startRes.data.id}/end`);
      const q = await api.post('/quota/complete-prayer', { prayerRequestId: current.id });
      hapticSuccess();
      showToast('Prayer recorded');
      setPrayedIds(prev => new Set(prev).add(current.id));
      if (q.data && q.data.target != null) setQuota(prevQ => ({ ...(prevQ || {}), completed: q.data.completed, target: q.data.target, isComplete: q.data.isComplete }));
      // Optimistically bump the worldwide count (socket may also update it)
      setQueue(prev => prev.map((r, i) => {
        if (i !== index) return r;
        const c = (r.prayerCount ?? r.totalPrayerCount ?? 0) + 1;
        return { ...r, prayerCount: c, totalPrayerCount: c };
      }));
    } catch {}
    setPraying(false);
  }

  const target = quota?.target ?? 5;
  const completed = quota?.completed ?? 0;

  const TopBar = (
    <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12 }}>
      <button onClick={() => navigate('/prayer')} aria-label="Back" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
        <ChevronLeft size={20} color="#1A1A1A" strokeWidth={2} />
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: target }).map((_, i) => (
          <span key={i} className="rounded-full" style={{ width: 18, height: 4, background: i < completed ? ACCENT : DASH_EMPTY }} />
        ))}
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#FAFAF8' }}>
        {TopBar}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="rounded-full flex items-center justify-center mb-5" style={{ width: 72, height: 72, background: 'rgba(44,64,85,0.12)' }}>
            <span style={{ fontSize: 32 }}>🙏</span>
          </div>
          <p className="text-lg font-medium" style={{ color: '#1A1A1A' }}>You've prayed through today's list</p>
          <p className="text-sm mt-2" style={{ color: '#8E8E8E' }}>Thank you for showing up for others.</p>
          <button
            onClick={() => navigate('/prayer')}
            className="mt-8 w-full font-semibold text-white"
            style={{ background: ACCENT, borderRadius: 14, padding: '14px 0', maxWidth: 280 }}
          >
            Back to Prayer
          </button>
        </div>
      </div>
    );
  }

  if (!ready || !current) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#FAFAF8' }}>
        {TopBar}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#E5E3DE', borderTopColor: ACCENT }} />
        </div>
      </div>
    );
  }

  const person = current.user;
  const displayName = current.isAnonymous ? 'Anonymous Believer' : (person?.name || 'Someone');
  const church = current.isAnonymous ? null : person?.churchName;
  const place = current.displayLocation || null;
  const meta = [church, place].filter(Boolean).join(' · ');
  const count = current.prayerCount ?? current.totalPrayerCount ?? 0;
  const hasPrayed = prayedIds.has(current.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#FAFAF8' }}>
      {TopBar}

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence custom={dir} initial={false}>
          <motion.div
            key={index}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(e, info) => {
              if (info.offset.y < -90) paginate(1);
              else if (info.offset.y > 90) paginate(-1);
            }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Center — the person + their request */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <Avatar72 request={current} />
              <p className="mt-3" style={{ fontSize: 17, fontWeight: 500, color: '#1A1A1A' }}>{displayName}</p>
              {meta && <p className="mt-0.5" style={{ fontSize: 12, color: '#8E8E8E' }}>{meta}</p>}

              <p style={{ fontSize: 19, fontWeight: 500, color: '#1A1A1A', marginTop: 24 }}>{current.title}</p>
              <p style={{ fontSize: 15, color: '#5C6672', lineHeight: 1.6, marginTop: 12 }}>{current.body}</p>

              <div className="flex items-center gap-1.5 mt-5" style={{ color: '#8E8E8E' }}>
                <Globe size={12} strokeWidth={2} />
                <span style={{ fontSize: 12 }}>{count} {count === 1 ? 'person' : 'people'} praying worldwide</span>
              </div>
            </div>

            {/* Bottom — pray CTA + swipe hint */}
            <div className="px-6 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
              {current.isOwner ? (
                <div className="w-full text-center" style={{ borderRadius: 14, padding: '15px 0', background: 'rgba(0,0,0,0.04)', color: '#8E8E8E', fontWeight: 500 }}>
                  Your prayer request
                </div>
              ) : (
                <motion.button
                  whileTap={hasPrayed ? {} : { scale: 0.97 }}
                  onClick={pray}
                  disabled={praying || hasPrayed}
                  className="w-full font-semibold"
                  style={{
                    borderRadius: 14,
                    padding: '15px 0',
                    background: hasPrayed ? 'rgba(44,64,85,0.12)' : ACCENT,
                    color: hasPrayed ? ACCENT : '#FFFFFF',
                  }}
                >
                  {hasPrayed ? 'Prayed ✓' : praying ? 'Praying…' : `Pray for ${firstName(person)}`}
                </motion.button>
              )}
              <div className="flex items-center justify-center gap-1 mt-3" style={{ color: '#B0AEA8' }}>
                <ChevronUp size={14} strokeWidth={2} />
                <span style={{ fontSize: 12 }}>Swipe up for next</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
