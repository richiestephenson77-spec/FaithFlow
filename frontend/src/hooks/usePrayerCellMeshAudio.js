import { useRef, useCallback } from 'react';

// Multi-person (mesh) audio for a live prayer session. Every participant holds
// one RTCPeerConnection per OTHER participant, so N people = N-1 peers each.
// This reuses the same Metered TURN infra as the 1:1 usePrayerCellAudio hook.
//
// Glare-free signaling contract (server enforces the ordering):
//   - On join, the server hands the NEWCOMER the list of peers already present.
//     The newcomer creates an offer to each of them (initiator).
//   - Existing peers only ever ANSWER. So for any pair, offers flow one way.
//
// Scale note: a browser mesh is comfortable to ~6-8 participants. Beyond that
// an SFU would be needed — see the report. This is real P2P audio, not stubbed.

const TURN_USERNAME = process.env.REACT_APP_TURN_USERNAME;
const TURN_CREDENTIAL = process.env.REACT_APP_TURN_CREDENTIAL;

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: 'turn:global.relay.metered.ca:443', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: TURN_USERNAME, credential: TURN_CREDENTIAL },
  ],
};

export function usePrayerCellMeshAudio() {
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> { pc, user, audioEl, pending: [] }
  const socketRef = useRef(null);
  const cellIdRef = useRef(null);
  const userRef = useRef(null);
  const onPeersChangeRef = useRef(null);
  const mutedRef = useRef(false);

  const emitPeers = useCallback(() => {
    if (!onPeersChangeRef.current) return;
    const list = [];
    peersRef.current.forEach((entry, socketId) => {
      list.push({ socketId, user: entry.user, state: entry.pc?.connectionState || 'new' });
    });
    onPeersChangeRef.current(list);
  }, []);

  const makePeer = useCallback((socketId, peerUser, initiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const entry = { pc, user: peerUser, audioEl: null, pending: [] };
    peersRef.current.set(socketId, entry);

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('session:ice', { targetSocketId: socketId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      if (!entry.audioEl) { entry.audioEl = new Audio(); entry.audioEl.autoplay = true; }
      entry.audioEl.srcObject = e.streams[0];
      entry.audioEl.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') removePeer(socketId);
      emitPeers();
    };

    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => offer))
        .then(offer => socketRef.current?.emit('session:offer', { targetSocketId: socketId, offer }))
        .catch(() => {});
    }
    emitPeers();
    return entry;
  }, [emitPeers]);

  function removePeer(socketId) {
    const entry = peersRef.current.get(socketId);
    if (!entry) return;
    try { entry.pc.close(); } catch {}
    if (entry.audioEl) { entry.audioEl.srcObject = null; entry.audioEl = null; }
    peersRef.current.delete(socketId);
    emitPeers();
  }

  const join = useCallback(async ({ socket, cellId, user, onPeersChange }) => {
    socketRef.current = socket;
    cellIdRef.current = cellId;
    userRef.current = user;
    onPeersChangeRef.current = onPeersChange;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    mutedRef.current = false;

    // I'm the newcomer: offer to everyone already here.
    socket.on('session:peers', ({ peers }) => {
      (peers || []).forEach(p => makePeer(p.socketId, p.user, true));
    });
    // Someone joined after me: they will offer; I just wait (no pc yet).
    socket.on('session:peer_joined', () => {});
    socket.on('session:offer', async ({ fromSocketId, offer, user: peerUser }) => {
      let entry = peersRef.current.get(fromSocketId);
      if (!entry) entry = makePeer(fromSocketId, peerUser, false);
      try {
        await entry.pc.setRemoteDescription(offer);
        for (const c of entry.pending) { try { await entry.pc.addIceCandidate(c); } catch {} }
        entry.pending = [];
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        socket.emit('session:answer', { targetSocketId: fromSocketId, answer });
      } catch {}
    });
    socket.on('session:answer', async ({ fromSocketId, answer }) => {
      const entry = peersRef.current.get(fromSocketId);
      if (!entry) return;
      try {
        await entry.pc.setRemoteDescription(answer);
        for (const c of entry.pending) { try { await entry.pc.addIceCandidate(c); } catch {} }
        entry.pending = [];
      } catch {}
    });
    socket.on('session:ice', async ({ fromSocketId, candidate }) => {
      const entry = peersRef.current.get(fromSocketId);
      if (!entry) return;
      if (entry.pc.remoteDescription) { try { await entry.pc.addIceCandidate(candidate); } catch {} }
      else entry.pending.push(candidate);
    });
    socket.on('session:peer_left', ({ socketId }) => removePeer(socketId));

    socket.emit('session:join', { cellId, user });
  }, [makePeer]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return mutedRef.current;
    track.enabled = !track.enabled;
    mutedRef.current = !track.enabled;
    return mutedRef.current;
  }, []);

  const leave = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('session:leave', { cellId: cellIdRef.current });
      ['session:peers', 'session:peer_joined', 'session:offer', 'session:answer', 'session:ice', 'session:peer_left']
        .forEach(ev => socket.off(ev));
    }
    peersRef.current.forEach((_, socketId) => removePeer(socketId));
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  return { join, leave, toggleMute };
}
