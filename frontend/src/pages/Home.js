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
import { hapticLight } from '../utils/haptics';

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
    <div className="bg-white rounded-2xl overflow-hidden fade-in" style={{ border: '1px solid #EFEFEF' }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2.5">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={post.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onUserClick} className="font-semibold text-sm hover:underline text-left leading-tight" style={{ color: '#0A0A0A' }}>
            {post.user?.name}
          </button>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs" style={{ color: '#8E8E8E' }}>{getTimeAgo(post.createdAt)}</p>
            {post.location && <p className="text-xs" style={{ color: '#8E8E8E' }}>📍 {post.location}</p>}
          </div>
        </div>
        {badge && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        )}
        {isOwn && (
          <button onClick={onOptions} aria-label="Post options" className="w-11 h-11 -mr-2 flex items-center justify-center flex-shrink-0">
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

      <div className="flex items-center gap-1 px-2 py-1.5" style={{ borderTop: '1px solid #F5F5F5' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          onClick={() => { hapticLight(); onLike(); }}
          className={`flex items-center gap-1.5 text-sm font-semibold h-11 px-2 transition-colors ${post.likedByMe ? 'text-red-500' : 'text-gray-400'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {post._count?.likes > 0 && post._count.likes}
        </motion.button>
        <div className="flex items-center gap-1.5 text-sm h-11 px-2" style={{ color: '#9AA6AD' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="bg-white rounded-2xl p-4 animate-pulse" style={{ border: '1px solid #EFEFEF' }}>
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

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  // The create-post modal lives in Layout (opened from the header avatar); ask
  // it to open so the empty-state CTA reuses the same flow.
  function openCreatePost() {
    hapticLight();
    window.dispatchEvent(new CustomEvent('open_create_post'));
  }

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
          <div className="text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center animate-fade-in" style={{ background: 'rgba(44,64,85,0.96)' }}>
            {prayerToast}
          </div>
        </div>
      )}

      <div className="px-4 pt-3">
        {/* Greeting — gives Home a purposeful focal identity */}
        <motion.div {...fadeUp} className="mb-4">
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>
            {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8E8E8E' }}>Here's your community today</p>
        </motion.div>

        {/* Prayer Room entry — flat premium hero, the primary action */}
        <motion.button
          {...fadeUp}
          {...springTap}
          onClick={() => { hapticLight(); navigate('/prayer'); }}
          className="w-full rounded-2xl bg-white px-5 py-4 mb-6 text-left"
          style={{ border: '1px solid #EFEFEF' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-base" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Prayer Room</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C4055] animate-pulse" />
              <span className="text-[11px] font-semibold" style={{ color: '#0A0A0A' }}>
                {liveCount != null ? `${liveCount} praying now` : 'Open'}
              </span>
            </div>
          </div>

          <p className="text-sm mt-0.5" style={{ color: '#8E8E8E' }}>Pray for others and keep your streak alive</p>

          <div className="flex items-center justify-between mt-3.5">
            <div className="flex items-center gap-4">
              {[
                { Icon: Flame,    label: 'Streaks' },
                { Icon: BookOpen, label: 'Verses' },
                { Icon: Radio,    label: 'Live Cells' },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={14} strokeWidth={1.7} color="#0A0A0A" />
                  <span style={{ fontSize: 11, color: '#6B7680' }}>{label}</span>
                </div>
              ))}
            </div>
            <span className="flex items-center gap-0.5 text-xs font-semibold flex-shrink-0" style={{ color: '#0A0A0A' }}>
              Enter <ChevronRight size={14} />
            </span>
          </div>
        </motion.button>

        {/* Community label */}
        <motion.p {...fadeIn} transition={{ delay: 0.1, duration: 0.25 }} className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8E8E8E' }}>Community</motion.p>

        {/* Posts */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : posts.length === 0 ? (
          <motion.div {...fadeUp} className="text-center py-16 px-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(44,64,85,0.08)' }}>
              <span className="text-2xl">🕊️</span>
            </div>
            <p className="font-semibold" style={{ color: '#0A0A0A' }}>Your community feed is quiet</p>
            <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>Share an update, testimony, or verse to get things started.</p>
            <motion.button
              {...springTap}
              onClick={openCreatePost}
              className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#2C4055' }}
            >
              Share something
            </motion.button>
          </motion.div>
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
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl"
            style={{ background: 'rgba(44,64,85,0.96)' }}
          >
            {feedToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
