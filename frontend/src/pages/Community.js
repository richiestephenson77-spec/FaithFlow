import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';
import { WaterButton } from '../components/water';
import PullToRefresh from '../components/PullToRefresh';

const POST_TYPES = ['UPDATE', 'TESTIMONY', 'VERSE'];
const TYPE_LABELS = { UPDATE: 'Update', TESTIMONY: 'Testimony', VERSE: 'Scripture' };
const TYPE_STYLES = {
  UPDATE:    'bg-blue-50 text-blue-600 border border-blue-100',
  TESTIMONY: 'bg-terracotta-50 text-terracotta-600 border border-terracotta-100',
  VERSE:     'bg-emerald-50 text-emerald-600 border border-emerald-100',
};
const TYPE_DOT = {
  UPDATE: 'bg-blue-500',
  TESTIMONY: 'bg-terracotta-500',
  VERSE: 'bg-emerald-500',
};

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const loadPosts = useCallback(async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  function onNewPost(post) {
    setPosts(p => [{ ...post, user }, ...p]);
    setShowNew(false);
  }

  async function toggleLike(postId) {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, likedByMe: res.data.liked, _count: { ...p._count, likes: p._count.likes + (res.data.liked ? 1 : -1) } }
        : p));
    } catch {}
  }

  return (
    <PullToRefresh onRefresh={loadPosts}>
    <div className="bg-gray-50 min-h-full">
      {/* Composer */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowNew(true)}>
          <Avatar user={user} size="md" />
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-400">
            What's on your heart?
          </div>
          <WaterButton variant="primary" onClick={() => setShowNew(true)} style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, fontSize: 18, fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            +
          </WaterButton>
        </div>
      </div>

      {showNew && <NewPostModal onClose={() => setShowNew(false)} onCreate={onNewPost} />}

      <div className="px-0 py-2">
        {loading ? (
          <div className="space-y-2 px-4 pt-2">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 px-4">
            <div className="w-16 h-16 bg-faith-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <p className="font-semibold text-gray-600">Nothing posted yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <PostCard key={post.id} post={post}
                onLike={() => toggleLike(post.id)}
                onUserClick={() => navigate(`/profile/${post.user.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}

function NewPostModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ content: '', type: 'UPDATE', bibleVerse: '' });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  function handleFiles(e) {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setPreviews(selected.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'VIDEO' : 'IMAGE' })));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('content', form.content);
      fd.append('type', form.type);
      if (form.bibleVerse) fd.append('bibleVerse', form.bibleVerse);
      files.forEach(f => fd.append('media', f));
      const res = await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onCreate(res.data);
    } catch {}
    setPosting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Handle + Header */}
        <div className="sticky top-0 bg-white pt-3 pb-3 px-5 border-b border-gray-100 z-10">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400 font-medium">Cancel</button>
            <h3 className="text-base font-bold text-gray-900">New Post</h3>
            <WaterButton variant="primary" onClick={submit} disabled={posting || !form.content.trim()} className="text-sm font-bold px-4 py-1.5">
              {posting ? 'Posting...' : 'Share'}
            </WaterButton>
          </div>
        </div>

        <div className="px-5 pt-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {POST_TYPES.map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                  form.type === t ? TYPE_STYLES[t] + ' shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${form.type === t ? TYPE_DOT[t] : 'bg-gray-300'}`} />
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Text area */}
          <textarea
            autoFocus
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="What's on your heart?"
            className="w-full text-gray-800 text-sm leading-relaxed focus:outline-none resize-none placeholder:text-gray-300"
            rows={5}
          />

          {form.type === 'VERSE' && (
            <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <span className="text-emerald-500 text-sm">📖</span>
              <input
                value={form.bibleVerse}
                onChange={e => setForm(p => ({ ...p, bibleVerse: e.target.value }))}
                placeholder="Bible reference (e.g. John 3:16)"
                className="flex-1 bg-transparent text-sm text-emerald-800 focus:outline-none placeholder:text-emerald-300"
              />
            </div>
          )}

          {/* Media previews */}
          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {previews.map((p, i) => (
                <div key={i} className="relative flex-shrink-0">
                  {p.type === 'VIDEO'
                    ? <video src={p.url} className="w-24 h-24 rounded-xl object-cover" muted />
                    : <img loading="lazy" decoding="async" src={p.url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                  }
                  <button onClick={() => {
                    setPreviews(prev => prev.filter((_, j) => j !== i));
                    setFiles(prev => prev.filter((_, j) => j !== i));
                  }} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media button */}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-faith-600 font-semibold py-2">
            <div className="w-8 h-8 rounded-full bg-faith-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            Add Photo / Video
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onLike, onUserClick }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [comment, setComment] = useState('');
  const [mediaIdx, setMediaIdx] = useState(0);
  const { user } = useAuth();
  const videoRef = useRef();

  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) videoRef.current?.play();
        else videoRef.current?.pause();
      },
      { threshold: 0.5 }
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [post.media]);

  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const res = await api.post(`/posts/${post.id}/comments`, { content: comment });
      setComments(p => [...p, res.data]);
      setComment('');
    } catch {}
  }

  const media = post.media || [];
  const current = media[mediaIdx];
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <div className="bg-white border-b border-gray-100 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div onClick={onUserClick} className="cursor-pointer flex-shrink-0">
          <Avatar user={post.user} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm cursor-pointer leading-tight" onClick={onUserClick}>
              {post.user?.name}
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLES[post.type]}`}>
              {TYPE_LABELS[post.type]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800 leading-relaxed">{post.content}</p>
        {post.bibleVerse && (
          <div className="mt-2 flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
            <span className="text-emerald-500 text-xs">📖</span>
            <p className="text-xs text-emerald-700 font-medium italic">{post.bibleVerse}</p>
          </div>
        )}
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div className="relative bg-gray-100">
          {current?.type === 'VIDEO' ? (
            <video ref={videoRef} src={current.url} muted loop playsInline
              className="w-full max-h-96 object-cover" />
          ) : (
            <img loading="lazy" decoding="async" src={current.url} alt="" className="w-full max-h-96 object-cover" />
          )}
          {media.length > 1 && (
            <>
              <button onClick={() => setMediaIdx(i => Math.max(0, i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                ‹
              </button>
              <button onClick={() => setMediaIdx(i => Math.min(media.length - 1, i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {media.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === mediaIdx ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3">
        <button onClick={onLike}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${post.likedByMe ? 'text-red-500' : 'text-gray-400'}`}>
          <svg width="19" height="19" viewBox="0 0 24 24"
            fill={post.likedByMe ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{post._count?.likes || 0}</span>
        </button>
        <button onClick={() => setShowComments(p => !p)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{comments.length}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar user={c.user} size="sm" />
              <div className="bg-gray-50 rounded-2xl px-3 py-2 flex-1">
                <p className="text-xs font-semibold text-gray-800">{c.user?.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 mt-1">
            <Avatar user={user} size="sm" />
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-faith-300 border border-gray-100" />
          </form>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white px-4 py-4 animate-pulse border-b border-gray-100">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-2.5 bg-gray-200 rounded w-1/5" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
