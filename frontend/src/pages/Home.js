import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, BookOpen, Radio, ChevronRight, MoreHorizontal } from 'lucide-react';
import api from '../utils/api';
import { track } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import MyPrayerRequestsDrawer from '../components/MyPrayerRequestsDrawer';
import PostOptionsSheet from '../components/PostOptionsSheet';
import { fadeUp, fadeIn, staggerContainer, staggerItem, springTap } from '../utils/animations';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


const POST_TYPE_BADGE_ALL = {
  UPDATE:    { label: '📢 Update',    cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  TESTIMONY: { label: '🙌 Testimony', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  VERSE:     { label: '📖 Verse',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
};

function PostCard({ post, onLike, onUserClick, currentUserId, onOptions }) {
  const badge = POST_TYPE_BADGE_ALL[post.type];
  const isOwn = post.user?.id === currentUserId || post.userId === currentUserId;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={post.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm hover:underline text-left leading-tight">
            {post.user?.name}
          </button>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-400">{getTimeAgo(post.createdAt)}</p>
            {post.location && <p className="text-xs text-gray-400">📍 {post.location}</p>}
          </div>
        </div>
        {badge && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        )}
        {isOwn && (
          <button onClick={onOptions} className="p-1.5 -mr-1 flex-shrink-0">
            <MoreHorizontal size={18} strokeWidth={1.8} color="#9ca3af" />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        {post.bibleVerse && (
          <p className="text-xs font-semibold text-faith-600 mb-1">{post.bibleVerse}</p>
        )}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {post.media?.length > 0 && (
        <div className={`grid gap-0.5 ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <div key={m.id} className={`relative ${post.media.length === 1 ? 'h-56' : 'h-36'} bg-gray-100`}>
              {m.type === 'IMAGE'
                ? <img loading="lazy" decoding="async" src={m.url} alt="" className="w-full h-full object-cover" />
                : <video src={m.url} className="w-full h-full object-cover" controls />
              }
              {i === 3 && post.media.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white font-bold text-lg">+{post.media.length - 4}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-50">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${post.likedByMe ? 'text-red-500' : 'text-gray-400'}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {post._count?.likes > 0 && post._count.likes}
        </button>
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {post._count?.comments > 0 && post._count.comments}
        </div>
      </div>

      {post.comments?.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {post.comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar user={c.user} size="xs" />
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-gray-700">{c.user?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-gray-100 rounded-full w-1/3" />
          <div className="h-3 bg-gray-100 rounded-full w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [prayerToast, setPrayerToast] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);
  const [feedToast, setFeedToast] = useState('');
  const [liveCount, setLiveCount] = useState(null);

  function showFeedToast(msg) {
    setFeedToast(msg);
    setTimeout(() => setFeedToast(''), 2500);
  }

  useEffect(() => {
    const latest = notifications[0];
    if (latest?.type === 'PRAYER_STARTED') {
      setPrayerToast(latest.message + ' 🙏');
      const t = setTimeout(() => setPrayerToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notifications]);

  useEffect(() => {
    api.get('/posts/feed')
      .then(res => setPosts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/prayers/live-count').then(res => setLiveCount(res.data.count)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      track('post_created', { type: e.detail?.type });
      setPosts(prev => [e.detail, ...prev]);
    };
    window.addEventListener('post_created', handler);
    return () => window.removeEventListener('post_created', handler);
  }, []);

  async function handleLike(postId) {
    try {
      await api.post(`/posts/${postId}/like`);
      track('post_liked');
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) } }
          : p
      ));
    } catch {}
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Prayer-started toast */}
      {prayerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center animate-fade-in">
            {prayerToast}
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        {/* Prayer Room entry tile */}
        <motion.button
          {...fadeUp}
          {...springTap}
          onClick={() => navigate('/prayer')}
          className="water-tile-static water-tile-blue w-full px-5 pt-4 pb-3 mb-5 text-left"
          style={{ minHeight: 106 }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
            <span className="font-bold text-base" style={{ color: '#163449' }}>Prayer Room</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C4055] animate-pulse" />
              <span className="text-[11px] font-semibold" style={{ color: '#2C4055' }}>
                {liveCount != null ? `${liveCount} praying now` : 'Open'}
              </span>
            </div>
          </div>

          {/* Middle — icon previews */}
          <div className="flex items-center gap-5 mt-3" style={{ position: 'relative', zIndex: 1 }}>
            {[
              { Icon: Flame,    label: 'Streaks' },
              { Icon: BookOpen, label: 'Verses' },
              { Icon: Radio,    label: 'Live Cells' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon size={14} strokeWidth={1.6} color="#4A6674" />
                <span style={{ fontSize: 9, color: '#6B7680' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom-right chevron */}
          <div className="flex justify-end mt-2" style={{ position: 'relative', zIndex: 1 }}>
            <ChevronRight size={16} color="rgba(22,52,73,0.4)" />
          </div>
        </motion.button>

        {/* Community label */}
        <motion.p {...fadeIn} transition={{ delay: 0.1, duration: 0.25 }} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Community</motion.p>

        {/* Posts */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🕊️</p>
            <p className="font-semibold text-gray-700">No posts yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <motion.div className="space-y-3" {...staggerContainer}>
            <AnimatePresence>
              {posts.map(post => (
                <motion.div
                  key={post.id}
                  {...staggerItem}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  layout
                >
                  <PostCard
                    post={post}
                    onLike={() => handleLike(post.id)}
                    onUserClick={() => navigate(`/profile/${post.user?.id}`)}
                    currentUserId={user?.id}
                    onOptions={() => setOptionsPost(post)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {showMyRequests && <MyPrayerRequestsDrawer onClose={() => setShowMyRequests(false)} />}

      {optionsPost && (
        <PostOptionsSheet
          post={optionsPost}
          onClose={() => setOptionsPost(null)}
          onUpdated={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
          }}
          onArchived={id => {
            setPosts(prev => prev.filter(p => p.id !== id));
            showFeedToast('Post archived');
          }}
          onDeleted={id => {
            setPosts(prev => prev.filter(p => p.id !== id));
            showFeedToast('Post deleted');
          }}
        />
      )}

      <AnimatePresence>
        {feedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl"
          >
            {feedToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
