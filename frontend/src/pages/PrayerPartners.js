import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronLeft, X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const BG = '#0A0F1E';
const CARD_BG = '#1A1F35';

const TIPS = [
  'While you wait, why not pray for someone in the Prayer Room?',
  'Prayer partners pray for each other — not with each other.',
  'Share your prayer requests so your partner can pray specifically for you.',
  'A prayer partner is a gift — treat it as a sacred commitment.',
];

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── STATE: NONE ─────────────────────────────────────────────────────────────
function NoneState({ onJoin, joining, userHasGender }) {
  return (
    <div className="px-4 pt-4 pb-32">
      <div className="rounded-2xl p-5 text-center" style={{ background: CARD_BG }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          <Users size={32} color="#f59e0b" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold text-white">Prayer Partners</h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Get matched with a believer of the opposite gender to pray for each other for 7 days
        </p>
      </div>

      {/* How it works */}
      <div className="mt-5 space-y-3">
        {[
          { num: '1', icon: '🙏', text: 'Join the queue' },
          { num: '2', icon: '⚡', text: 'Get matched instantly' },
          { num: '3', icon: '📿', text: 'Pray for each other for 7 days' },
        ].map(step => (
          <div key={step.num} className="flex items-center gap-4 rounded-2xl p-4" style={{ background: CARD_BG }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: '#f59e0b', color: '#1a1a2e' }}
            >
              {step.num}
            </div>
            <span className="text-lg">{step.icon}</span>
            <p className="text-sm font-medium text-white">{step.text}</p>
          </div>
        ))}
      </div>

      {!userHasGender && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-amber-400 text-sm font-medium text-center">
            Please set your gender in Profile → Edit Profile first
          </p>
        </div>
      )}

      <motion.button
        whileTap={userHasGender ? { scale: 0.97 } : {}}
        onClick={userHasGender ? onJoin : undefined}
        disabled={!userHasGender || joining}
        className="w-full mt-5 py-4 rounded-2xl font-bold text-base transition-all"
        style={{
          background: userHasGender ? '#f59e0b' : 'rgba(255,255,255,0.1)',
          color: userHasGender ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
        }}
      >
        {joining ? 'Finding match...' : 'Find My Prayer Partner'}
      </motion.button>
    </div>
  );
}

// ── STATE: WAITING ───────────────────────────────────────────────────────────
function WaitingState({ onCancel }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute rounded-full animate-ping" style={{ width: 128, height: 128, background: 'rgba(245,158,11,0.08)' }} />
        <div
          className="relative w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)' }}
        >
          <Users size={40} color="#f59e0b" strokeWidth={1.5} />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white text-center">Finding your prayer partner...</h2>
      <p className="text-sm text-center mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        We're matching you with a believer of the opposite gender
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-8 rounded-2xl p-4 w-full text-center"
          style={{ background: CARD_BG }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{TIPS[tipIndex]}</p>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={onCancel}
        className="mt-8 px-8 py-3 rounded-full text-sm font-medium border"
        style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }}
      >
        Cancel
      </button>
    </div>
  );
}

// ── STATE: MATCHED ───────────────────────────────────────────────────────────
function MatchedState({ partner, partnership, onLeave }) {
  const navigate = useNavigate();
  const [partnerPrayers, setPartnerPrayers] = useState([]);
  const [myPrayers, setMyPrayers] = useState([]);
  const [loadingPrayers, setLoadingPrayers] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const daysElapsed = 7 - (partnership?.daysLeft ?? 0);
  const progress = Math.min((daysElapsed / 7) * 100, 100);

  useEffect(() => {
    Promise.all([
      api.get('/prayer-partners/partner-prayers').catch(() => ({ data: { prayers: [] } })),
      api.get('/prayers/mine').catch(() => ({ data: [] })),
    ]).then(([partnerRes, myRes]) => {
      setPartnerPrayers(partnerRes.data.prayers || []);
      setMyPrayers((myRes.data || []).filter(p => p.isActive && !p.isAnswered));
      setLoadingPrayers(false);
    });
  }, []);

  function PrayerCard({ prayer, isPartner }) {
    return (
      <div className="rounded-2xl p-4" style={{ background: CARD_BG }}>
        {prayer.isUrgent && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full uppercase tracking-wide mb-2 inline-block">Urgent</span>
        )}
        <p className="text-white font-semibold text-sm">{prayer.title}</p>
        <p className="text-sm mt-1 leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{prayer.body}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{getTimeAgo(prayer.createdAt)}</span>
          {isPartner && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/prayer')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
            >
              🙏 Pray Now
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Partner card */}
      <div
        className="mx-4 mt-4 rounded-2xl p-5 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(245,158,11,0.25)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#f59e0b' }}>
          Your Prayer Partner
        </p>
        <div
          className="mx-auto rounded-full p-[3px] inline-block mb-3"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #a855f7)' }}
        >
          <div className="rounded-full overflow-hidden" style={{ width: 72, height: 72 }}>
            <Avatar user={partner} size="xl" />
          </div>
        </div>
        <p className="text-xl font-bold text-white">{partner?.name}</p>
        {partner?.churchName && (
          <p className="text-sm mt-0.5" style={{ color: '#f59e0b' }}>{partner.churchName}</p>
        )}
        {partner?.location && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{partner.location}</p>
        )}
        {partner?.prayerWarriorBadge && (
          <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>🏆 Prayer Warrior</span>
        )}

        {/* Countdown */}
        <div className="mt-4">
          <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            ⏰ {partnership?.daysLeft ?? 0} day{(partnership?.daysLeft ?? 0) !== 1 ? 's' : ''} remaining
          </p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#f59e0b' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Day 1</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Day 7</span>
          </div>
        </div>
      </div>

      {/* Partner's prayers */}
      <div className="px-4 mt-6">
        <p className="text-white font-bold text-base mb-3">Pray For {partner?.name?.split(' ')[0]}</p>
        {loadingPrayers ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: CARD_BG }} />)}
          </div>
        ) : partnerPrayers.length === 0 ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: CARD_BG }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {partner?.name?.split(' ')[0]} hasn't shared any prayer requests yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Share this page with them to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {partnerPrayers.map(p => <PrayerCard key={p.id} prayer={p} isPartner />)}
          </div>
        )}
      </div>

      {/* My prayers */}
      <div className="px-4 mt-6">
        <p className="text-white font-bold text-base mb-1">Your Requests</p>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {partner?.name?.split(' ')[0]} is praying for these
        </p>
        {loadingPrayers ? (
          <div className="h-20 rounded-2xl animate-pulse" style={{ background: CARD_BG }} />
        ) : myPrayers.length === 0 ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: CARD_BG }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No active prayer requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPrayers.map(p => <PrayerCard key={p.id} prayer={p} isPartner={false} />)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/prayer')}
          className="w-full py-4 rounded-2xl font-bold text-base"
          style={{ background: '#f59e0b', color: '#1a1a2e' }}
        >
          🙏 Pray for {partner?.name?.split(' ')[0]}
        </motion.button>
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold border"
          style={{ borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.7)' }}
        >
          Leave Partnership
        </button>
      </div>

      {/* Leave confirm sheet */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="rounded-t-3xl p-6 pb-10"
              style={{ background: '#1a1f35' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              <p className="text-white font-bold text-lg text-center mb-2">Leave Partnership?</p>
              <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Are you sure? This will end your 7-day partnership with {partner?.name?.split(' ')[0]}.
              </p>
              <button
                onClick={onLeave}
                className="w-full py-4 rounded-2xl font-bold text-sm mb-3"
                style={{ background: '#ef4444', color: 'white' }}
              >
                Yes, Leave
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full py-3 text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MATCHED CELEBRATION overlay ──────────────────────────────────────────────
function MatchCelebration({ partnerName, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
      style={{ background: BG }}
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.3)' }}
      >
        <Users size={44} color="#f59e0b" strokeWidth={1.5} />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-white text-center"
      >
        You're Matched! 🎉
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-center mt-3 leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 260 }}
      >
        {partnerName} is your prayer partner for the next 7 days
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.96 }}
        onClick={onDismiss}
        className="mt-8 px-10 py-4 rounded-full font-bold text-base"
        style={{ background: '#f59e0b', color: '#1a1a2e' }}
      >
        Start Praying Together
      </motion.button>
    </motion.div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PrayerPartners() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [status, setStatus] = useState(null);
  const [partner, setPartner] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [joining, setJoining] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const pollRef = useRef(null);

  const userHasGender = Boolean(me?.gender);

  async function fetchStatus() {
    try {
      const res = await api.get('/prayer-partners/status');
      return res.data;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    fetchStatus().then(data => {
      if (!data) return;
      setStatus(data.status);
      if (data.partner) setPartner(data.partner);
      if (data.partnership) setPartnership(data.partnership);
    });
  }, []);

  // Poll every 5s while waiting
  useEffect(() => {
    if (status !== 'WAITING') {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (!data) return;
      if (data.status === 'MATCHED') {
        clearInterval(pollRef.current);
        setPartner(data.partner);
        setPartnership(data.partnership);
        setStatus('MATCHED');
        setShowCelebration(true);
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [status]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await api.post('/prayer-partners/join');
      if (res.data.status === 'MATCHED') {
        const fresh = await fetchStatus();
        if (fresh) {
          setPartner(fresh.partner);
          setPartnership(fresh.partnership);
        }
        setStatus('MATCHED');
        setShowCelebration(true);
      } else {
        setStatus('WAITING');
      }
    } catch (err) {
      // Gender not set — the UI already handles this case
    }
    setJoining(false);
  }

  async function handleLeave() {
    try {
      await api.post('/prayer-partners/leave');
      setStatus('NONE');
      setPartner(null);
      setPartnership(null);
    } catch {}
  }

  async function handleCancel() {
    try {
      await api.post('/prayer-partners/leave');
      setStatus('NONE');
    } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={22} color="white" strokeWidth={2} />
        </button>
        <h2 className="text-base font-semibold text-white">Prayer Partners</h2>
      </div>

      {/* Content — state machine */}
      {status === null ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        </div>
      ) : status === 'NONE' ? (
        <NoneState onJoin={handleJoin} joining={joining} userHasGender={userHasGender} />
      ) : status === 'WAITING' ? (
        <WaitingState onCancel={handleCancel} />
      ) : status === 'MATCHED' ? (
        <MatchedState partner={partner} partnership={partnership} onLeave={handleLeave} />
      ) : null}

      {/* Match celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <MatchCelebration
            partnerName={partner?.name}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
