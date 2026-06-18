import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

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
      <div className="prayer-gradient px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">📖</div>
            <div>
              <h2 className="font-bold text-base">Ask the Word</h2>
              <p className="text-xs text-white/70">Your Bible guide, always here</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-xs text-white/60 hover:text-white">Clear</button>
          )}
        </div>
      </div>

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
            <div className="w-8 h-8 rounded-full prayer-gradient flex items-center justify-center text-white text-sm flex-shrink-0">
              📖
            </div>
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
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {!isEmpty && !loading && (
          <div className="flex gap-2 overflow-x-auto mb-2 pb-1">
            {STARTER_QUESTIONS.slice(0, 3).map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-xs bg-faith-50 text-faith-700 border border-faith-100 rounded-full px-3 py-1 whitespace-nowrap flex-shrink-0">
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about the Bible, prayer, or faith..."
            rows={1}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none max-h-24"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="prayer-gradient text-white w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 shadow">
            <span className="text-lg">↑</span>
          </button>
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
        <div className="w-8 h-8 rounded-full prayer-gradient flex items-center justify-center text-white text-sm flex-shrink-0">
          📖
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm fade-in ${
        isUser
          ? 'prayer-gradient text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
      }`}>
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
        ))}
      </div>
    </div>
  );
}
