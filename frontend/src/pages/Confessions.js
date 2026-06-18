import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const CATEGORIES = ['All', 'Anxiety', 'Doubt', 'Relationships', 'Addiction', 'Grief', 'Sin', 'Other', 'General'];

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AnonAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#9ca3af" stroke="none">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );
}

export default function Confessions() {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [openComments, setOpenComments] = useState(null);

  const load = useCallback(async (cat) => {
    setLoading(true);
    try {
      const res = await api.get(`/confessions${cat !== 'All' ? `?category=${cat}` : ''}`);
      setConfessions(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(activeCategory); }, [load, activeCategory]);

  async function handleEncourage(id) {
    try {
      const res = await api.post(`/confessions/${id}/encourage`);
      setConfessions(prev => prev.map(c => c.id === id
        ? { ...c, hasEncouraged: res.data.encouraged, encouragementCount: c.encouragementCount + (res.data.encouraged ? 1 : -1) }
        : c));
    } catch {}
  }

  function onNewConfession(c) {
    setConfessions(prev => [c, ...prev]);
    setShowModal(false);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Confession Wall</h2>
        <p className="text-white/70 text-sm">A safe, anonymous space. No judgment here.</p>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {CATEGORIES.filter((c, i, a) => a.indexOf(c) === i).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === cat ? 'prayer-gradient text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-semibold text-gray-600">No confessions yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to share anonymously</p>
          </div>
        ) : (
          <div className="space-y-3">
            {confessions.map(c => (
              <ConfessionCard key={c.id} confession={c}
                onEncourage={() => handleEncourage(c.id)}
                onComment={() => setOpenComments(openComments === c.id ? null : c.id)}
                showComments={openComments === c.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB share */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold rounded-full px-5 py-3 shadow-xl text-sm z-30"
      >
        + Share
      </button>

      {showModal && <ConfessionModal onClose={() => setShowModal(false)} onCreate={onNewConfession} />}
    </div>
  );
}

function ConfessionCard({ confession: c, onEncourage, onComment, showComments }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (!showComments) return;
    setLoadingComments(true);
    api.get(`/confessions/${c.id}/comments`).then(res => setComments(res.data)).catch(() => {}).finally(() => setLoadingComments(false));
  }, [showComments, c.id]);

  async function postComment() {
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/confessions/${c.id}/comments`, { content: commentText });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch {}
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <AnonAvatar />
        <div>
          <p className="font-semibold text-gray-700 text-sm">Anonymous Believer</p>
          <p className="text-[10px] text-gray-400">{getTimeAgo(c.createdAt)}</p>
        </div>
        {c.category && c.category !== 'General' && (
          <span className="ml-auto text-[10px] font-semibold text-faith-500 bg-faith-50 border border-faith-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
            {c.category}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
        {c.content}
      </p>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
        <button onClick={onEncourage}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
            c.hasEncouraged ? 'bg-faith-50 text-faith-600 border-faith-200' : 'text-gray-400 border-gray-200 hover:border-gray-300'
          }`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={c.hasEncouraged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {c.encouragementCount} Encourage
        </button>
        <button onClick={onComment}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 px-3 py-1.5 rounded-full border border-gray-200">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {c.commentCount} Comments
        </button>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          {loadingComments ? <div className="h-4 bg-gray-100 rounded animate-pulse" /> : (
            <div className="space-y-2 mb-3">
              {comments.map((cm, i) => (
                <div key={i} className="flex gap-2">
                  <AnonAvatar />
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-gray-500 mb-0.5">Anonymous Believer</p>
                    <p className="text-xs text-gray-700">{cm.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
              placeholder="Offer encouragement..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-faith-400"
            />
            <button onClick={postComment} disabled={!commentText.trim()}
              className="prayer-gradient text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfessionModal({ onClose, onCreate }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);
  const cats = ['General', 'Anxiety', 'Doubt', 'Relationships', 'Addiction', 'Grief', 'Sin', 'Other'];

  async function handleSubmit() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/confessions', { content, category });
      onCreate(res.data);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h3 className="font-bold text-gray-900 text-sm">Share Anonymously</h3>
          <button onClick={handleSubmit} disabled={saving || !content.trim()} className="text-faith-600 font-bold text-sm disabled:opacity-40">
            {saving ? 'Posting...' : 'Post'}
          </button>
        </div>
        <div className="px-4 py-4 space-y-4">
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            rows={5} autoFocus
            placeholder="Share what's on your heart... This is completely anonymous."
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
            style={{ fontFamily: 'Georgia, serif' }}
          />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {cats.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    category === cat ? 'border-faith-400 bg-faith-50 text-faith-700' : 'border-gray-200 text-gray-600'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">Your identity is never revealed to anyone.</p>
          <button onClick={handleSubmit} disabled={saving || !content.trim()}
            className="w-full prayer-gradient text-white rounded-2xl py-3.5 font-bold text-sm disabled:opacity-40">
            {saving ? 'Posting...' : 'Share Anonymously'}
          </button>
        </div>
      </div>
    </div>
  );
}
