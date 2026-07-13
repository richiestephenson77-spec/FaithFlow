import { useRef } from 'react';

// TURN credentials come from env only — never hardcode them. These are
// exposed to the browser by necessity (WebRTC needs them client-side),
// which is why they live behind REACT_APP_ vars and must be rotatable.
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

export function usePrayerCellAudio() {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(new Audio());
  const pendingCandidatesRef = useRef([]);

  async function getLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please allow mic access and try again.');
      } else if (err.name === 'NotFoundError') {
        alert('No microphone found on this device.');
      } else {
        alert('Could not access microphone: ' + err.message);
      }
      throw err;
    }
  }

  function createPeer(stream) {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.ontrack = (e) => {
      remoteAudioRef.current.srcObject = e.streams[0];
      remoteAudioRef.current.play().catch(() => {});
    };
    // Debug logging
    peer.onconnectionstatechange = () => {
      console.log('[WebRTC] connection state:', peer.connectionState);
    };
    peer.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', peer.iceConnectionState);
    };
    peerRef.current = peer;
    pendingCandidatesRef.current = [];
    return peer;
  }

  async function makeOffer(targetSocketId, socket, stream) {
    const peer = createPeer(stream);
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit('cell:ice', { candidate: e.candidate, targetSocketId });
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('cell:offer', { offer, targetSocketId });
  }

  async function handleOffer(offer, fromSocketId, socket, stream) {
    const peer = createPeer(stream);
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit('cell:ice', { candidate: e.candidate, targetSocketId: fromSocketId });
    };
    await peer.setRemoteDescription(offer);
    // Flush any candidates that arrived before remote description
    for (const c of pendingCandidatesRef.current) {
      try { await peer.addIceCandidate(c); } catch {}
    }
    pendingCandidatesRef.current = [];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('cell:answer', { answer, targetSocketId: fromSocketId });
  }

  async function handleAnswer(answer) {
    await peerRef.current?.setRemoteDescription(answer);
    // Flush pending ICE candidates
    for (const c of pendingCandidatesRef.current) {
      try { await peerRef.current.addIceCandidate(c); } catch {}
    }
    pendingCandidatesRef.current = [];
  }

  async function handleIce(candidate) {
    const peer = peerRef.current;
    if (peer?.remoteDescription) {
      try { await peer.addIceCandidate(candidate); } catch {}
    } else {
      // Buffer until remote description is set
      pendingCandidatesRef.current.push(candidate);
    }
  }

  function endCall() {
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current = null;
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        return !track.enabled;
      }
    }
    return false;
  }

  return { getLocalStream, makeOffer, handleOffer, handleAnswer, handleIce, endCall, toggleMute };
}
