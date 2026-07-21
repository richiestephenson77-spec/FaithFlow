import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Heart, MessageCircle, PenLine, ChevronLeft, Shield, User } from 'lucide-react';
import api from '../utils/api';
import { WaterPill } from '../components/water';
import { hapticLight } from '../utils/haptics';
import PullToRefresh from '../components/PullToRefresh';
import ContentModeration from '../components/ContentModeration';

const CATEGORIES = ['All', 'Anxiety', 'Doubt', 'Relationships', 'Addiction', 'Grief', 'Sin', 'Loneliness', 'Other'];
const BG = '#EEF3F5';
const ACCENT = '#2C4055';

// Confessions are anonymous. Whitelist the ONLY fields the client is allowed to
// hold, so no author-identifying data (userId/user/author/name) can ever live on
// the client even if an API response were to include it. Never add identity here.
function sanitizeConfession(c) {
  if (!c) return c;
  return {
    id: c.id,
    content: c.content,
    category: c.category,
    createdAt: c.createdAt,
    heartCount: c.heartCount,
    commentCount: c.commentCount,
    hasHearted: c.hasHearted,
  };
}

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AnonAvatar({ size = 36 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: 'rgba(22,52,73,0.08)' }}
    >
      <User size={size * 0.45} color="#7A9BAD" strokeWidth={1.5} />
    </div>
  );
}

function HeartButton({ hasHearted, heartCount, onHeart }) {
  const controls = useAnimation();

  async function handleTap(e) {
    e.stopPropagation();
    await controls.start({ scale: 0.8, transition: { duration: 0.08 } });
    onHeart();
    await controls.start({ scale: 1.2, transition: { type: 'spring', stiffness: 500, damping: 10 } });
    await controls.start({ scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
  }

  return (
    <motion.button animate={controls} onClick={handleTap} className="flex items-center gap-1.5">
      <Heart
        size={16}
        strokeWidth={1.8}
        fill={hasHearted ? '#ef4444' : 'none'}
        color={hasHearted ? '#ef4444' : '#9AA6AD'}
      />
      <span className="text-sm" style={{ color: '#6B7680' }}>{heartCount}</span>
    </motion.button>
  );
}

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Confessions() {
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [tab, setTab] = useState('feed'); // 'feed' | 'mine'
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (cat, which) => {
    setLoading(true);
    try {
      const url = which === 'mine'
        ? '/confessions/mine'
        : `/confessions${cat !== 'All' ? `?category=${cat}` : ''}`;
      const res = await api.get(url);
      setConfessions((res.data || []).map(sanitizeConfession));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(activeCategory, tab); }, [load, activeCategory, tab]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleHeart(id) {
    hapticLight();
    setConfessions(prev => prev.map(c => c.id === id
      ? { ...c, hasHearted: !c.hasHearted, heartCount: c.heartCount + (c.hasHearted ? -1 : 1) }
      : c));
    try {
      await api.post(`/confessions/${id}/heart`);
    } catch {
      setConfessions(prev => prev.map(c => c.id === id
        ? { ...c, hasHearted: !c.hasHearted, heartCount: c.heartCount + (c.hasHearted ? -1 : 1) }
        : c));
    }
  }

  function onNewConfession(c) {
    setConfessions(prev => [sanitizeConfession(c), ...prev]);
    setShowModal(false);
    showToast('Shared anonymously 🙏');
  }

  return (
    <PullToRefresh onRefresh={() => load(activeCategory, tab)}>
    <div className="min-h-full pb-28" style={{ background: BG }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-5 pt-5 pb-4 flex items-center gap-3"
      >
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color="#163449" strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-2xl font-bold leading-tight" style={{ color: '#163449' }}>Confession Wall</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7680' }}>
            A safe, anonymous space.
          </p>
        </div>
      </motion.div>

      {/* Feed / Mine tabs */}
      <div className="flex gap-2 px-4 pb-4">
        {[{ id: 'feed', label: 'Wall' }, { id: 'mine', label: 'My Confessions' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-full text-sm text-center transition-colors"
            style={{
              background: tab === t.id ? 'rgba(0,0,0,0.04)' : 'transparent',
              color: tab === t.id ? '#163449' : '#8E8E8E',
              fontWeight: tab === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category chips — feed only */}
      {tab === 'feed' && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
              style={{
                background: activeCategory === cat ? 'rgba(0,0,0,0.04)' : 'transparent',
                color: activeCategory === cat ? '#163449' : '#8E8E8E',
                fontWeight: activeCategory === cat ? 500 : 400,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-[20px] animate-pulse" style={{ background: 'rgba(22,52,73,0.06)' }} />
          ))}
        </div>
      ) : confessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-semibold" style={{ color: '#4A6674' }}>{tab === 'mine' ? 'You haven’t shared anything yet' : 'No confessions yet'}</p>
          <p className="text-sm mt-1" style={{ color: '#9AA6AD' }}>{tab === 'mine' ? 'Your confessions will appear here — only you can see this list' : 'Be the first to share anonymously'}</p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="px-4 space-y-3">
          {confessions.map(c => (
            <motion.div key={c.id} variants={cardVariants}>
              <ConfessionCard
                confession={c}
                onHeart={() => handleHeart(c.id)}
                onRead={() => navigate(`/confessions/${c.id}`)}
                onHide={() => setConfessions(prev => prev.filter(x => x.id !== c.id))}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Share Anonymously — flat terracotta primary, pinned bottom */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white font-semibold text-sm px-6 py-3 rounded-full z-30"
        style={{ background: ACCENT, boxShadow: '0 6px 16px rgba(20,40,60,0.18)' }}
      >
        <PenLine size={16} strokeWidth={2} />
        Share Anonymously
      </motion.button>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-sm font-medium px-5 py-3 rounded-2xl shadow-xl"
            style={{ background: 'white', color: '#163449', border: '1px solid rgba(22,52,73,0.08)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <ConfessionModal onClose={() => setShowModal(false)} onCreate={onNewConfession} />}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}

function ConfessionCard({ confession: c, onHeart, onRead, onHide }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = c.content.length > 180;
  const displayText = isLong && !expanded ? c.content.slice(0, 180) + '…' : c.content;

  return (
    <div
      onClick={onRead}
      className="rounded-[20px] p-5 cursor-pointer active:opacity-80 transition-opacity"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(22,52,73,0.08)',
        boxShadow: '0 1px 3px rgba(20,40,60,0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <AnonAvatar size={34} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#163449' }}>Anonymous</p>
            <p className="text-xs" style={{ color: '#9AA6AD' }}>{getTimeAgo(c.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {c.category && c.category !== 'General' && (
            <span
              className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(22,52,73,0.06)', color: '#6B7680' }}
            >
              {c.category}
            </span>
          )}
          {/* Anonymous — Report only, no author to block */}
          <ContentModeration contentType="CONFESSION" contentId={c.id} onHidden={onHide} iconSize={16} />
        </div>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed" style={{ color: '#262626' }}>
        {displayText}
        {isLong && !expanded && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(true); }}
            className="ml-1 font-medium text-sm"
            style={{ color: ACCENT }}
          >
            Read more
          </button>
        )}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(22,52,73,0.07)' }}>
        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
          <HeartButton hasHearted={c.hasHearted} heartCount={c.heartCount} onHeart={onHeart} />
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <MessageCircle size={16} strokeWidth={1.8} color="#9AA6AD" />
            <span className="text-sm" style={{ color: '#6B7680' }}>{c.commentCount}</span>
          </div>
        </div>
        <span className="text-xs font-medium" style={{ color: ACCENT }}>Read →</span>
      </div>
    </div>
  );
}

function ConfessionModal({ onClose, onCreate }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);
  const cats = ['General', 'Anxiety', 'Doubt', 'Relationships', 'Addiction', 'Grief', 'Sin', 'Loneliness', 'Other'];

  async function handleSubmit() {
    if (!content.trim() || content.trim().length < 10) return;
    setSaving(true);
    try {
      const res = await api.post('/confessions', { content: content.trim(), category });
      onCreate(res.data);
    } catch {}
    setSaving(false);
  }

  const charCount = content.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full rounded-t-3xl pb-8 max-h-[90vh] overflow-y-auto"
        style={{ background: '#FFFFFF' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: 'rgba(22,52,73,0.15)' }} />

        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9AA6AD" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: '#163449' }}>Share Anonymously</p>
            <p className="text-xs mt-0.5" style={{ color: '#9AA6AD' }}>No one will ever know this was you</p>
          </div>
          <div className="w-6" />
        </div>

        <div className="px-5 space-y-4">
          <div className="rounded-2xl p-4 relative" style={{ background: '#F3F6F8', border: '1px solid rgba(22,52,73,0.08)' }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, 500))}
              rows={5}
              autoFocus
              placeholder={"What's on your heart?\nThis is a safe place..."}
              className="w-full bg-transparent text-sm resize-none focus:outline-none leading-relaxed"
              style={{ color: '#262626' }}
            />
            <p className="text-xs text-right mt-1" style={{ color: charCount > 400 ? ACCENT : '#9AA6AD' }}>
              {charCount}/500
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7680' }}>Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {cats.map(cat => (
                <WaterPill key={cat} active={category === cat} onClick={() => setCategory(cat)}>
                  {cat}
                </WaterPill>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(22,52,73,0.05)' }}>
            <Shield size={14} color="#7A9BAD" strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed" style={{ color: '#6B7680' }}>
              Your identity is completely hidden. No name, no photo, no trace.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={saving || content.trim().length < 10}
            className="w-full font-semibold text-sm py-3.5 rounded-2xl text-white transition-colors"
            style={{ background: content.trim().length >= 10 ? ACCENT : 'rgba(22,52,73,0.15)' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sharing...
              </span>
            ) : 'Share Anonymously'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
