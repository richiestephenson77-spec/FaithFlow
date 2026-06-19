import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { usePrayerCellAudio } from '../hooks/usePrayerCellAudio';
import Avatar from '../components/Avatar';

const BG = '#0A0F1E';
const PRAYER_DURATION = 60;

export default function PrayerCellHostRoom() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { getLocalStream, makeOffer, handleAnswer, handleIce, endCall, toggleMute } = usePrayerCellAudio();

  const [phase, setPhase] = useState('waiting'); // waiting | praying | complete
  const [guest, setGuest] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PRAYER_DURATION);
  const [micError, setMicError] = useState(false);

  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const guestSocketRef = useRef(null);

  // Init mic + host socket room
  useEffect(() => {
    let active = true;
    getLocalStream()
      .then(stream => { if (active) streamRef.current = stream; })
      .catch(() => setMicError(true));

    if (socket) socket.emit('cell:host', { cellId });

    return () => {
      active = false;
      endCall();
      clearInterval(timerRef.current);
    };
  }, [cellId]); // eslint-disable-line

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    async function onGuestJoined({ guestSocketId }) {
      guestSocketRef.current = guestSocketId;
      if (streamRef.current) {
        await makeOffer(guestSocketId, socket, streamRef.current);
      }
    }

    function onAnswer({ answer }) { handleAnswer(answer); }
    function onIce({ candidate }) { handleIce(candidate); }

    function onGuestLeft() {
      setSessionCount(c => c + 1);
      setPhase('complete');
      clearInterval(timerRef.current);
      setGuest(null);
      guestSocketRef.current = null;
    }

    function onPeerDisconnected() { onGuestLeft(); }

    socket.on('cell:guest_joined', onGuestJoined);
    socket.on('cell:answer', onAnswer);
    socket.on('cell:ice', onIce);
    socket.on('cell:guest_left', onGuestLeft);
    socket.on('cell:peer_disconnected', onPeerDisconnected);

    return () => {
      socket.off('cell:guest_joined', onGuestJoined);
      socket.off('cell:answer', onAnswer);
      socket.off('cell:ice', onIce);
      socket.off('cell:guest_left', onGuestLeft);
      socket.off('cell:peer_disconnected', onPeerDisconnected);
    };
  }, [socket]); // eslint-disable-line

  // When guest joins, set praying phase + start timer
  const startPraying = useCallback((guestData) => {
    setGuest(guestData);
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
  }, []);

  // We don't have guest profile in socket event — just show anonymous for now
  // (in production you'd fetch from the API)
  useEffect(() => {
    if (!socket) return;
    function onGuestJoinedForUI() { startPraying({ name: 'Someone', profilePhoto: null }); }
    socket.on('cell:guest_joined', onGuestJoinedForUI);
    return () => socket.off('cell:guest_joined', onGuestJoinedForUI);
  }, [socket, startPraying]);

  async function handleEnd() {
    try { await api.post(`/prayer-cells/${cellId}/end`); } catch {}
    if (socket) socket.emit('cell:ended', { cellId });
    endCall();
    navigate('/prayer-cells');
  }

  function handleMute() {
    const muted = toggleMute();
    setIsMuted(muted);
  }

  function handlePrayNext() {
    setPhase('waiting');
    setGuest(null);
    setTimeLeft(PRAYER_DURATION);
  }

  const circumference = 2 * Math.PI * 44;
  const progress = timeLeft / PRAYER_DURATION;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div />
        <p className="text-white font-semibold text-base">Your Prayer Cell</p>
        <button onClick={handleEnd}>
          <span className="text-red-400 text-sm font-medium">End Session</span>
        </button>
      </div>

      {/* Session count */}
      <p className="text-amber-400 text-sm text-center font-medium">
        {sessionCount} {sessionCount === 1 ? 'person' : 'people'} prayed this session
      </p>

      {micError && (
        <p className="text-red-400 text-xs text-center mt-2">Mic access denied — audio unavailable</p>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)' }}
              >
                <Mic size={40} color="#f59e0b" strokeWidth={1.5} />
              </motion.div>
              <p className="text-white text-lg font-semibold mt-6 text-center">
                Waiting for someone to join...
              </p>
              <p className="text-gray-400 text-sm text-center mt-2">Your room is live 🔴</p>
            </motion.div>
          )}

          {phase === 'praying' && guest && (
            <motion.div
              key="praying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Guest avatar with sound wave */}
              <div className="relative mb-6">
                <SoundWave />
                <div className="w-[72px] h-[72px] rounded-full overflow-hidden relative z-10">
                  <Avatar user={guest} size="lg" />
                </div>
              </div>
              <p className="text-white text-base font-semibold">
                {guest.name} has joined for prayer
              </p>

              {/* Circular timer */}
              <div className="relative mt-8 flex items-center justify-center">
                <svg width="100" height="100" className="-rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="#f59e0b" strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="absolute text-white text-2xl font-bold">{timeLeft}</span>
              </div>
              <p className="text-gray-400 text-sm mt-3">Praying for {guest.name}</p>
            </motion.div>
          )}

          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <p className="text-white text-2xl font-bold text-center">Prayer Complete 🙏</p>
              <p className="text-gray-400 text-sm text-center mt-2">
                {sessionCount} {sessionCount === 1 ? 'person' : 'people'} prayed with you
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePrayNext}
                className="mt-8 px-8 py-3.5 rounded-full text-white font-semibold text-sm"
                style={{ background: '#f59e0b' }}
              >
                Pray for Next Person
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mute button */}
      <div className="flex justify-center pb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleMute}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)' }}
        >
          {isMuted
            ? <MicOff size={24} color="#ef4444" strokeWidth={1.8} />
            : <Mic size={24} color="white" strokeWidth={1.8} />
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
            className="w-1 rounded-full bg-amber-400 opacity-60"
            style={{ height: 4 }}
          />
        ))}
      </div>
    </div>
  );
}
