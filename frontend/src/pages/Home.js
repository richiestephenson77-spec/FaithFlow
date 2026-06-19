import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';
import MyPrayerRequestsDrawer from '../components/MyPrayerRequestsDrawer';
import PrayerQueue from './PrayerQueue';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function streakMessage(n) {
  if (n >= 30) return '30 days of faithful prayer!';
  if (n >= 7) return 'One week streak — keep going!';
  if (n >= 1) return 'Every prayer matters.';
  return 'Start your streak today!';
}

// ── Prayer Room entry banner ──────────────────────────────────────────────────
function PrayerRoomBanner({ quota, onClick }) {
  const pct = quota ? Math.min((quota.completed / quota.target) * 100, 100) : 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden shadow-md active:scale-[0.98] transition-transform mb-4"
      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 45%, #a855f7 80%, #f97316 100%)' }}
    >
      <div className="px-5 py-4 flex items-center gap-4">
        <span className="text-4xl flex-shrink-0">🙏</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold text-base leading-tight">Prayer Room</p>
          <p className="text-white/70 text-xs mt-0.5">See who needs prayer today →</p>
          {quota && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/80 text-[11px] font-semibold">
                  {quota.completed}/{quota.target} today
                  {quota.isComplete && <span className="ml-1.5 text-amber-300">✓ Done!</span>}
                </p>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
const POST_TYPE_BADGE = {
  TESTIMONY: { label: 'Testimony 🙌', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  VERSE:     { label: 'Scripture ✝️',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
};

function PostCard({ post, onLike, onUserClick }) {
  const badge = POST_TYPE_BADGE[post.type];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in">
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={post.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm hover:underline text-left leading-tight">
            {post.user?.name}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(post.createdAt)}</p>
        </div>
        {badge && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.bibleVerse && (
          <p className="text-xs font-semibold text-faith-600 mb-1">{post.bibleVerse}</p>
        )}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* Media */}
      {post.media?.length > 0 && (
        <div className={`grid gap-0.5 ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <div key={m.id} className={`relative ${post.media.length === 1 ? 'h-56' : 'h-36'} bg-gray-100`}>
              {m.type === 'IMAGE'
                ? <img src={m.url} alt="" className="w-full h-full object-cover" />
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

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-50">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
            post.likedByMe ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {post._count?.likes > 0 && post._count.likes}
        </button>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {post._count?.comments > 0 && post._count.comments}
        </div>
      </div>

      {/* Top 3 comments */}
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

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [streak, setStreak] = useState(null);
  const [quota, setQuota] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [prayerToast, setPrayerToast] = useState(null);

  // Prayer-started toast
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
      .finally(() => setPostsLoading(false));
    api.get('/users/me/dashboard')
      .then(res => setStreak({ current: res.data.streak || 0, longest: res.data.longestStreak || 0 }))
      .catch(() => {});
    api.get('/quota/today')
      .then(res => setQuota(res.data))
      .catch(() => {});
  }, []);

  async function handleLike(postId) {
    try {
      await api.post(`/posts/${postId}/like`);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              _count: { ...p._count, likes: p._count.likes + (p.likedByMe ? -1 : 1) },
            }
          : p
      ));
    } catch {}
  }

  if (showQueue) {
    return (
      <PrayerQueue
        onClose={() => setShowQueue(false)}
        onComplete={() => api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {})}
      />
    );
  }

  const firstName = user?.name?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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

      {/* Hero banner */}
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <p className="text-white/80 text-sm mb-1">{greeting}, {firstName}</p>
        <h2 className="text-2xl font-bold text-white mb-4">What's on your<br />heart today?</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/prayer')}
            className="bg-white text-faith-700 font-bold rounded-2xl px-4 py-2.5 text-sm shadow-lg flex items-center gap-1.5"
          >
            🙏 Prayer Room
          </button>

          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-white/20 backdrop-blur border border-white/30 text-white font-bold rounded-2xl px-4 py-2.5 text-sm flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Share Request
          </button>

          {streak !== null && streak.current > 0 && (
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
                <path d="M12 2c0 0-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11zm0 15a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
              </svg>
              <div>
                <p className="text-white font-extrabold text-lg leading-none">{streak.current}</p>
                <p className="text-white/70 text-[10px] leading-tight">day streak</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMyRequests(true)}
            className="w-11 h-11 bg-white/15 backdrop-blur border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0"
            title="My Prayer Requests"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Feed area */}
      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">

        {/* Streak banner */}
        {streak !== null && streak.current > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706" stroke="none">
                <path d="M12 2c0 0-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11zm0 15a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{streak.current} Day Prayer Streak 🔥</p>
              <p className="text-xs text-amber-600">{streakMessage(streak.current)}</p>
            </div>
          </div>
        )}

        {/* Prayer Room entry banner */}
        <PrayerRoomBanner quota={quota} onClick={() => navigate('/prayer')} />

        {/* Community feed */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Community</p>

        {postsLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🕊️</span>
            </div>
            <p className="font-semibold text-gray-700">No posts yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post.id)}
                onUserClick={() => navigate(`/profile/${post.user?.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewRequest && (
        <NewPrayerRequestModal onClose={() => setShowNewRequest(false)} onCreate={() => setShowNewRequest(false)} />
      )}
      {showMyRequests && (
        <MyPrayerRequestsDrawer onClose={() => setShowMyRequests(false)} />
      )}
    </div>
  );
}
