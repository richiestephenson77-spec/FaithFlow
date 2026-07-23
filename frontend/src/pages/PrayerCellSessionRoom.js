import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { hapticMedium } from '../utils/haptics';
import { usePrayerCellMeshAudio } from '../hooks/usePrayerCellMeshAudio';

const LIVE_RED = '#ED4956';

function ParticipantTile({ user, label, connecting }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-full p-[3px]" style={{ background: connecting ? '#D8DEE4' : LIVE_RED }}>
        <div className="rounded-full p-[2px] bg-white">
          <div className="rounded-full overflow-hidden" style={{ width: 72, height: 72 }}>
            <Avatar user={user} size="lg" />
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold text-center leading-tight" style={{ color: '#0A0A0A' }}>
        {label}
      </p>
      {connecting && <p className="text-[11px]" style={{ color: '#8E8E8E' }}>connecting…</p>}
    </div>
  );
}

export default function PrayerCellSessionRoom() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const showToast = useToast();
  const mesh = usePrayerCellMeshAudio();

  const cellName = location.state?.name || 'Live Prayer';
  const [peers, setPeers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const leftRef = useRef(false);

  useEffect(() => {
    if (!socket) return;
    let active = true;
    (async () => {
      try {
        await api.post(`/prayer-cells/${cellId}/session/start`);
        if (!active) return;
        await mesh.join({ socket, cellId, user, onPeersChange: setPeers });
        if (!active) return;
        setJoined(true);
      } catch (err) {
        if (err?.name === 'NotAllowedError') showToast('Microphone permission is needed to pray live', 'error');
        else showToast(err?.friendlyMessage || 'Could not join the live session', 'error');
        doLeave();
      }
    })();
    return () => {
      active = false;
      if (!leftRef.current) {
        mesh.leave();
        api.post(`/prayer-cells/${cellId}/session/leave`).catch(() => {});
      }
    };
  }, [socket, cellId]);

  function doLeave() {
    if (leftRef.current) { navigate(-1); return; }
    leftRef.current = true;
    hapticMedium();
    mesh.leave();
    api.post(`/prayer-cells/${cellId}/session/leave`).catch(() => {});
    navigate(-1);
  }

  function onToggleMute() {
    hapticMedium();
    setMuted(mesh.toggleMute());
  }

  const others = peers.length;
  const total = others + 1;

  return (
    <div className="flex flex-col h-full" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 text-center flex-shrink-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2" style={{ background: 'rgba(237,73,86,0.1)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LIVE_RED }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: LIVE_RED }}>Live</span>
        </div>
        <h1 className="text-xl font-bold leading-tight" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>{cellName}</h1>
        <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>
          {total} {total === 1 ? 'person' : 'people'} praying together
        </p>
      </div>

      {/* Participant grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2C4055', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: '#8E8E8E' }}>Joining the prayer room…</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5 justify-items-center">
            <ParticipantTile user={user} label="You" />
            {peers.map(p => (
              <ParticipantTile
                key={p.socketId}
                user={p.user || { name: '…' }}
                label={p.user?.name?.split(' ')[0] || 'Believer'}
                connecting={p.state !== 'connected'}
              />
            ))}
            {others === 0 && (
              <div className="col-span-3 text-center mt-6">
                <p className="text-sm" style={{ color: '#8E8E8E' }}>Waiting for others to join…</p>
                <p className="text-xs mt-1" style={{ color: '#B0B0B0' }}>Share this cell so members can pray with you.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 pt-4 pb-8 flex-shrink-0" style={{ borderTop: '1px solid #EFEFEF' }}>
        <button
          onClick={onToggleMute}
          disabled={!joined}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex flex-col items-center gap-1.5 disabled:opacity-40"
        >
          <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: muted ? '#0A0A0A' : 'rgba(10,10,10,0.06)' }}>
            {muted ? <MicOff size={22} color="#fff" strokeWidth={2} /> : <Mic size={22} color="#0A0A0A" strokeWidth={2} />}
          </span>
          <span className="text-[11px] font-medium" style={{ color: '#5C6672' }}>{muted ? 'Muted' : 'Mute'}</span>
        </button>
        <button onClick={doLeave} aria-label="Leave" className="flex flex-col items-center gap-1.5">
          <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: LIVE_RED }}>
            <PhoneOff size={22} color="#fff" strokeWidth={2} />
          </span>
          <span className="text-[11px] font-medium" style={{ color: '#5C6672' }}>Leave</span>
        </button>
      </div>
    </div>
  );
}
