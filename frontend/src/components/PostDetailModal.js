import { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function PostDetailModal({ post: initialPost, onClose }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [mediaIdx, setMediaIdx] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/posts/${post.id}/comments`).then(r => setComments(r.data)).catch(() => {});
  }, [post.id]);

  async function toggleLike() {
    const res = await api.post(`/posts/${post.id}/like`);
    setPost(p => ({
      ...p,
      likedByMe: res.data.liked,
      _count: { ...p._count, likes: p._count.likes + (res.data.liked ? 1 : -1) },
    }));
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await api.post(`/posts/${post.id}/comments`, { content: comment });
    setComments(p => [...p, res.data]);
    setComment('');
  }

  const media = post.media || [];
  const current = media[mediaIdx];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}>

        {/* Media */}
        {media.length > 0 && (
          <div className="relative bg-black">
            {current?.type === 'VIDEO' ? (
              <video
                src={current.url}
                controls
                autoPlay
                muted
                className="w-full max-h-72 object-contain"
              />
            ) : (
              <img src={current?.url} alt="" className="w-full max-h-72 object-contain" />
            )}
            {media.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {media.map((_, i) => (
                  <button key={i} onClick={() => setMediaIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full ${i === mediaIdx ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Content */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={post.user} size="sm" />
            <div>
              <p className="font-semibold text-sm">{post.user?.name}</p>
              <p className="text-xs text-gray-400">{getTimeAgo(post.createdAt)}</p>
            </div>
            <button onClick={onClose} className="ml-auto text-gray-400 text-xl">✕</button>
          </div>

          <p className="text-sm text-gray-700 mb-2">{post.content}</p>
          {post.bibleVerse && (
            <p className="text-xs text-faith-600 bg-faith-50 px-3 py-2 rounded-lg italic">📖 {post.bibleVerse}</p>
          )}

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <button onClick={toggleLike}
              className={`flex items-center gap-1 text-sm font-medium ${post.likedByMe ? 'text-red-500' : 'text-gray-400'}`}>
              <span>{post.likedByMe ? '❤️' : '🤍'}</span>
              <span>{post._count?.likes || 0}</span>
            </button>
            <span className="text-gray-400 text-sm">💬 {comments.length}</span>
          </div>

          {/* Comments */}
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Avatar user={c.user} size="sm" />
                <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                  <p className="text-xs font-semibold">{c.user?.name}</p>
                  <p className="text-xs text-gray-600">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitComment} className="flex gap-2 mt-3">
            <Avatar user={user} size="sm" />
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-faith-400 border border-gray-100"
            />
          </form>
        </div>
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
