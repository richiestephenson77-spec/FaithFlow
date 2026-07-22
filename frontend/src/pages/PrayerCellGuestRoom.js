import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { usePrayerCellAudio } from '../hooks/usePrayerCellAudio';
import Avatar from '../components/Avatar';

const BG = '#0A0F1E';
const PRAYER_DURATION = 60;

export default function PrayerCellGuestRoom() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { socket } = useSocket();
  const { getLocalStream, handleOffer, handleAnswer, handleIce, endCall, toggleMute } = usePrayerCellAudio();

  const host = state?.host || { name: state?.hostName || 'Host', profilePhoto: state?.hostPhoto };

  const [status, setStatus] = useState('connecting'); // connecting | connected | complete | ended | disconnected
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PRAYER_DURATION);

  const streamRef = useRef(null);
  const timerRef = useRef(null);

  function startTimer() {
    setStatus('connected');
    setTimeLeft(PRAYER_DURATION);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setStatus('complete');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // Set up listeners FIRST, then emit cell:join
  useEffect(() => {
    if (!socket || !cellId) return;

    async function onOffer({ offer, fromSocketId }) {
      try {
        // Get mic on demand — ensures it's ready before answering
        const stream = streamRef.current || await getLocalStream();
        streamRef.current = stream;
        await handleOffer(offer, fromSocketId, socket, stream);
        startTimer();
      } catch (err) {
        console.error('[Guest] handleOffer error:', err);
      }
    }

    function onAnswer({ answer }) { handleAnswer(answer); }
    function onIce({ candidate }) { handleIce(candidate); }

    function onEnded() {
      clearInterval(timerRef.current);
      setStatus('ended');
      endCall();
    }

    function onDisconnected() {
      clearInterval(timerRef.current);
      setStatus('disconnected');
      endCall();
    }

    // Listeners first
    socket.on('cell:offer', onOffer);
    socket.on('cell:answer', onAnswer);
    socket.on('cell:ice', onIce);
    socket.on('cell:ended', onEnded);
    socket.on('cell:peer_disconnected', onDisconnected);

    // Then join
    socket.emit('cell:join', { cellId });

    // Pre-fetch mic in background so it's ready when offer arrives
    getLocalStream()
      .then(stream => { streamRef.current = stream; })
      .catch(err => console.error('[Guest] mic error:', err));

    return () => {
      socket.off('cell:offer', onOffer);
      socket.off('cell:answer', onAnswer);
      socket.off('cell:ice', onIce);
      socket.off('cell:ended', onEnded);
      socket.off('cell:peer_disconnected', onDisconnected);
      endCall();
      clearInterval(timerRef.current);
    };
  }, [socket, cellId]); // eslint-disable-line

  async function handleLeave() {
    try { await api.post(`/prayer-cells/${cellId}/leave`); } catch {}
    if (socket) socket.emit('cell:guest_left', { cellId });
    endCall();
    clearInterval(timerRef.current);
    navigate('/prayer-cells');
  }

  function handleMute() { setIsMuted(toggleMute()); }

  const circumference = 2 * Math.PI * 44;
  const progress = timeLeft / PRAYER_DURATION;

  return (
    <div className="h-full flex flex-col" style={{ background: BG }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div />
        <p className="text-white font-semibold text-base">Prayer with {host.name}</p>
        <button onClick={handleLeave}>
          <span className="text-red-400 text-sm font-medium">Leave</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {(status === 'connecting' || status === 'connected') && (
            <motion.div
              key="praying"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-6">
                {status === 'connected' && <HostSoundWave />}
                <div
                  className="w-20 h-20 rounded-full overflow-hidden relative z-10"
                  style={{ boxShadow: '0 0 0 3px #2C4055' }}
                >
                  <Avatar user={host} size="lg" />
                </div>
              </div>

              <p className="text-white font-bold text-xl text-center">{host.name}</p>

              {host.isVerifiedPastor && (
                <span className="mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(44,64,85,0.2)', color: '#0A0A0A' }}>
                  ✝️ Pastor
                </span>
              )}

              <div className="flex items-center gap-2 mt-4">
                {status === 'connecting' ? (
                  <>
                    <Loader size={14} color="#0A0A0A" className="animate-spin" />
                    <p className="text-terracotta-400 text-sm">Connecting...</p>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <p className="text-emerald-400 text-sm">Connected · Audio live</p>
                  </>
                )}
              </div>

              {status === 'connected' && (
                <>
                  <div className="relative mt-8 flex items-center justify-center">
                    <svg width="100" height="100" className="-rotate-90">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                      <circle
                        cx="50" cy="50" r="44" fill="none"
                        stroke="#0A0A0A" strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="absolute text-white text-2xl font-bold">{timeLeft}</span>
                  </div>
                  <p className="text-gray-300 text-sm text-center mt-3">{host.name} is praying for you</p>
                </>
              )}
            </motion.div>
          )}

          {status === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full"
            >
              <p className="text-white text-xl font-bold text-center">
                {host.name} has prayed for you 🙏
              </p>
              <p className="text-gray-400 text-sm text-center mt-2">May God bless you today</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLeave}
                className="mt-8 w-full py-3.5 rounded-full text-white font-semibold text-sm"
                style={{ background: '#2C4055' }}
              >
                Leave Room
              </motion.button>
            </motion.div>
          )}

          {(status === 'ended' || status === 'disconnected') && (
            <motion.div
              key="ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <p className="text-white text-lg font-semibold text-center">
                {status === 'disconnected' ? 'Connection lost' : 'Host ended the session'}
              </p>
              <p className="text-gray-400 text-sm text-center mt-2">Thank you for joining 🙏</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLeave}
                className="mt-8 px-8 py-3.5 rounded-full text-white font-semibold text-sm"
                style={{ background: '#2C4055' }}
              >
                Back to Prayer Cells
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mute */}
      <div className="flex justify-center" style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
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

function HostSoundWave() {
  const bars = [12, 20, 8, 16, 10, 18, 6];
  return (
    <div className="absolute inset-[-16px] flex items-center justify-center z-0">
      <div className="flex items-center gap-1">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [4, h, 4] }}
            transition={{ duration: 0.7 + i * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
            className="w-1 rounded-full bg-terracotta-400 opacity-40"
            style={{ height: 4 }}
          />
        ))}
      </div>
    </div>
  );
}
