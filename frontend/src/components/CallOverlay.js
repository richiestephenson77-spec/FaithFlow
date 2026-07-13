import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import Avatar from './Avatar';
import { useDirectCall } from '../hooks/useDirectCall';

// Full 1:1 call lifecycle overlay. `call` describes intent:
//   outgoing: { direction: 'out', callType }
//   incoming: { direction: 'in', callType, fromUser, fromSocketId }
export default function CallOverlay({ socket, me, other, conversationId, call, onClose }) {
  const rtc = useDirectCall();
  const [status, setStatus] = useState(call.direction === 'out' ? 'calling' : 'ringing');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const peerSocketRef = useRef(call.direction === 'in' ? call.fromSocketId : null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const isVideo = call.callType === 'video';
  const person = call.direction === 'in' ? (call.fromUser || other) : other;

  function attachLocal() {
    const stream = rtc.localStreamRef.current;
    if (stream && localVideoRef.current) localVideoRef.current.srcObject = stream;
  }
  function attachRemote(stream) {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
  }

  function cleanup() { rtc.endCall(); }

  function close() { cleanup(); onClose(); }

  // Remote media → in-call
  useEffect(() => {
    rtc.onRemoteStream((stream) => { attachRemote(stream); setStatus('in-call'); });
    // eslint-disable-next-line
  }, []);

  // Outgoing: send the invite once
  useEffect(() => {
    if (call.direction === 'out' && socket) {
      socket.emit('call:invite', {
        toUserId: other.id,
        fromUser: { id: me.id, name: me.name, profilePhoto: me.profilePhoto },
        callType: call.callType,
        conversationId,
      });
    }
    // eslint-disable-next-line
  }, []);

  // Signaling
  useEffect(() => {
    if (!socket) return;

    async function onAccepted({ fromSocketId }) {
      peerSocketRef.current = fromSocketId;
      setStatus('connecting');
      try {
        const stream = await rtc.getLocalStream(isVideo);
        attachLocal();
        await rtc.makeOffer(fromSocketId, socket, stream);
      } catch { close(); }
    }
    async function onOffer({ offer, fromSocketId }) {
      peerSocketRef.current = fromSocketId;
      try {
        const stream = rtc.localStreamRef.current || await rtc.getLocalStream(isVideo);
        attachLocal();
        await rtc.handleOffer(offer, fromSocketId, socket, stream);
      } catch { close(); }
    }
    const onAnswer = ({ answer }) => rtc.handleAnswer(answer);
    const onIce = ({ candidate }) => rtc.handleIce(candidate);
    const onDeclined = () => close();
    const onCanceled = () => close();
    const onEnded = () => close();

    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:declined', onDeclined);
    socket.on('call:canceled', onCanceled);
    socket.on('call:ended', onEnded);
    return () => {
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:declined', onDeclined);
      socket.off('call:canceled', onCanceled);
      socket.off('call:ended', onEnded);
    };
    // eslint-disable-next-line
  }, []);

  async function accept() {
    setStatus('connecting');
    try {
      await rtc.getLocalStream(isVideo);
      attachLocal();
    } catch { decline(); return; }
    socket.emit('call:accept', { toSocketId: call.fromSocketId, fromUser: { id: me.id, name: me.name } });
  }
  function decline() {
    socket.emit('call:decline', { toSocketId: call.fromSocketId });
    close();
  }
  function hangUp() {
    if (call.direction === 'out' && status === 'calling') {
      socket.emit('call:cancel', { toUserId: other.id });
    } else if (peerSocketRef.current) {
      socket.emit('call:end', { toSocketId: peerSocketRef.current });
    }
    close();
  }

  const statusText = status === 'calling' ? 'Calling…'
    : status === 'ringing' ? `Incoming ${isVideo ? 'video ' : ''}call`
    : status === 'connecting' ? 'Connecting…'
    : 'Connected';

  const showRemoteVideo = isVideo && status === 'in-call';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between" style={{ background: '#0A0F1E' }}>
      {/* Remote video fills screen for video calls */}
      {showRemoteVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      {/* Remote audio always present (drives sound for audio calls) */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Local video PiP */}
      {isVideo && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute top-6 right-4 w-24 h-32 object-cover rounded-2xl border-2 border-white/20 z-10"
          style={{ background: '#111', transform: 'scaleX(-1)', opacity: videoOff ? 0.2 : 1 }} />
      )}

      {/* Identity + status (hidden behind video once connected) */}
      <div className={`flex flex-col items-center gap-4 pt-24 ${showRemoteVideo ? 'opacity-0' : ''}`} style={{ zIndex: 2 }}>
        <div className="scale-[2.2]"><Avatar user={person} size="lg" /></div>
        <div className="text-center mt-6">
          <p className="text-white text-2xl font-semibold">{person?.name || '…'}</p>
          <p className="text-white/60 text-sm mt-1">{statusText}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="pb-16 flex items-center gap-5" style={{ zIndex: 2 }}>
        {status === 'ringing' ? (
          <>
            <button onClick={decline} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
              <PhoneOff size={26} color="#fff" />
            </button>
            <button onClick={accept} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
              {isVideo ? <Video size={26} color="#fff" /> : <Phone size={26} color="#fff" />}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setMuted(rtc.toggleMute())}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: muted ? '#fff' : 'rgba(255,255,255,0.15)' }}
            >
              {muted ? <MicOff size={22} color="#0A0F1E" /> : <Mic size={22} color="#fff" />}
            </button>
            {isVideo && (
              <button
                onClick={() => setVideoOff(rtc.toggleVideo())}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: videoOff ? '#fff' : 'rgba(255,255,255,0.15)' }}
              >
                {videoOff ? <VideoOff size={22} color="#0A0F1E" /> : <Video size={22} color="#fff" />}
              </button>
            )}
            <button onClick={hangUp} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
              <PhoneOff size={26} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
