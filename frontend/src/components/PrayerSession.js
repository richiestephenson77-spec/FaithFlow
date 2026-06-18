import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import Avatar from './Avatar';

export default function PrayerSession({ session, request, onEnd }) {
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleEnd() {
    clearInterval(intervalRef.current);
    setEnding(true);
    try {
      await api.post(`/prayers/session/${session.id}/end`);
    } catch {}
    onEnd();
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="min-h-screen prayer-gradient flex flex-col items-center justify-between px-6 py-12">
      <div className="text-center text-white">
        <p className="text-white/70 text-sm mb-2">Praying for</p>
        <Avatar user={request.user} size="xl" />
        <h2 className="text-2xl font-bold mt-4">{request.user?.name}</h2>
        {request.user?.churchName && (
          <p className="text-white/60 text-sm">⛪ {request.user.churchName}</p>
        )}
      </div>

      <div className="text-center text-white flex-1 flex flex-col items-center justify-center">
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 w-72 text-center">
          <h3 className="font-bold text-lg mb-3">{request.title}</h3>
          <p className="text-white/80 text-sm leading-relaxed">{request.body}</p>
        </div>

        {/* Timer */}
        <div className="mt-8">
          <div className="text-6xl font-mono font-bold tracking-widest animate-prayer">
            {minutes}:{seconds}
          </div>
          <p className="text-white/60 text-sm mt-2">Time in prayer</p>
        </div>
      </div>

      <button
        onClick={handleEnd}
        disabled={ending}
        className="bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold rounded-2xl px-10 py-4 text-lg w-full max-w-xs disabled:opacity-50"
      >
        {ending ? 'Saving...' : 'End Prayer Session'}
      </button>
    </div>
  );
}
