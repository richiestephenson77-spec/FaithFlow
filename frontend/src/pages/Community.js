import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';

const POST_TYPES = ['UPDATE', 'TESTIMONY', 'VERSE'];
const TYPE_LABELS = { UPDATE: '📢 Update', TESTIMONY: '🌟 Testimony', VERSE: '📖 Verse' };
const TYPE_COLORS = {
  UPDATE: 'bg-blue-50 text-blue-700',
  TESTIMONY: 'bg-yellow-50 text-yellow-700',
  VERSE: 'bg-green-50 text-green-700',
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
    <div className="px-4 py-4">
      {/* Composer trigger */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 cursor-pointer"
        onClick={() => setShowNew(true)}>
        <div className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-400 border border-gray-200">
            Share a testimony, verse, or update...
          </div>
          <button className="prayer-gradient text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold shadow flex-shrink-0">
            +
          </button>
        </div>
      </div>

      {showNew && <NewPostModal onClose={() => setShowNew(false)} onCreate={onNewPost} />}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">✨</div>
          <p>Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post}
              onLike={() => toggleLike(post.id)}
              onUserClick={() => navigate(`/profile/${post.user.id}`)} />
          ))}
        </div>
      )}
    </div>
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
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-8 fade-in max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Type selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {POST_TYPES.map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border whitespace-nowrap transition-colors ${
                form.type === t ? 'border-faith-500 bg-faith-50 text-faith-700' : 'border-gray-200 text-gray-500'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Media previews */}
        {previews.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {previews.map((p, i) => (
              <div key={i} className="relative flex-shrink-0">
                {p.type === 'VIDEO'
                  ? <video src={p.url} className="w-24 h-24 rounded-xl object-cover" muted />
                  : <img src={p.url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                }
                <button onClick={() => {
                  const next = previews.filter((_, j) => j !== i);
                  const nextFiles = files.filter((_, j) => j !== i);
                  setPreviews(next);
                  setFiles(nextFiles);
                }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <textarea
            autoFocus
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="What's on your heart?"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none"
            rows={4}
          />

          {form.type === 'VERSE' && (
            <input
              value={form.bibleVerse}
              onChange={e => setForm(p => ({ ...p, bibleVerse: e.target.value }))}
              placeholder="e.g. John 3:16"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
            />
          )}

          {/* Media button */}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-faith-600 font-medium">
            <span className="text-lg">📷</span> Add Photos / Videos
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFiles} />

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm">Cancel</button>
            <button type="submit" disabled={posting || !form.content.trim()}
              className="flex-1 prayer-gradient text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60">
              {posting ? 'Posting...' : 'Share'}
            </button>
          </div>
        </form>
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

  // Autoplay video when in view
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div onClick={onUserClick} className="cursor-pointer flex-shrink-0">
          <Avatar user={post.user} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm cursor-pointer" onClick={onUserClick}>
              {post.user?.name}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[post.type]}`}>
              {TYPE_LABELS[post.type]}
            </span>
          </div>
          <p className="text-xs text-gray-400">{timeAgo}</p>
        </div>
      </div>

      {/* Caption */}
      <p className="px-4 text-sm text-gray-700 leading-relaxed mb-2">{post.content}</p>
      {post.bibleVerse && (
        <p className="mx-4 mb-2 text-xs text-faith-600 bg-faith-50 px-3 py-2 rounded-lg italic">📖 {post.bibleVerse}</p>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div className="relative bg-black">
          {current?.type === 'VIDEO' ? (
            <video
              ref={videoRef}
              src={current.url}
              muted
              loop
              playsInline
              className="w-full max-h-80 object-contain"
            />
          ) : (
            <img src={current.url} alt="" className="w-full max-h-80 object-contain" />
          )}
          {media.length > 1 && (
            <>
              <button onClick={() => setMediaIdx(i => Math.max(0, i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">
                ‹
              </button>
              <button onClick={() => setMediaIdx(i => Math.min(media.length - 1, i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">
                ›
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {media.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === mediaIdx ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-50">
        <button onClick={onLike}
          className={`flex items-center gap-1.5 text-sm font-medium ${post.likedByMe ? 'text-red-500' : 'text-gray-400'}`}>
          <span className="text-lg">{post.likedByMe ? '❤️' : '🤍'}</span>
          {post._count?.likes || 0}
        </button>
        <button onClick={() => setShowComments(p => !p)}
          className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
          <span className="text-lg">💬</span>
          {comments.length}
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar user={c.user} size="sm" />
              <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                <p className="text-xs font-semibold">{c.user?.name}</p>
                <p className="text-xs text-gray-600">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 mt-2">
            <Avatar user={user} size="sm" />
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-faith-400 border border-gray-100" />
          </form>
        </div>
      )}
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
