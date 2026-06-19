import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Heart, MessageCircle, PenLine, ChevronLeft, Shield, User } from 'lucide-react';
import api from '../utils/api';

const CATEGORIES = ['All', 'Anxiety', 'Doubt', 'Relationships', 'Addiction', 'Grief', 'Sin', 'Loneliness', 'Other'];

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
      className="rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <User size={size * 0.5} color="#9ca3af" strokeWidth={1.5} />
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
    <motion.button
      animate={controls}
      onClick={handleTap}
      className="flex items-center gap-1.5"
    >
      <Heart
        size={16}
        strokeWidth={1.8}
        fill={hasHearted ? '#ef4444' : 'none'}
        color={hasHearted ? '#ef4444' : '#9ca3af'}
      />
      <span className="text-sm text-gray-400">{heartCount}</span>
    </motion.button>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

export default function Confessions() {
  const navigate = useNavigate();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async (cat) => {
    setLoading(true);
    try {
      const res = await api.get(`/confessions${cat !== 'All' ? `?category=${cat}` : ''}`);
      setConfessions(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(activeCategory); }, [load, activeCategory]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleHeart(id) {
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
    setConfessions(prev => [c, ...prev]);
    setShowModal(false);
    showToast('Shared anonymously 🙏');
  }

  return (
    <div className="bg-gray-50 min-h-full pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-5 pt-5 pb-4 flex items-center gap-3"
      >
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#374151" strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Confession Wall</h2>
          <p className="text-xs text-gray-400">A safe space. Completely anonymous.</p>
        </div>
      </motion.div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-200"
            style={{
              background: activeCategory === cat ? '#111827' : '#FFFFFF',
              color: activeCategory === cat ? '#FFFFFF' : '#6B7280',
              borderColor: activeCategory === cat ? '#111827' : '#E5E7EB',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3 px-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : confessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-semibold text-gray-600">No confessions yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to share anonymously</p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 space-y-3">
          {confessions.map(c => (
            <motion.div key={c.id} variants={cardVariants} whileInView="show" viewport={{ once: true, margin: '-40px' }}>
              <ConfessionCard
                confession={c}
                onHeart={() => handleHeart(c.id)}
                onRead={() => navigate(`/confessions/${c.id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-lg z-30"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
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
            className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <ConfessionModal onClose={() => setShowModal(false)} onCreate={onNewConfession} />}
      </AnimatePresence>
    </div>
  );
}

function ConfessionCard({ confession: c, onHeart, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = c.content.length > 180;
  const displayText = isLong && !expanded ? c.content.slice(0, 180) + '…' : c.content;

  return (
    <div
      className="bg-white rounded-2xl p-5 cursor-pointer"
      style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      onClick={onRead}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <AnonAvatar size={36} />
          <div>
            <p className="text-sm font-medium text-gray-500">Anonymous</p>
            <p className="text-xs text-gray-300">{getTimeAgo(c.createdAt)}</p>
          </div>
        </div>
        {c.category && c.category !== 'General' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {c.category}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 leading-relaxed">
        {displayText}
        {isLong && !expanded && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(true); }}
            className="ml-1 text-amber-500 font-medium text-sm"
          >
            Read more
          </button>
        )}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
          <HeartButton hasHearted={c.hasHearted} heartCount={c.heartCount} onHeart={onHeart} />
          <div className="flex items-center gap-1.5">
            <MessageCircle size={16} color="#9ca3af" strokeWidth={1.8} />
            <span className="text-sm text-gray-400">{c.commentCount}</span>
          </div>
        </div>
        <span className="text-xs text-amber-500 font-medium">Read →</span>
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
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white w-full rounded-t-3xl pb-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <button onClick={onClose} className="text-gray-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">Share Anonymously</p>
            <p className="text-xs text-gray-400">No one will ever know this was you</p>
          </div>
          <div className="w-6" />
        </div>

        <div className="px-5 space-y-4">
          {/* Textarea */}
          <div className="bg-gray-50 rounded-2xl p-4 relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, 500))}
              rows={5}
              autoFocus
              placeholder={'What\'s on your heart?\nThis is a safe place...'}
              className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
            />
            <p className={`text-xs text-right mt-1 ${charCount > 400 ? 'text-amber-500' : 'text-gray-300'}`}>
              {charCount}/500
            </p>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {cats.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors duration-200"
                  style={{
                    background: category === cat ? '#111827' : '#F9FAFB',
                    color: category === cat ? '#FFFFFF' : '#6B7280',
                    borderColor: category === cat ? '#111827' : '#E5E7EB',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Reassurance */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
            <Shield size={14} color="#9ca3af" strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Your identity is completely hidden. No name, no photo, no trace.
            </p>
          </div>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={saving || content.trim().length < 10}
            className="w-full bg-gray-900 text-white font-semibold text-sm py-3.5 rounded-2xl disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
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
