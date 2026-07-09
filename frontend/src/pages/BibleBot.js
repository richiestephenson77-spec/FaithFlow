import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { WaterCard, WaterButton, WaterInput } from '../components/water';

const STARTER_QUESTIONS = [
  "What does the Bible say about anxiety?",
  "Give me a verse for strength and courage",
  "How do I pray when I feel lost?",
  "What does Psalm 23 mean?",
  "How can I grow closer to God?",
  "What does the Bible say about forgiveness?",
];

export default function BibleBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    api.get('/bible-bot/history')
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, id: `tmp-${Date.now()}` };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/bible-bot/chat', { message: msg });
      setMessages(p => [...p, { role: 'assistant', content: res.data.reply, id: `tmp-${Date.now() + 1}` }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "I'm sorry, something went wrong. Please try again.", id: `tmp-err` }]);
    }

    setLoading(false);
  }

  async function clearChat() {
    await api.delete('/bible-bot/history').catch(() => {});
    setMessages([]);
  }

  const isEmpty = !historyLoading && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <WaterCard tone="blue" style={{ borderRadius: '0 0 20px 20px', padding: 16 }} className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(22,52,73,0.1)' }}>📖</div>
            <div>
              <h2 className="font-bold text-base" style={{ color: '#163449' }}>Ask the Word</h2>
              <p className="text-xs" style={{ color: '#4A6674' }}>Your Bible guide, always here</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-xs" style={{ color: '#4A6674' }}>Clear</button>
          )}
        </div>
      </WaterCard>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {historyLoading && (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="text-5xl mb-4">✝️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Ask me anything about the Bible</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Questions about Scripture, prayer, faith, or guidance — I'm here for all of it.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {STARTER_QUESTIONS.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-faith-700 hover:border-faith-400 hover:bg-faith-50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={msg.id || i} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <WaterCard tone="gold" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              📖
            </WaterCard>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-faith-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: 'rgba(238,243,245,0.95)' }}>
        {!isEmpty && !loading && (
          <div className="flex gap-2 overflow-x-auto mb-2 pb-1 scrollbar-hide">
            {STARTER_QUESTIONS.slice(0, 3).map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-xs rounded-full px-3 py-1 whitespace-nowrap flex-shrink-0"
                style={{ background: 'rgba(22,52,73,0.08)', color: '#163449', border: '1px solid rgba(22,52,73,0.12)' }}>
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-3 items-end">
          <WaterInput className="flex-1" style={{ borderRadius: 16 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about the Bible, prayer, or faith..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none max-h-24 text-gray-800 placeholder-gray-400"
            />
          </WaterInput>
          <WaterButton type="submit" variant="primary" disabled={loading || !input.trim()}
            style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
            ↑
          </WaterButton>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <WaterCard tone="gold" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          📖
        </WaterCard>
      )}
      <WaterCard
        tone={isUser ? 'gold' : 'neutral'}
        style={{ maxWidth: '80%', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '12px 16px', fontSize: 14, lineHeight: '1.5' }}
        className="fade-in"
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
        ))}
      </WaterCard>
    </div>
  );
}
