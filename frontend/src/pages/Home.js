import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import PrayerSession from '../components/PrayerSession';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';
import TestimonyModal from '../components/TestimonyModal';

const FILTER_TABS = [
  { id: 'ALL',          label: 'All',             emoji: '🙏' },
  { id: 'HEALTH',       label: 'Health',          emoji: '🏥' },
  { id: 'FAMILY',       label: 'Family',          emoji: '👨‍👩‍👧' },
  { id: 'CAREER',       label: 'Career',          emoji: '💼' },
  { id: 'FINANCIAL',    label: 'Financial',       emoji: '💰' },
  { id: 'RELATIONSHIP', label: 'Relationship',    emoji: '💑' },
  { id: 'SPIRITUAL',    label: 'Spiritual',       emoji: '✝️' },
];

const CATEGORY_LABELS = {
  GENERAL:      { label: 'General',         emoji: '🙏' },
  HEALTH:       { label: 'Health',          emoji: '🏥' },
  FAMILY:       { label: 'Family',          emoji: '👨‍👩‍👧' },
  CAREER:       { label: 'Career',          emoji: '💼' },
  FINANCIAL:    { label: 'Financial',       emoji: '💰' },
  RELATIONSHIP: { label: 'Relationship',    emoji: '💑' },
  SPIRITUAL:    { label: 'Spiritual',       emoji: '✝️' },
};

function streakMessage(n) {
  if (n >= 100) return 'Incredible commitment to prayer.';
  if (n >= 30) return '30 days of consistency. Keep going.';
  if (n >= 7) return 'One week of faithful prayer.';
  if (n >= 1) return 'Every prayer matters.';
  return 'Start your streak today!';
}

export default function Home() {
  const { user } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [prayerToast, setPrayerToast] = useState(null);
  const [streak, setStreak] = useState(null);
  const [answeredFeed, setAnsweredFeed] = useState([]);
  const [testimonyRequest, setTestimonyRequest] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Show in-app toast when someone prays for you
  useEffect(() => {
    const latest = notifications[0];
    if (latest?.type === 'PRAYER_STARTED') {
      setPrayerToast(latest.message + ' 🙏');
      const t = setTimeout(() => setPrayerToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notifications]);

  const loadFeed = useCallback(async (category = 'ALL') => {
    setLoading(true);
    try {
      const res = await api.get(`/prayers/feed${category !== 'ALL' ? `?category=${category}` : ''}`);
      setFeed(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(activeCategory); }, [loadFeed, activeCategory]);

  useEffect(() => {
    api.get('/users/me/dashboard').then(res => {
      setStreak({ current: res.data.streak || 0, longest: res.data.longestStreak || 0 });
    }).catch(() => {});
    api.get('/prayers/answered').then(res => setAnsweredFeed(res.data)).catch(() => {});
  }, []);

  function handleTestimonySaved(updatedRequest) {
    setTestimonyRequest(null);
    setFeed(prev => prev.map(r => r.id === updatedRequest.id ? { ...r, ...updatedRequest } : r));
    setAnsweredFeed(prev => [updatedRequest, ...prev].slice(0, 5));
  }

  async function startPraying(request) {
    try {
      const res = await api.post(`/prayers/${request.id}/start`);
      setActiveSession({ session: res.data, request });
    } catch {}
  }

  function onSessionEnd() {
    setActiveSession(null);
    loadFeed(activeCategory);
  }

  function onNewRequest(request) {
    setFeed(prev => [request, ...prev]);
    setShowNewRequest(false);
  }

  if (activeSession) {
    return <PrayerSession session={activeSession.session} request={activeSession.request} onEnd={onSessionEnd} />;
  }

  const firstName = user?.name?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Prayer notification toast */}
      {prayerToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center animate-fade-in">
            {prayerToast}
          </div>
        </div>
      )}
      {/* Hero Banner */}
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <p className="text-white/80 text-sm mb-1">{greeting}, {firstName} 🙏</p>
        <h2 className="text-2xl font-bold text-white mb-4">Who will you pray<br />for today?</h2>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-white text-faith-700 font-bold rounded-2xl px-5 py-3 text-sm shadow-lg flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Share a Prayer Request
          </button>

          {streak !== null && (
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <span className="text-2xl leading-none">🔥</span>
              <div>
                <p className="text-white font-extrabold text-lg leading-none">{streak.current}</p>
                <p className="text-white/70 text-[10px] leading-tight">day streak</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-4">
        {streak !== null && streak.current > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-sm font-bold text-amber-800">{streak.current} Day Prayer Streak</p>
              <p className="text-xs text-amber-600">{streakMessage(streak.current)}</p>
            </div>
          </div>
        )}

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                activeCategory === tab.id
                  ? 'prayer-gradient text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Prayer Requests</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🕊️</span>
            </div>
            <p className="font-semibold text-gray-700">No prayer requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to share one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map(request => (
              <PrayerCard
                key={request.id}
                request={request}
                currentUserId={user?.id}
                onPray={() => startPraying(request)}
                onUserClick={() => navigate(`/profile/${request.user.id}`)}
                onMarkAnswered={() => setTestimonyRequest(request)}
                onViewTestimony={() => navigate(`/prayer/${request.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Answered Prayers section */}
      {answeredFeed.length > 0 && (
        <div className="px-4 pb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Answered Prayers 🙌</h3>
          <div className="space-y-3">
            {answeredFeed.map(r => (
              <AnsweredCard key={r.id} request={r} onView={() => navigate(`/prayer/${r.id}`)} onUserClick={() => navigate(`/profile/${r.user.id}`)} />
            ))}
          </div>
        </div>
      )}

      {showNewRequest && (
        <NewPrayerRequestModal onClose={() => setShowNewRequest(false)} onCreate={onNewRequest} />
      )}

      {testimonyRequest && (
        <TestimonyModal
          request={testimonyRequest}
          onSave={handleTestimonySaved}
          onClose={() => setTestimonyRequest(null)}
        />
      )}
    </div>
  );
}

function PrayerCard({ request, currentUserId, onPray, onUserClick, onMarkAnswered, onViewTestimony }) {
  const timeAgo = getTimeAgo(request.createdAt);
  const isOwner = request.user?.id === currentUserId;
  const cat = request.category && request.category !== 'GENERAL' ? CATEGORY_LABELS[request.category] : null;

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border fade-in ${
      request.isUrgent ? 'border-red-200 ring-1 ring-red-100' :
      request.isAnswered ? 'border-emerald-100' : 'border-gray-100'
    }`}>
      {/* Top badges */}
      {(request.isUrgent || request.isAnswered || cat) && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {request.isUrgent && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">🚨 Urgent</span>
          )}
          {request.isAnswered && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">🙌 Answered Prayer</span>
          )}
          {cat && (
            <span className="bg-faith-50 text-faith-600 text-xs font-semibold px-3 py-1 rounded-full">
              {cat.emoji} {cat.label}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={request.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">
                {request.user?.name}
              </button>
              {request.user?.churchName && (
                <p className="text-xs text-faith-500 mt-0.5">{request.user.churchName}</p>
              )}
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">{timeAgo}</span>
          </div>

          <h4 className="font-bold text-gray-900 text-sm mt-2 mb-1">{request.title}</h4>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{request.body}</p>

          {request.isAnswered && request.testimonyMessage && (
            <button onClick={onViewTestimony} className="mt-2 text-xs font-semibold text-emerald-600 hover:underline">
              View Testimony →
            </button>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              {request.currentlyPrayingCount > 0 ? (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  🙏 {request.currentlyPrayingCount} praying now
                </span>
              ) : (
                <span className="text-xs text-gray-400">{request.totalPrayerCount} prayers</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwner && !request.isAnswered && (
                <button
                  onClick={onMarkAnswered}
                  className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-1.5"
                >
                  ✓ Answered
                </button>
              )}
              {!request.isAnswered && (
                <button
                  onClick={onPray}
                  className="prayer-gradient text-white text-xs font-bold rounded-xl px-4 py-2 shadow-sm flex items-center gap-1.5"
                >
                  <span>🙏</span> Pray Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnsweredCard({ request, onView, onUserClick }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 fade-in">
      <div className="flex items-start gap-3">
        <button onClick={onUserClick} className="flex-shrink-0">
          <Avatar user={request.user} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm hover:underline text-left">
            {request.user?.name}
          </button>
          <h4 className="font-bold text-gray-900 text-sm mt-1">{request.title}</h4>
          {request.testimonyMessage && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mt-1">{request.testimonyMessage}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-emerald-600 font-semibold">🙌 {request._count?.sessions || 0} prayed for this</span>
            <button onClick={onView} className="text-xs font-bold text-faith-600">
              Read Testimony →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded-full w-1/3" />
          <div className="h-4 bg-gray-100 rounded-full w-2/3" />
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-4/5" />
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
