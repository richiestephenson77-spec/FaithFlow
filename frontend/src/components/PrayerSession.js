import { useState, useEffect, useRef } from 'react';
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
        return; // show celebration first, then call onEnd after dismiss
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
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  if (streakResult) {
    return <StreakCelebration streak={streakResult} onDone={onEnd} />;
  }

  return (
    <div className="min-h-screen prayer-gradient flex flex-col items-center justify-between px-6 py-12">
      {/* Top — who we're praying for */}
      <div className="text-center text-white">
        <p className="text-white/70 text-sm mb-3">Praying for</p>
        <div className="ring-4 ring-white/40 rounded-full inline-block">
          <Avatar user={request.user} size="xl" />
        </div>
        <h2 className="text-2xl font-bold mt-3">{request.user?.name}</h2>
        {request.user?.churchName && (
          <p className="text-white/60 text-sm mt-0.5">⛪ {request.user.churchName}</p>
        )}
      </div>

      {/* Middle — prayer text + timer */}
      <div className="flex flex-col items-center w-full gap-6">
        <div className="bg-white/10 backdrop-blur rounded-3xl p-5 w-full text-white text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">🙏 Prayer in Progress</p>
          <h3 className="font-bold text-base mb-2">{request.title}</h3>
          <p className="text-white/75 text-sm leading-relaxed line-clamp-4">{request.body}</p>
        </div>

        {/* Timer display */}
        <div className="text-center text-white">
          <div className="text-6xl font-mono font-bold tracking-widest">
            {minutes}:{seconds}
          </div>
          {!ready ? (
            <div className="mt-3 flex flex-col items-center gap-1">
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${(elapsed / MIN_SECONDS) * 100}%` }}
                />
              </div>
              <p className="text-white/60 text-xs mt-1">Finish available in {countdown}s</p>
            </div>
          ) : (
            <p className="text-white/60 text-sm mt-2">Time in prayer</p>
          )}
        </div>
      </div>

      {/* Bottom — buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={handleFinish}
          disabled={!ready || ending}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            ready && !ending
              ? 'bg-white text-faith-700 shadow-lg'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          {ending ? 'Saving...' : ready ? '✅ Finish Prayer' : `Finish Prayer (${countdown}s)`}
        </button>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full py-3 rounded-2xl font-semibold text-white/60 text-sm border border-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
