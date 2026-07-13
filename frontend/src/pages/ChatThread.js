import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Play, Pause } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { WaterCard, WaterButton, WaterInput } from '../components/water';

function getTimeStr(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(s) {
  const sec = Math.max(0, Math.round(s || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const REACTION_OPTIONS = ['❤️', '🙏', '😂', '😮', '😢', '🔥'];
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 500;

// Instagram-style voice-note bubble: tap to play, progress bar, duration label
function VoiceBubble({ src, duration, isMe }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);

  const fg = isMe ? '#ffffff' : '#163449';
  const track = isMe ? 'rgba(255,255,255,0.35)' : 'rgba(22,52,73,0.15)';

  function toggle(e) {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause(); else a.play();
  }

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: 168 }}>
      <button onClick={toggle} className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 30, height: 30, background: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(22,52,73,0.1)' }}>
        {playing ? <Pause size={15} color={fg} fill={fg} /> : <Play size={15} color={fg} fill={fg} />}
      </button>
      <div className="flex-1 rounded-full" style={{ height: 3, background: track }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: fg, borderRadius: 999 }} />
      </div>
      <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: fg }}>
        {fmtDuration(playing || current ? current : duration)}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
        onTimeUpdate={e => {
          const a = e.target;
          setCurrent(a.currentTime);
          if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration);
        }}
      />
    </div>
  );
}

export default function ChatThread() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [pickerFor, setPickerFor] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const msgRefs = useRef({});
  const typingTimer = useRef(null);
  const lastTapRef = useRef({ id: null, time: 0 });
  const pressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStreamRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordStartRef = useRef(0);
  const cancelRecordRef = useRef(false);

  const loadMessages = useCallback(async () => {
    try {
      const [msgRes, convRes] = await Promise.all([
        api.get(`/messages/conversations/${conversationId}`),
        api.get('/messages/conversations'),
      ]);
      setMessages(msgRes.data);
      const convo = convRes.data.find(c => c.id === conversationId);
      if (convo) setOther(convo.other);
      api.put(`/messages/conversations/${conversationId}/read`).catch(() => {});
    } catch {}
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_conversation', conversationId);
    socket.on('message_received', (msg) => {
      setMessages(prev => [...prev, msg]);
      api.put(`/messages/conversations/${conversationId}/read`).catch(() => {});
    });
    socket.on('typing', ({ userName }) => setTypingUser(userName));
    socket.on('stop_typing', () => setTypingUser(null));
    socket.on('message:reaction', ({ messageId, emoji }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
    });
    socket.on('message:unsend', ({ messageId }) => {
      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, isDeleted: true, content: '', audioUrl: null, reaction: null, replyTo: null }
        : m));
    });
    socket.on('messages_read', ({ readerId }) => {
      // The other participant read the thread — mark my sent messages as seen
      if (readerId && readerId !== user?.id) {
        setMessages(prev => prev.map(m => (m.senderId === user?.id ? { ...m, isRead: true } : m)));
      }
    });
    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('message_received');
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('message:reaction');
      socket.off('message:unsend');
      socket.off('messages_read');
    };
  }, [socket, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  function handleInputChange(e) {
    setInput(e.target.value);
    if (socket) {
      socket.emit('typing', { conversationId, userName: user?.name });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socket.emit('stop_typing', { conversationId }), 1500);
    }
  }

  async function applyReaction(messageId, emoji) {
    setPickerFor(null);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
    try {
      await api.patch(`/messages/${messageId}/reaction`, { emoji });
    } catch {
      // Reload to recover the server's truth if the optimistic update failed
      loadMessages();
    }
  }

  function handleBubbleTap(m) {
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
    if (m.isDeleted) return;
    const now = Date.now();
    const { id, time } = lastTapRef.current;
    if (id === m.id && now - time < DOUBLE_TAP_MS) {
      lastTapRef.current = { id: null, time: 0 };
      applyReaction(m.id, m.reaction === '❤️' ? null : '❤️');
    } else {
      lastTapRef.current = { id: m.id, time: now };
    }
  }

  function startPress(m) {
    if (m.isDeleted) return;
    longPressFiredRef.current = false;
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setPickerFor(m.id);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    clearTimeout(pressTimerRef.current);
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    const replyToId = replyTo?.id || null;
    setInput('');
    setReplyTo(null);
    setSending(true);
    if (socket) socket.emit('stop_typing', { conversationId });
    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, { content, replyToId });
      setMessages(prev => [...prev, res.data]);
    } catch {}
    setSending(false);
  }

  async function unsend(messageId) {
    setPickerFor(null);
    setMessages(prev => prev.map(m => m.id === messageId
      ? { ...m, isDeleted: true, content: '', audioUrl: null, reaction: null, replyTo: null }
      : m));
    try {
      await api.patch(`/messages/${messageId}/unsend`);
    } catch {
      loadMessages(); // recover server truth on failure
    }
  }

  function scrollToMessage(id) {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background 0.3s';
      el.style.background = 'rgba(192,96,63,0.12)';
      setTimeout(() => { el.style.background = 'transparent'; }, 900);
    }
  }

  function snippetFor(m) {
    if (!m) return '';
    if (m.audioUrl) return '🎤 Voice message';
    return m.content?.length > 80 ? m.content.slice(0, 80) + '…' : m.content;
  }

  // ---- Voice messages (press-and-hold mic) ----
  async function sendAudio(blob, duration) {
    setSending(true);
    if (socket) socket.emit('stop_typing', { conversationId });
    try {
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `voice.${ext}`);
      fd.append('duration', String(duration));
      const res = await api.post(`/messages/conversations/${conversationId}/audio`, fd);
      setMessages(prev => [...prev, res.data]);
    } catch {}
    setSending(false);
  }

  async function startRecording() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      cancelRecordRef.current = false;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        recordStreamRef.current?.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        const duration = Math.round((Date.now() - recordStartRef.current) / 1000);
        setRecording(false);
        setRecordSeconds(0);
        if (cancelRecordRef.current || duration < 1) return;
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        sendAudio(blob, duration);
      };
      recordStartRef.current = Date.now();
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      setRecording(false); // mic permission denied / unavailable
    }
  }

  function stopRecording(cancel = false) {
    cancelRecordRef.current = cancel;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  }

  // Release anywhere ends the recording (press-and-hold pattern)
  useEffect(() => {
    if (!recording) return;
    const stop = () => stopRecording(false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [recording]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <WaterCard tone="blue" style={{ borderRadius: '0 0 20px 20px', padding: '16px' }} className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/messages')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,52,73,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {other && <Avatar user={other} size="sm" />}
        <div className="flex-1">
          <p className="font-bold text-sm leading-tight" style={{ color: '#163449' }}>{other?.name || '...'}</p>
        </div>
      </WaterCard>

      {/* Tap-away dismiss for the reaction picker */}
      {pickerFor && (
        <div className="fixed inset-0" style={{ zIndex: 10 }} onClick={() => setPickerFor(null)} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m, i) => {
          const isMe = m.senderId === user?.id || m.sender?.id === user?.id;
          const showTime = i === messages.length - 1 || messages[i + 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} ref={el => { if (el) msgRefs.current[m.id] = el; }} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {/* Quoted reply preview above the bubble */}
              {m.replyTo && (
                <button
                  onClick={() => scrollToMessage(m.replyTo.id)}
                  className={`max-w-[78%] mb-0.5 px-3 py-1 rounded-t-xl text-left ${isMe ? 'self-end' : 'self-start'}`}
                  style={{ background: 'rgba(22,52,73,0.06)', borderLeft: '2px solid #C0603F' }}
                >
                  <span className="text-[11px] text-gray-500 line-clamp-1">
                    {m.replyTo.senderId === user?.id ? 'You' : (other?.name || 'Them')}: {snippetFor(m.replyTo)}
                  </span>
                </button>
              )}
              <div className={`relative max-w-[78%] ${m.reaction ? 'mb-2.5' : ''}`}>
                <div
                  onClick={() => handleBubbleTap(m)}
                  onTouchStart={() => startPress(m)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onMouseDown={() => startPress(m)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onContextMenu={e => e.preventDefault()}
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-none cursor-pointer ${
                    m.isDeleted
                      ? 'bg-gray-100 text-gray-400 italic rounded-br-sm rounded-bl-sm'
                      : isMe
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm'
                  }`}
                  style={{ WebkitTouchCallout: 'none' }}
                >
                  {m.isDeleted
                    ? 'Message unsent'
                    : m.audioUrl
                      ? <VoiceBubble src={m.audioUrl} duration={m.audioDuration || 0} isMe={isMe} />
                      : m.content}
                </div>

                {/* Reaction chip — overlaps the bubble's bottom corner */}
                {m.reaction && (
                  <button
                    onClick={() => applyReaction(m.id, null)}
                    className={`absolute -bottom-2.5 ${isMe ? 'left-0 -translate-x-1.5' : 'right-0 translate-x-1.5'} bg-white border border-gray-100 rounded-full px-1.5 py-0.5 text-[13px] leading-none shadow-sm`}
                    style={{ zIndex: 2 }}
                  >
                    {m.reaction}
                  </button>
                )}

                {/* Long-press reaction + action picker */}
                {pickerFor === m.id && (
                  <div
                    className={`absolute bottom-full mb-1.5 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden`}
                    style={{ zIndex: 20, minWidth: 190 }}
                  >
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
                      {REACTION_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => applyReaction(m.id, m.reaction === emoji ? null : emoji)}
                          className={`text-lg leading-none rounded-full p-0.5 active:scale-125 transition-transform ${m.reaction === emoji ? 'bg-gray-100' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setReplyTo(m); setPickerFor(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 active:bg-gray-50 flex items-center gap-2"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      Reply
                    </button>
                    {isMe && (
                      <button
                        onClick={() => unsend(m.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 active:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Unsend
                      </button>
                    )}
                  </div>
                )}
              </div>
              {showTime && (
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">{getTimeStr(m.createdAt)}</p>
              )}
              {i === messages.length - 1 && isMe && m.isRead && !m.isDeleted && (
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">Seen</p>
              )}
            </div>
          );
        })}
        {typingUser && (
          <div className="flex items-end gap-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview strip above composer */}
      {replyTo && (
        <div className="px-4 pt-2 flex-shrink-0" style={{ background: 'rgba(238,243,245,0.95)' }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(22,52,73,0.06)', borderLeft: '2px solid #C0603F' }}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: '#C0603F' }}>
                Replying to {replyTo.senderId === user?.id ? 'yourself' : (other?.name || 'them')}
              </p>
              <p className="text-xs text-gray-500 truncate">{snippetFor(replyTo)}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 flex-shrink-0" aria-label="Cancel reply">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7680" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0 pb-safe" style={{ background: 'rgba(238,243,245,0.95)' }}>
        {recording ? (
          <div className="flex-1 flex items-center gap-3 px-4 rounded-[20px] bg-white border border-gray-100" style={{ height: 42 }}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium tabular-nums text-gray-700">{fmtDuration(recordSeconds)}</span>
            <span className="flex-1 flex items-center gap-0.5 overflow-hidden">
              {[10, 16, 8, 20, 12, 18, 9, 15, 11, 17, 7, 14].map((h, i) => (
                <span key={i} className="rounded-full bg-red-300" style={{ width: 2.5, height: h, animation: `pulse 0.9s ${i * 0.07}s ease-in-out infinite` }} />
              ))}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">Release to send</span>
          </div>
        ) : (
          <WaterInput className="flex-1" style={{ borderRadius: 20 }}>
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message..."
              className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
            />
          </WaterInput>
        )}
        {input.trim() ? (
          <WaterButton
            variant="primary"
            onClick={handleSend}
            disabled={sending}
            style={{ width: 40, height: 40, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A5200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </WaterButton>
        ) : (
          <button
            onPointerDown={e => { e.preventDefault(); startRecording(); }}
            aria-label="Hold to record voice message"
            className="flex items-center justify-center rounded-full flex-shrink-0 transition-transform"
            style={{
              width: 40, height: 40,
              background: recording ? '#ef4444' : 'rgba(22,52,73,0.1)',
              transform: recording ? 'scale(1.15)' : 'scale(1)',
              touchAction: 'none',
            }}
          >
            <Mic size={19} color={recording ? '#fff' : '#163449'} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}
