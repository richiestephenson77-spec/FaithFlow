import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronLeft, Heart, MessageCircle, User, Lock, Send } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';

const BG = '#0A0F1E';

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
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: 'rgba(255,255,255,0.08)' }}
    >
      <User size={size * 0.45} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
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
        color={hasHearted ? '#ef4444' : 'rgba(255,255,255,0.4)'}
      />
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{heartCount}</span>
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
      // Update count based on actual comments length
      setConfession(c => c ? { ...c, commentCount: comments.length + 1 } : c);
    } catch (err) {
      console.error('Comment send failed:', err?.response?.status, err?.response?.data);
      setComments(prev => prev.filter(cm => cm.id !== optimistic.id));
      setConfession(c => c ? { ...c, commentCount: c.commentCount - 1 } : c);

      if (err?.response?.status === 401) {
        showToast('Session expired — please log in again');
        setSending(false);
        return;
      }

      const msg = err?.response?.data?.error || 'Failed to send — please try again';
      showToast(msg);
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={22} color="white" strokeWidth={2} />
        </button>
        <h2 className="text-base font-semibold text-white">Confession</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-36">
        {/* Confession block */}
        {loadingConfession ? (
          <div className="m-4 h-40 rounded-[20px] animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        ) : confession ? (
          <div
            className="rounded-[20px] p-6 mx-4 mt-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AnonAvatar size={40} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Anonymous</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{getTimeAgo(confession.createdAt)}</p>
              </div>
              {confession.category && confession.category !== 'General' && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {confession.category}
                </span>
              )}
            </div>

            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{confession.content}</p>

            <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <HeartButton hasHearted={confession.hasHearted} heartCount={confession.heartCount} onHeart={handleHeart} />
              <div className="flex items-center gap-1.5">
                <MessageCircle size={18} strokeWidth={1.8} color="rgba(255,255,255,0.4)" />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {comments.length} {comments.length === 1 ? 'person' : 'people'} responded
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="flex items-center gap-3 px-5 mt-6 mb-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Responses</p>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Comments */}
        {loadingComments ? (
          <div className="space-y-3 px-4">
            {[1, 2].map(i => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <MessageCircle size={36} color="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Be the first to encourage them</p>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {comments.map((cm, i) => (
              <motion.div
                key={cm.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-start gap-3"
              >
                {cm.isAnonymous || !cm.commenter ? (
                  <AnonAvatar size={34} />
                ) : (
                  <Avatar user={cm.commenter} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {cm.isAnonymous || !cm.commenter ? (
                      <>
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Anonymous</p>
                        <Lock size={10} color="rgba(255,255,255,0.2)" strokeWidth={2} />
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white">{cm.commenter.name}</p>
                        {cm.commenter.prayerWarriorBadge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>🏆</span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>{cm.content}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{getTimeAgo(cm.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Fixed comment input */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-6 z-20"
        style={{ background: '#131929', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-end gap-2">
          <Avatar user={me} size="sm" />
          <div
            className="flex-1 rounded-2xl px-4 py-2.5 min-h-[42px]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={inputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, 300))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={1}
              placeholder="Write something encouraging..."
              className="w-full bg-transparent text-sm placeholder-white/25 resize-none focus:outline-none leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.85)', maxHeight: 80 }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!commentText.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: commentText.trim() ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
          >
            <Send size={15} color="white" strokeWidth={2} />
          </motion.button>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-2 mt-2 ml-10">
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0"
            style={{ background: isAnonymous ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}
          >
            <motion.div
              animate={{ x: isAnonymous ? 16 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
            />
          </button>
          <p className={`text-xs font-medium`} style={{ color: isAnonymous ? '#f59e0b' : 'rgba(255,255,255,0.35)' }}>
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
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
