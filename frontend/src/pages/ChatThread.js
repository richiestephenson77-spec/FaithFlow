import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { WaterCard, WaterButton, WaterInput } from '../components/water';

function getTimeStr(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

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
    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('message_received');
      socket.off('typing');
      socket.off('stop_typing');
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

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    if (socket) socket.emit('stop_typing', { conversationId });
    try {
      const res = await api.post(`/messages/conversations/${conversationId}`, { content });
      setMessages(prev => [...prev, res.data]);
    } catch {}
    setSending(false);
  }

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m, i) => {
          const isMe = m.senderId === user?.id || m.sender?.id === user?.id;
          const showTime = i === messages.length - 1 || messages[i + 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isMe
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {m.content}
              </div>
              {showTime && (
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">{getTimeStr(m.createdAt)}</p>
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

      {/* Input */}
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0 pb-safe" style={{ background: 'rgba(238,243,245,0.95)' }}>
        <WaterInput className="flex-1" style={{ borderRadius: 20 }}>
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message..."
            className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
          />
        </WaterInput>
        <WaterButton
          variant="primary"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ width: 40, height: 40, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A5200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </WaterButton>
      </div>
    </div>
  );
}
