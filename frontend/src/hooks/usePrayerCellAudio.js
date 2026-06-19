import { useRef } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: process.env.REACT_APP_TURN_USERNAME || '6903730ea433392b8b066028',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'ArYgGPWsr7Q4sx5N',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: process.env.REACT_APP_TURN_USERNAME || '6903730ea433392b8b066028',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'ArYgGPWsr7Q4sx5N',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: process.env.REACT_APP_TURN_USERNAME || '6903730ea433392b8b066028',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'ArYgGPWsr7Q4sx5N',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: process.env.REACT_APP_TURN_USERNAME || '6903730ea433392b8b066028',
      credential: process.env.REACT_APP_TURN_CREDENTIAL || 'ArYgGPWsr7Q4sx5N',
    },
  ],
};

export function usePrayerCellAudio() {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(new Audio());

  async function getLocalStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }

  function createPeer(stream) {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.ontrack = (e) => {
      remoteAudioRef.current.srcObject = e.streams[0];
      remoteAudioRef.current.play().catch(() => {});
    };
    peerRef.current = peer;
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
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('cell:answer', { answer, targetSocketId: fromSocketId });
  }

  async function handleAnswer(answer) {
    await peerRef.current?.setRemoteDescription(answer);
  }

  async function handleIce(candidate) {
    try {
      await peerRef.current?.addIceCandidate(candidate);
    } catch {}
  }

  function endCall() {
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current = null;
    localStreamRef.current = null;
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
