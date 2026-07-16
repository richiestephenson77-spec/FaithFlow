import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { usePrayerCellAudio } from '../hooks/usePrayerCellAudio';
import Avatar from '../components/Avatar';

const BG = '#EEF3F5';
const ACCENT = '#C0603F';
const PRAYER_DURATION = 60;

export default function PrayerCellHostRoom() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { getLocalStream, makeOffer, handleAnswer, handleIce, endCall, toggleMute } = usePrayerCellAudio();

  const [phase, setPhase] = useState('waiting'); // waiting | praying | complete
  const [guest, setGuest] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionGuests, setSessionGuests] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PRAYER_DURATION);

  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Set up socket listeners FIRST, then emit cell:host
  useEffect(() => {
    if (!socket || !cellId) return;

    async function onGuestJoined({ guestSocketId }) {
      // Start praying UI
      setGuest({ name: 'Someone', profilePhoto: null });
      setSessionGuests(prev => [...prev, { name: 'Someone', joinedAt: Date.now() }]);
      setPhase('praying');
      setTimeLeft(PRAYER_DURATION);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setPhase('complete');
            setSessionCount(c => c + 1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      // WebRTC offer
      try {
        const stream = streamRef.current || await getLocalStream();
        streamRef.current = stream;
        await makeOffer(guestSocketId, socket, stream);
      } catch (err) {
        console.error('[Host] makeOffer error:', err);
      }
    }

    function onAnswer({ answer }) { handleAnswer(answer); }
    function onIce({ candidate }) { handleIce(candidate); }

    function onGuestLeft() {
      clearInterval(timerRef.current);
      setSessionCount(c => c + 1);
      setPhase('complete');
      setGuest(null);
      endCall();
    }

    function onPeerDisconnected() { onGuestLeft(); }

    // Register listeners first
    socket.on('cell:guest_joined', onGuestJoined);
    socket.on('cell:answer', onAnswer);
    socket.on('cell:ice', onIce);
    socket.on('cell:guest_left', onGuestLeft);
    socket.on('cell:peer_disconnected', onPeerDisconnected);

    // Then announce as host
    socket.emit('cell:host', { cellId });

    // Init mic in background
    getLocalStream()
      .then(stream => { streamRef.current = stream; })
      .catch(err => console.error('[Host] mic error:', err));

    return () => {
      socket.off('cell:guest_joined', onGuestJoined);
      socket.off('cell:answer', onAnswer);
      socket.off('cell:ice', onIce);
      socket.off('cell:guest_left', onGuestLeft);
      socket.off('cell:peer_disconnected', onPeerDisconnected);
      endCall();
      clearInterval(timerRef.current);
    };
  }, [socket, cellId]); // eslint-disable-line

  async function handleEnd() {
    try { await api.post(`/prayer-cells/${cellId}/end`); } catch {}
    if (socket) socket.emit('cell:ended', { cellId });
    endCall();
    navigate('/prayer-cells', { replace: true });
  }

  function handleMute() { setIsMuted(toggleMute()); }

  function handlePrayNext() {
    setPhase('waiting');
    setGuest(null);
    setTimeLeft(PRAYER_DURATION);
  }

  const progress = timeLeft / PRAYER_DURATION;

  return (
    <div className="h-full flex flex-col" style={{ background: BG }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div />
        <p className="font-semibold text-base" style={{ color: '#163449' }}>Your Prayer Cell</p>
        <button onClick={handleEnd}>
          <span className="text-red-500 text-sm font-medium">End Session</span>
        </button>
      </div>

      <p className="text-sm text-center font-medium" style={{ color: ACCENT }}>
        {sessionCount} {sessionCount === 1 ? 'person' : 'people'} prayed this session
      </p>

      {/* TOP HALF — current activity */}
      <div className="flex-1 basis-0 min-h-0 flex flex-col px-4 pt-4">
        <div className="water-tile-static water-tile-blue flex-1 flex flex-col items-center justify-center px-6 py-4">
          <AnimatePresence mode="wait">
            {phase === 'waiting' && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
                style={{ position: 'relative', zIndex: 1 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(192,96,63,0.1)', border: `2px solid rgba(192,96,63,0.3)` }}
                >
                  <Mic size={32} color={ACCENT} strokeWidth={1.5} />
                </motion.div>
                <p className="text-base font-semibold mt-4 text-center" style={{ color: '#163449' }}>
                  Waiting for someone to join...
                </p>
                <p className="text-sm text-center mt-1.5" style={{ color: '#6B7680' }}>Your room is live 🔴</p>
              </motion.div>
            )}

            {phase === 'praying' && guest && (
              <motion.div
                key="praying"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
                style={{ position: 'relative', zIndex: 1 }}
              >
                <div className="relative mb-4">
                  <SoundWave />
                  <div className="w-[64px] h-[64px] rounded-full overflow-hidden relative z-10">
                    <Avatar user={guest} size="lg" />
                  </div>
                </div>
                <p className="text-sm font-semibold" style={{ color: '#163449' }}>{guest.name} has joined for prayer</p>

                <div className="relative mt-4 flex items-center justify-center">
                  <svg width="88" height="88" className="-rotate-90">
                    <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(22,52,73,0.08)" strokeWidth="4" />
                    <circle
                      cx="44" cy="44" r="38" fill="none"
                      stroke={ACCENT} strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={2 * Math.PI * 38 * (1 - progress)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold" style={{ color: '#163449' }}>{timeLeft}</span>
                </div>
                <p className="text-sm mt-2" style={{ color: '#6B7680' }}>Praying for {guest.name}</p>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
                style={{ position: 'relative', zIndex: 1 }}
              >
                <p className="text-xl font-bold text-center" style={{ color: '#163449' }}>Prayer Complete 🙏</p>
                <p className="text-sm text-center mt-1.5" style={{ color: '#6B7680' }}>
                  {sessionCount} {sessionCount === 1 ? 'person' : 'people'} prayed with you
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePrayNext}
                  className="mt-5 px-7 py-3 rounded-full text-white font-semibold text-sm"
                  style={{ background: ACCENT }}
                >
                  Pray for Next Person
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* BOTTOM HALF — joined this session */}
      <div className="flex-1 basis-0 min-h-0 flex flex-col px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 flex-shrink-0" style={{ color: '#6B7680' }}>
          Joined this session
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {sessionGuests.length === 0 ? (
            <p className="text-sm mt-4 text-center" style={{ color: '#9AA6AD' }}>No one has joined yet</p>
          ) : (
            <div className="space-y-2">
              {[...sessionGuests].reverse().map((g, i) => (
                <div key={g.joinedAt + '-' + i} className="water-tile-static water-tile-blue flex items-center gap-3 px-3 py-2.5">
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Avatar user={g} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0" style={{ position: 'relative', zIndex: 1 }}>
                    <p className="text-sm font-semibold truncate" style={{ color: '#163449' }}>{g.name}</p>
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: '#6B7680', position: 'relative', zIndex: 1 }}>
                    {new Date(g.joinedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mute */}
      <div className="flex justify-center pt-2" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: isMuted ? 'rgba(239,68,68,0.12)' : '#FFFFFF',
            border: isMuted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(22,52,73,0.12)',
            boxShadow: '0 4px 12px rgba(20,40,60,0.1)',
          }}
        >
          {isMuted
            ? <MicOff size={22} color="#ef4444" strokeWidth={1.8} />
            : <Mic size={22} color="#163449" strokeWidth={1.8} />
          }
        </motion.button>
      </div>
    </div>
  );
}

function SoundWave() {
  const bars = [14, 20, 10, 18, 12];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-1">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [4, h, 4] }}
            transition={{ duration: 0.8 + i * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
            className="w-1 rounded-full opacity-60"
            style={{ height: 4, background: ACCENT }}
          />
        ))}
      </div>
    </div>
  );
}
