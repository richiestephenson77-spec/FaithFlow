import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { fadeUp } from '../utils/animations';

const MIN_SECONDS = 15;

export default function PrayerQueue({ onClose, onComplete }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('timer');
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [quotaResult, setQuotaResult] = useState(null);
  const intervalRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    api.get('/quota/queue').then(res => {
      setQueue(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!queue.length || loading) return;
    const req = queue[current];
    if (!req) return;
    setElapsed(0);
    setPhase('timer');
    sessionRef.current = null;
    api.post(`/prayers/${req.id}/start`).then(res => {
      sessionRef.current = res.data;
    }).catch(() => {});
  }, [current, queue, loading]);

  useEffect(() => {
    if (phase !== 'timer') return;
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase, current]);

  async function handleFinish() {
    clearInterval(intervalRef.current);
    setFinishing(true);
    try {
      if (sessionRef.current) {
        await api.post(`/prayers/session/${sessionRef.current.id}/end`);
      }
      const res = await api.post('/quota/complete-prayer', { prayerRequestId: queue[current].id });
      const isLast = current === queue.length - 1;
      if (isLast) {
        setQuotaResult(res.data);
        setPhase('done');
      } else {
        setPhase('flash');
        setTimeout(() => {
          setCurrent(c => c + 1);
          setFinishing(false);
        }, 800);
      }
    } catch {
      if (current < queue.length - 1) {
        setPhase('flash');
        setTimeout(() => { setCurrent(c => c + 1); setFinishing(false); }, 800);
      } else {
        setPhase('done');
      }
    }
  }

  function handleSkip() {
    clearInterval(intervalRef.current);
    if (current < queue.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setPhase('done');
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white/70 text-sm">Gathering prayers for you...</p>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-4xl mb-4">🙏</p>
        <p className="text-white font-bold text-xl mb-2">No prayers available</p>
        <p className="text-white/60 text-sm mb-8">Check back later — new requests are added daily</p>
        <button onClick={onClose} className="bg-white text-gray-900 font-bold rounded-2xl px-8 py-3">Close</button>
      </div>
    );
  }

  if (phase === 'done') {
    return <QuotaCelebration result={quotaResult} count={queue.length} onContinue={() => { onComplete && onComplete(); onClose(); }} />;
  }

  const req = queue[current];
  const ready = elapsed >= MIN_SECONDS;
  const countdown = Math.max(0, MIN_SECONDS - elapsed);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  const progress = (current / queue.length) * 100;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-all duration-300 ${phase === 'flash' ? 'bg-emerald-900' : 'bg-gray-900'}`}>
      {/* Top bar */}
      <div className="px-4 pt-safe pt-4 pb-3 flex items-center gap-3">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="flex-1">
          {/* Counter re-animates on change */}
          <AnimatePresence mode="wait">
            <motion.p
              key={current}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-white/50 text-xs mb-1"
            >
              Prayer {current + 1} of {queue.length}
            </motion.p>
          </AnimatePresence>
          {/* Progress bar animates width */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-400 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Flash overlay */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="text-center">
              <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="text-5xl mb-2"
              >🙏</motion.p>
              <p className="text-white font-bold text-xl">Prayed!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card — slides in from right when current changes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-1 flex flex-col px-4 py-4"
        >
          {/* Person */}
          <div className="text-center mb-5">
            <p className="text-white/50 text-xs mb-3">Praying for</p>
            <div className="inline-block ring-4 ring-white/20 rounded-full">
              <Avatar user={req.user} size="xl" />
            </div>
            <p className="text-white font-bold text-lg mt-2">{req.user?.name}</p>
            {req.user?.churchName && <p className="text-white/50 text-xs mt-0.5">{req.user.churchName}</p>}
          </div>

          {/* Prayer card */}
          <div className="bg-white/8 backdrop-blur rounded-3xl p-5 text-white text-center flex-1 flex flex-col justify-center mb-5">
            {req.isUrgent && (
              <span className="text-[10px] font-bold text-red-300 bg-red-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide mb-3 inline-block">Urgent</span>
            )}
            <h3 className="font-bold text-base mb-2">{req.title}</h3>
            <p className="text-white/65 text-sm leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{req.body}</p>
          </div>

          {/* Timer */}
          <div className="text-center mb-5">
            <div className="text-5xl font-mono font-bold text-white tracking-widest">{minutes}:{seconds}</div>
            {!ready ? (
              <div className="mt-3 flex flex-col items-center gap-1">
                <div className="w-44 h-1.5 bg-white/15 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    animate={{ width: `${(elapsed / MIN_SECONDS) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">Available in {countdown}s</p>
              </div>
            ) : (
              <p className="text-white/40 text-sm mt-1">Time in prayer</p>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-3 pb-8">
            <motion.button
              onClick={handleFinish}
              disabled={!ready || finishing}
              whileTap={ready && !finishing ? { scale: 0.97 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                ready && !finishing ? 'bg-amber-400 text-gray-900 shadow-lg' : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {finishing ? 'Saving...' : ready ? 'Finish Prayer' : `Finish Prayer (${countdown}s)`}
            </motion.button>
            <button onClick={handleSkip} className="w-full py-3 rounded-2xl text-white/40 text-sm font-medium border border-white/10">
              Skip
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuotaCelebration({ result, count, onContinue }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 3 + 1,
      color: ['#F5C842', '#f97316', '#a855f7', '#22c55e', '#3b82f6'][Math.floor(Math.random() * 5)],
      tilt: Math.random() * 10 - 5,
      tiltAngle: 0,
      tiltSpeed: Math.random() * 0.1 + 0.05,
    }));

    let animId;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.tiltAngle += p.tiltSpeed;
        p.y += p.d;
        p.x += Math.sin(p.tiltAngle) * 1.5;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt * Math.PI / 180);
        ctx.fillRect(0, 0, p.r, p.r * 2);
        ctx.restore();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center px-8 text-center">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="relative z-10">
        {/* Emoji bounces in */}
        <motion.p
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.25, 1] }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
          className="text-7xl mb-4"
        >🎉</motion.p>

        {/* Title */}
        <motion.h2
          {...fadeUp}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-white text-2xl font-extrabold mb-2"
        >
          Daily Goal Complete!
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          {...fadeUp}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="text-white/60 text-sm mb-6"
        >
          You prayed for {count} {count === 1 ? 'person' : 'people'} today
        </motion.p>

        {/* Badge */}
        {result?.badgeEarned && (
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 16, delay: 0.65 }}
            className="mb-6 bg-amber-400/20 border border-amber-400/30 rounded-2xl p-4 mx-auto max-w-xs"
          >
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-amber-300 font-bold text-sm">Prayer Warrior Badge Earned!</p>
            <p className="text-amber-400/70 text-xs mt-0.5">First daily quota completed</p>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.button
          {...fadeUp}
          transition={{ delay: result?.badgeEarned ? 0.85 : 0.6, duration: 0.3 }}
          whileTap={{ scale: 0.96 }}
          onClick={onContinue}
          className="bg-amber-400 text-gray-900 font-bold rounded-2xl px-10 py-4 text-base shadow-xl"
        >
          Continue
        </motion.button>
      </div>
    </div>
  );
}
