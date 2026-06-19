import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronLeft, Heart, MessageCircle, User, Lock, Send } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AnonAvatar({ size = 40 }) {
  return (
    <div
      className="rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <User size={size * 0.45} color="#9ca3af" strokeWidth={1.5} />
    </div>
  );
}

function HeartButton({ hasHearted, heartCount, onHeart }) {
  const controls = useAnimation();

  async function handleTap() {
    await controls.start({ scale: 0.8, transition: { duration: 0.1 } });
    onHeart();
    await controls.start({ scale: 1.15, transition: { type: 'spring', stiffness: 500, damping: 12 } });
    await controls.start({ scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
  }

  return (
    <motion.button animate={controls} onClick={handleTap} className="flex items-center gap-1.5">
      <Heart
        size={18}
        strokeWidth={1.8}
        fill={hasHearted ? '#ef4444' : 'none'}
        color={hasHearted ? '#ef4444' : '#9ca3af'}
      />
      <span className="text-sm text-gray-500">{heartCount}</span>
    </motion.button>
  );
}

export default function ConfessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [confession, setConfession] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingConfession, setLoadingConfession] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const inputRef = useRef(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    api.get(`/confessions/${id}`)
      .then(res => setConfession(res.data))
      .catch(() => {})
      .finally(() => setLoadingConfession(false));

    api.get(`/confessions/${id}/comments`)
      .then(res => setComments(res.data))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [id]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleHeart() {
    if (!confession) return;
    setConfession(c => ({ ...c, hasHearted: !c.hasHearted, heartCount: c.heartCount + (c.hasHearted ? -1 : 1) }));
    try {
      await api.post(`/confessions/${id}/heart`);
    } catch {
      setConfession(c => ({ ...c, hasHearted: !c.hasHearted, heartCount: c.heartCount + (c.hasHearted ? -1 : 1) }));
    }
  }

  async function handleSend() {
    if (!commentText.trim() || sending) return;
    const text = commentText.trim();
    setCommentText('');
    setSending(true);

    // Optimistic
    const optimistic = {
      id: `temp-${Date.now()}`,
      content: text,
      createdAt: new Date().toISOString(),
      isAnonymous,
      commenter: isAnonymous ? null : { name: me?.name, profilePhoto: me?.profilePhoto, prayerWarriorBadge: false },
      _optimistic: true,
    };
    setComments(prev => [...prev, optimistic]);
    setConfession(c => c ? { ...c, commentCount: c.commentCount + 1 } : c);
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    try {
      const res = await api.post(`/confessions/${id}/comments`, { content: text, isAnonymous });
      setComments(prev => prev.map(cm => cm.id === optimistic.id ? res.data : cm));
    } catch {
      setComments(prev => prev.filter(cm => cm.id !== optimistic.id));
      setConfession(c => c ? { ...c, commentCount: c.commentCount - 1 } : c);
      showToast('Failed to send — please try again');
    }
    setSending(false);
  }

  return (
    <div className="bg-white min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#374151" strokeWidth={2} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">Confession</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-36">
        {/* Confession block */}
        {loadingConfession ? (
          <div className="m-4 h-40 bg-gray-100 rounded-2xl animate-pulse" />
        ) : confession ? (
          <div className="bg-white rounded-2xl p-6 mx-4 mt-4" style={{ border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-3 mb-4">
              <AnonAvatar size={40} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Anonymous</p>
                <p className="text-xs text-gray-300">{getTimeAgo(confession.createdAt)}</p>
              </div>
              {confession.category && confession.category !== 'General' && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                  {confession.category}
                </span>
              )}
            </div>

            <p className="text-base text-gray-800 leading-relaxed">{confession.content}</p>

            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
              <HeartButton hasHearted={confession.hasHearted} heartCount={confession.heartCount} onHeart={handleHeart} />
              <div className="flex items-center gap-1.5">
                <MessageCircle size={18} color="#9ca3af" strokeWidth={1.8} />
                <span className="text-sm text-gray-500">{confession.commentCount} {confession.commentCount === 1 ? 'person' : 'people'} responded</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Comments divider */}
        <div className="flex items-center gap-3 px-5 mt-6 mb-3">
          <div className="flex-1 h-px bg-gray-100" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Responses</p>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Comments */}
        {loadingComments ? (
          <div className="space-y-3 px-4">
            {[1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <MessageCircle size={36} color="#e5e7eb" strokeWidth={1.5} />
            <p className="text-sm text-gray-300 mt-3">Be the first to encourage them</p>
          </div>
        ) : (
          <motion.div className="px-4 space-y-3">
            {comments.map((cm, i) => (
              <motion.div
                key={cm.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-start gap-3"
              >
                {cm.isAnonymous || !cm.commenter ? (
                  <AnonAvatar size={36} />
                ) : (
                  <Avatar user={cm.commenter} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {cm.isAnonymous || !cm.commenter ? (
                      <>
                        <p className="text-sm font-medium text-gray-400">Anonymous</p>
                        <Lock size={10} color="#d1d5db" strokeWidth={2} />
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900">{cm.commenter.name}</p>
                        {cm.commenter.prayerWarriorBadge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">🏆</span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-snug">{cm.content}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{getTimeAgo(cm.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Fixed comment input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6 z-20">
        <div className="flex items-end gap-2">
          <Avatar user={me} size="sm" />
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 min-h-[42px]">
            <textarea
              ref={inputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, 300))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={1}
              placeholder="Write something encouraging..."
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: 80 }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!commentText.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: commentText.trim() ? '#f59e0b' : '#e5e7eb' }}
          >
            <Send size={15} color="white" strokeWidth={2} />
          </motion.button>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-2 mt-2 ml-10">
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0"
            style={{ background: isAnonymous ? '#f59e0b' : '#d1d5db' }}
          >
            <motion.div
              animate={{ x: isAnonymous ? 16 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
            />
          </button>
          <p className={`text-xs ${isAnonymous ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>
            {isAnonymous ? 'Posting anonymously' : 'Post anonymously'}
          </p>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
