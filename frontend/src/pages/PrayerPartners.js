import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronLeft, Zap, Clock, Award, HandHeart } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const BG = '#FAFAFA';
const CARD_BG = '#FFFFFF';
const GOLD = '#C0603F';
const GOLD_BG = 'rgba(201,147,47,0.12)';

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
  const STEPS = [
    { num: '1', Icon: HandHeart, text: 'Join the queue' },
    { num: '2', Icon: Zap,       text: 'Get matched instantly' },
    { num: '3', Icon: Clock,     text: 'Pray for each other for 7 days' },
  ];

  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl p-5 text-center border" style={{ background: CARD_BG, borderColor: '#EFEFEF' }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: GOLD_BG }}
        >
          <Users size={32} color={GOLD} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#262626' }}>Prayer Partners</h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: '#8E8E8E' }}>
          Get matched with a believer of the opposite gender to pray for each other for 7 days
        </p>
      </div>

      {/* How it works */}
      <div className="mt-5 space-y-3">
        {STEPS.map(step => (
          <div key={step.num} className="flex items-center gap-4 rounded-2xl p-4 border" style={{ background: CARD_BG, borderColor: '#EFEFEF' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: GOLD }}
            >
              {step.num}
            </div>
            <step.Icon size={18} color={GOLD} strokeWidth={1.8} className="flex-shrink-0" />
            <p className="text-sm font-medium" style={{ color: '#262626' }}>{step.text}</p>
          </div>
        ))}
      </div>

      {!userHasGender && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(201,147,47,0.08)', border: '1px solid rgba(201,147,47,0.2)' }}>
          <p className="text-sm font-medium text-center" style={{ color: GOLD }}>
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
          background: userHasGender ? GOLD : '#F0F0F0',
          color: userHasGender ? 'white' : '#C7C7C7',
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
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute rounded-full animate-ping" style={{ width: 128, height: 128, background: 'rgba(201,147,47,0.08)' }} />
        <div
          className="relative w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: GOLD_BG, border: `2px solid rgba(201,147,47,0.3)` }}
        >
          <Users size={40} color={GOLD} strokeWidth={1.5} />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-center" style={{ color: '#262626' }}>Finding your prayer partner...</h2>
      <p className="text-sm text-center mt-2" style={{ color: '#8E8E8E' }}>
        We're matching you with a believer of the opposite gender
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-8 rounded-2xl p-4 w-full text-center border"
          style={{ background: CARD_BG, borderColor: '#EFEFEF' }}
        >
          <p className="text-sm" style={{ color: '#8E8E8E' }}>{TIPS[tipIndex]}</p>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={onCancel}
        className="mt-8 px-8 py-3 rounded-full text-sm font-medium border"
        style={{ borderColor: '#DBDBDB', color: '#8E8E8E' }}
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
      <div className="rounded-2xl p-4 border" style={{ background: CARD_BG, borderColor: '#EFEFEF' }}>
        {prayer.isUrgent && (
          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wide mb-2 inline-block border border-red-100">Urgent</span>
        )}
        <p className="font-semibold text-sm" style={{ color: '#262626' }}>{prayer.title}</p>
        <p className="text-sm mt-1 leading-snug line-clamp-2" style={{ color: '#8E8E8E' }}>{prayer.body}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: '#C7C7C7' }}>{getTimeAgo(prayer.createdAt)}</span>
          {isPartner && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/prayer')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(201,147,47,0.15)', color: GOLD }}
            >
              Pray Now
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Partner card */}
      <div
        className="mx-4 mt-4 rounded-2xl p-5 text-center border"
        style={{ background: 'rgba(201,147,47,0.08)', borderColor: 'rgba(201,147,47,0.2)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
          Your Prayer Partner
        </p>
        <div
          className="mx-auto rounded-full p-[3px] inline-block mb-3"
          style={{ background: GOLD }}
        >
          <div className="rounded-full overflow-hidden bg-white p-[2px]">
            <div className="rounded-full overflow-hidden" style={{ width: 68, height: 68 }}>
              <Avatar user={partner} size="xl" />
            </div>
          </div>
        </div>
        <p className="text-xl font-bold" style={{ color: '#262626' }}>{partner?.name}</p>
        {partner?.churchName && (
          <p className="text-sm mt-0.5" style={{ color: GOLD }}>{partner.churchName}</p>
        )}
        {partner?.location && (
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{partner.location}</p>
        )}
        {partner?.prayerWarriorBadge && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: GOLD_BG, color: GOLD }}>
            <Award size={11} strokeWidth={2} />
            Prayer Warrior
          </span>
        )}

        {/* Countdown */}
        <div className="mt-4">
          <p className="text-xs mb-1.5" style={{ color: '#8E8E8E' }}>
            {partnership?.daysLeft ?? 0} day{(partnership?.daysLeft ?? 0) !== 1 ? 's' : ''} remaining
          </p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EFEFEF' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: GOLD }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: '#C7C7C7' }}>Day 1</span>
            <span className="text-[10px]" style={{ color: '#C7C7C7' }}>Day 7</span>
          </div>
        </div>
      </div>

      {/* Partner's prayers */}
      <div className="px-4 mt-6">
        <p className="font-bold text-base mb-3" style={{ color: '#262626' }}>Pray For {partner?.name?.split(' ')[0]}</p>
        {loadingPrayers ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#F0F0F0' }} />)}
          </div>
        ) : partnerPrayers.length === 0 ? (
          <div className="rounded-2xl p-5 text-center border" style={{ background: CARD_BG, borderColor: '#EFEFEF' }}>
            <p className="text-sm" style={{ color: '#8E8E8E' }}>
              {partner?.name?.split(' ')[0]} hasn't shared any prayer requests yet
            </p>
            <p className="text-xs mt-1" style={{ color: '#C7C7C7' }}>
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
        <p className="font-bold text-base mb-1" style={{ color: '#262626' }}>Your Requests</p>
        <p className="text-xs mb-3" style={{ color: '#8E8E8E' }}>
          {partner?.name?.split(' ')[0]} is praying for these
        </p>
        {loadingPrayers ? (
          <div className="h-20 rounded-2xl animate-pulse" style={{ background: '#F0F0F0' }} />
        ) : myPrayers.length === 0 ? (
          <div className="rounded-2xl p-4 text-center border" style={{ background: CARD_BG, borderColor: '#EFEFEF' }}>
            <p className="text-sm" style={{ color: '#8E8E8E' }}>No active prayer requests</p>
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
          className="w-full py-4 rounded-2xl font-bold text-base text-white"
          style={{ background: GOLD }}
        >
          Pray for {partner?.name?.split(' ')[0]}
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
            className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="rounded-t-3xl p-6 pb-10 bg-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E0E0E0' }} />
              <p className="font-bold text-lg text-center mb-2" style={{ color: '#262626' }}>Leave Partnership?</p>
              <p className="text-sm text-center mb-6" style={{ color: '#8E8E8E' }}>
                Are you sure? This will end your 7-day partnership with {partner?.name?.split(' ')[0]}.
              </p>
              <button
                onClick={onLeave}
                className="w-full py-4 rounded-2xl font-bold text-sm mb-3 text-white"
                style={{ background: '#ef4444' }}
              >
                Yes, Leave
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full py-3 text-sm font-medium"
                style={{ color: '#8E8E8E' }}
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
        style={{ background: GOLD_BG, border: `2px solid rgba(201,147,47,0.3)` }}
      >
        <Users size={44} color={GOLD} strokeWidth={1.5} />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-center"
        style={{ color: '#262626' }}
      >
        You're Matched!
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-center mt-3 leading-relaxed"
        style={{ color: '#8E8E8E', maxWidth: 260 }}
      >
        {partnerName} is your prayer partner for the next 7 days
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.96 }}
        onClick={onDismiss}
        className="mt-8 px-10 py-4 rounded-full font-bold text-base text-white"
        style={{ background: GOLD }}
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
    } catch {}
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
    <div className="h-full flex flex-col" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 bg-white" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#262626" strokeWidth={2} />
        </button>
        <h2 className="text-base font-semibold" style={{ color: '#262626' }}>Prayer Partners</h2>
      </div>

      {/* Content — state machine */}
      {status === null ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
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
