import { useRef } from 'react';

// Reuses the same Metered TURN/STUN config as Prayer Cells. TURN credentials
// come from env only (see usePrayerCellAudio for the rationale).
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

// 1:1 direct audio/video call peer. Symmetric to usePrayerCellAudio but
// video-capable and driven by call:* socket events + a target socket id.
export function useDirectCall() {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const onRemoteStreamRef = useRef(null);

  async function getLocalStream(withVideo) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo ? { facingMode: 'user' } : false,
    });
    localStreamRef.current = stream;
    return stream;
  }

  function createPeer(stream, socket, targetSocketId) {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (onRemoteStreamRef.current) onRemoteStreamRef.current(e.streams[0]);
    };
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice', { candidate: e.candidate, toSocketId: targetSocketId });
    };
    peerRef.current = peer;
    pendingCandidatesRef.current = [];
    return peer;
  }

  function onRemoteStream(cb) { onRemoteStreamRef.current = cb; }

  async function makeOffer(targetSocketId, socket, stream) {
    const peer = createPeer(stream, socket, targetSocketId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('call:offer', { offer, toSocketId: targetSocketId });
  }

  async function handleOffer(offer, fromSocketId, socket, stream) {
    const peer = createPeer(stream, socket, fromSocketId);
    await peer.setRemoteDescription(offer);
    for (const c of pendingCandidatesRef.current) { try { await peer.addIceCandidate(c); } catch {} }
    pendingCandidatesRef.current = [];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('call:answer', { answer, toSocketId: fromSocketId });
  }

  async function handleAnswer(answer) {
    await peerRef.current?.setRemoteDescription(answer);
    for (const c of pendingCandidatesRef.current) { try { await peerRef.current.addIceCandidate(c); } catch {} }
    pendingCandidatesRef.current = [];
  }

  async function handleIce(candidate) {
    const peer = peerRef.current;
    if (peer?.remoteDescription) {
      try { await peer.addIceCandidate(candidate); } catch {}
    } else {
      pendingCandidatesRef.current.push(candidate);
    }
  }

  function endCall() {
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return !track.enabled; }
    return false;
  }

  function toggleVideo() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return !track.enabled; }
    return false;
  }

  return {
    getLocalStream, makeOffer, handleOffer, handleAnswer, handleIce,
    endCall, toggleMute, toggleVideo, onRemoteStream,
    localStreamRef, remoteStreamRef,
  };
}
