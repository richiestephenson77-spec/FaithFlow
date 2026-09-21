import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Hand, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { hapticLight, hapticMedium } from '../utils/haptics';
import {
  Eyebrow, PrimaryButton, OutlineButton, RoomAvatar,
  INK, MUTED, HAIRLINE, LEAVE, ACCENT,
} from '../components/prayerRooms/RoomUI';

// The live room.
//
// STATE OF PLAY: no media provider is integrated, so `POST /join` answers 503
// MEDIA_PROVIDER_NOT_CONFIGURED and this screen settles in `unavailable`. That
// state is rendered plainly — the room, its people and its linked requests are
// all real, and the page says outright that audio is not connected. It does
// NOT pretend: no fake waveform, no invented participants, no "connected"
// label, and no attendance is written from opening this screen.
//
// Every other state below is implemented against the adapter contract in
// services/mediaProvider.js and becomes reachable the moment a concrete
// adapter exists. They are wired, not decorative.
const STATE = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  DENIED: 'denied',            // the user refused microphone access
  UNAVAILABLE: 'unavailable',  // no provider configured
  ERROR: 'error',
};

export default function PrayerRoomLive() {
  const { occurrenceId } = useParams();
  const navigate = useNavigate();

  const [occ, setOcc] = useState(null);
  const [state, setState] = useState(STATE.CONNECTING);
  const [detail, setDetail] = useState(null);
  const [role, setRole] = useState('LISTENER');
  // Muted by default, always. Nothing here opens a microphone on its own —
  // a track is only ever requested by an explicit user action.
  const [muted, setMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const localStreamRef = useRef(null);
  const leftRef = useRef(false);

  /**
   * Release the microphone and tell the server we left.
   *
   * Runs on unmount as well as on the Leave button, because navigating back
   * must never leave a live capture running invisibly.
   */
  const teardown = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    api.post(`/prayer-rooms/occurrences/${occurrenceId}/leave`, {}).catch(() => {});
  }, [occurrenceId]);

  useEffect(() => teardown, [teardown]);

  // Also covers the tab being closed mid-session.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') localStreamRef.current?.getTracks().forEach(t => t.stop()); };
    window.addEventListener('pagehide', teardown);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', teardown);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [teardown]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await api.get(`/prayer-rooms/occurrences/${occurrenceId}`);
        if (cancelled) return;
        setOcc(info.data);

        // Server checks permission FIRST, then mints a scoped media token.
        const res = await api.post(`/prayer-rooms/occurrences/${occurrenceId}/join`, {});
        if (cancelled) return;
        setRole(res.data.role || 'LISTENER');
        // A concrete adapter connects here with res.data.token / res.data.url
        // and drives setState from its own connection events.
        setState(STATE.CONNECTED);
      } catch (err) {
        if (cancelled) return;
        const code = err.response?.data?.code;
        if (code === 'MEDIA_PROVIDER_NOT_CONFIGURED') {
          setRole(err.response?.data?.role || 'LISTENER');
          setState(STATE.UNAVAILABLE);
        } else {
          setDetail(err.friendlyMessage || err.response?.data?.error || 'Could not join this session');
          setState(STATE.ERROR);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [occurrenceId]);

  function leave() {
    if (leaving) return;
    setLeaving(true);
    hapticMedium();
    teardown();
    navigate(`/prayer-rooms/${occurrenceId}`);
  }

  /**
   * Unmuting is the ONLY path that asks for the microphone, and only after the
   * user taps. A denial is a state, not an error to swallow.
   */
  async function toggleMute() {
    hapticLight();
    if (!muted) {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
      setMuted(true);
      return;
    }
    try {
      if (!localStreamRef.current) {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
      setMuted(false);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') setState(STATE.DENIED);
      else setDetail('Could not open your microphone');
    }
  }

  const title = occ?.title || 'Prayer room';
  const canSpeak = role === 'HOST' || role === 'COHOST' || role === 'SPEAKER';
  const audioReady = state === STATE.CONNECTED;

  return (
    <div className="flex flex-col h-full" style={{ background: '#FFFFFF', color: INK }}>
      <div
        className="px-5 flex-1 overflow-y-auto"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <Eyebrow live={audioReady}>
          {audioReady ? 'Live prayer · Audio only' : 'Prayer room · Audio only'}
        </Eyebrow>

        <h1 className="type-heading" style={{ fontSize: 28, margin: '16px 0 6px' }}>{title}</h1>
        {occ?.host && (
          <p style={{ fontSize: 13, color: MUTED }}>Hosted by {occ.host.name}</p>
        )}

        <ConnectionBanner state={state} detail={detail} onRetry={() => window.location.reload()} />

        {/* People. Only ever real, server-confirmed participants — with no
            provider there are none, and the room says so rather than
            inventing a grid of faces. */}
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED, marginBottom: 12 }}>
            In the room
          </h2>
          {audioReady && occ?.connectedCount > 0 ? (
            <p style={{ fontSize: 13, color: MUTED }}>
              {occ.connectedCount} connected
            </p>
          ) : (
            <div className="flex items-center gap-2.5">
              <RoomAvatar user={{ name: 'You' }} size={44} />
              <div>
                <p style={{ fontSize: 13.5 }}>You</p>
                <p style={{ fontSize: 12, color: MUTED }}>
                  {role === 'HOST' ? 'Host' : role === 'COHOST' ? 'Co-host' : 'Listening'}
                  {' · '}{muted ? 'Microphone off' : 'Microphone on'}
                </p>
              </div>
            </div>
          )}
        </section>

        {occ?.linkedRequests?.length > 0 && (
          <section style={{ marginTop: 26 }}>
            <div style={{ background: '#F7F6F3', borderRadius: 14, padding: 18 }}>
              <Eyebrow>Praying for now</Eyebrow>
              <h3 style={{ fontSize: 16, fontWeight: 500, margin: '8px 0 4px' }}>
                {occ.linkedRequests[0].title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>{occ.linkedRequests[0].body}</p>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
                {occ.linkedRequests[0].author
                  ? `Shared by ${occ.linkedRequests[0].author.name}`
                  : 'Shared anonymously'}
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Controls */}
      <div
        className="px-5"
        style={{
          borderTop: `1px solid ${HAIRLINE}`, paddingTop: 14,
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
        }}
      >
        {canSpeak ? (
          <PrimaryButton
            full
            disabled={!audioReady}
            onClick={toggleMute}
            style={{ background: muted ? ACCENT : '#0A0A0A' }}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              {muted ? <MicOff size={17} strokeWidth={1.9} /> : <Mic size={17} strokeWidth={1.9} />}
              {muted ? 'Unmute to pray aloud' : 'Mute'}
            </span>
          </PrimaryButton>
        ) : (
          <PrimaryButton
            full
            disabled={!audioReady}
            aria-pressed={handRaised}
            onClick={() => { hapticLight(); setHandRaised(v => !v); }}
            style={handRaised ? { background: '#FFFFFF', color: ACCENT, border: '1px solid #E6E8EB' } : undefined}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <Hand size={17} strokeWidth={1.9} />
              {handRaised ? 'Hand raised · Tap to lower' : 'Raise hand to speak'}
            </span>
          </PrimaryButton>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginTop: 10 }}>
          {audioReady
            ? (muted ? 'Your microphone is off' : 'Your microphone is on')
            : 'Your microphone is off'}
        </p>

        <button
          onClick={leave}
          disabled={leaving}
          className="w-full"
          style={{ minHeight: 44, color: LEAVE, fontSize: 14, marginTop: 4, background: 'none', border: 0 }}
        >
          Leave quietly
        </button>
      </div>
    </div>
  );
}

/**
 * One honest line about the connection. The unavailable case is the one that
 * actually renders today, and it is deliberately unambiguous: the feature is
 * not finished, rather than broken or failing.
 */
function ConnectionBanner({ state, detail, onRetry }) {
  if (state === STATE.CONNECTED) return null;

  const base = {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    borderRadius: 12, padding: '12px 14px', marginTop: 18, fontSize: 13, lineHeight: 1.45,
  };

  if (state === STATE.CONNECTING) {
    return (
      <div style={{ ...base, background: '#F7F6F3', color: MUTED }} role="status">
        <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Connecting to the room…</span>
      </div>
    );
  }
  if (state === STATE.RECONNECTING) {
    return (
      <div style={{ ...base, background: '#F7F6F3', color: MUTED }} role="status">
        <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Connection lost — trying to reconnect…</span>
      </div>
    );
  }
  if (state === STATE.UNAVAILABLE) {
    return (
      <div style={{ ...base, background: '#F7F6F3', color: INK }} role="status">
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: MUTED }} />
        <span>
          <b style={{ fontWeight: 500 }}>Live audio isn't available yet.</b>{' '}
          <span style={{ color: MUTED }}>
            Group audio is still being set up, so nobody is connected by voice.
            The session, its time and its prayer requests are all real — you
            just can't speak or listen here yet.
          </span>
        </span>
      </div>
    );
  }
  if (state === STATE.DENIED) {
    return (
      <div style={{ ...base, background: '#FBF3F2', color: INK }} role="alert">
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: LEAVE }} />
        <span>
          <b style={{ fontWeight: 500 }}>Microphone blocked.</b>{' '}
          <span style={{ color: MUTED }}>
            You can still listen. To pray aloud, allow microphone access for
            FaithFlow in your browser or device settings.
          </span>
        </span>
      </div>
    );
  }
  if (state === STATE.DISCONNECTED) {
    return (
      <div style={{ ...base, background: '#FBF3F2', color: INK, flexWrap: 'wrap' }} role="alert">
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: LEAVE }} />
        <span style={{ flex: 1 }}>Disconnected from the room.</span>
        <OutlineButton onClick={onRetry} style={{ minHeight: 36, padding: '6px 12px' }}>Reconnect</OutlineButton>
      </div>
    );
  }
  return (
    <div style={{ ...base, background: '#FBF3F2', color: INK, flexWrap: 'wrap' }} role="alert">
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: LEAVE }} />
      <span style={{ flex: 1 }}>{detail || 'Something went wrong joining this session.'}</span>
      <OutlineButton onClick={onRetry} style={{ minHeight: 36, padding: '6px 12px' }}>Try again</OutlineButton>
    </div>
  );
}
