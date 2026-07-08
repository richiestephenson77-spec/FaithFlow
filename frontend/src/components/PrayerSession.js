import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, HandHeart } from 'lucide-react';
import api from '../utils/api';
import Avatar from './Avatar';
import StreakCelebration from './StreakCelebration';

const MIN_SECONDS = 15;

export default function PrayerSession({ session, request, onEnd }) {
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [streakResult, setStreakResult] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleFinish() {
    clearInterval(intervalRef.current);
    setEnding(true);
    try {
      const res = await api.post(`/prayers/session/${session.id}/end`);
      if (res.data.streak?.increased) {
        setStreakResult(res.data.streak);
        return;
      }
    } catch {}
    onEnd();
  }

  async function handleCancel() {
    clearInterval(intervalRef.current);
    setCancelling(true);
    try {
      await api.post(`/prayers/session/${session.id}/end`);
    } catch {}
    onEnd();
  }

  const ready = elapsed >= MIN_SECONDS;
  const countdown = Math.max(0, MIN_SECONDS - elapsed);
  const progressPct = Math.min(100, (elapsed / MIN_SECONDS) * 100);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  if (streakResult) {
    return <StreakCelebration streak={streakResult} onDone={onEnd} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12" style={{ background: '#0A0F1E' }}>
      {/* Stories-style progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <motion.div
          className="h-full"
          style={{ background: '#C9932F', width: `${progressPct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      {/* Top — who we're praying for */}
      <div className="text-center text-white pt-2">
        <p className="text-white/60 text-sm mb-3">Praying for</p>
        <div className="ring-4 rounded-full inline-block" style={{ ringColor: 'rgba(201,147,47,0.6)' }}>
          <div className="rounded-full p-[3px]" style={{ background: 'rgba(201,147,47,0.6)' }}>
            <div className="rounded-full p-[2px] bg-[#0A0F1E]">
              <Avatar user={request.user} size="xl" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-3">{request.user?.name}</h2>
        {request.user?.churchName && (
          <p className="text-sm mt-0.5 flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Building2 size={12} color="#8E8E8E" strokeWidth={1.8} />
            {request.user.churchName}
          </p>
        )}
      </div>

      {/* Middle — prayer text + timer */}
      <div className="flex flex-col items-center w-full gap-6">
        <div className="bg-white/10 backdrop-blur rounded-3xl p-5 w-full text-white text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <HandHeart size={12} color="#C9932F" strokeWidth={2} />
            Prayer in Progress
          </p>
          <h3 className="font-bold text-base mb-2">{request.title}</h3>
          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'rgba(255,255,255,0.75)' }}>{request.body}</p>
        </div>

        {/* Timer display */}
        <div className="text-center text-white">
          <div className="text-6xl font-mono font-bold tracking-widest">
            {minutes}:{seconds}
          </div>
          {!ready ? (
            <div className="mt-3 flex flex-col items-center gap-1">
              <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%`, background: '#C9932F' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Finish available in {countdown}s</p>
            </div>
          ) : (
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Time in prayer</p>
          )}
        </div>
      </div>

      {/* Bottom — buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={handleFinish}
          disabled={!ready || ending}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all"
          style={
            ready && !ending
              ? { background: '#C9932F', color: '#0A0F1E' }
              : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
          }
        >
          {ending ? 'Saving…' : ready ? 'Finish Prayer' : `Finish Prayer (${countdown}s)`}
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full py-3 rounded-2xl font-semibold text-sm"
          style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
