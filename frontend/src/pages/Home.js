import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import PrayerSession from '../components/PrayerSession';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';
import TestimonyModal from '../components/TestimonyModal';
import MyPrayerRequestsDrawer from '../components/MyPrayerRequestsDrawer';
import PrayerQueue from './PrayerQueue';
import TopPrayerCard from '../components/TopPrayerCard';
import LocationBanner from '../components/LocationBanner';

const FILTER_TABS = [
  { id: 'ALL',          label: 'All' },
  { id: 'HEALTH',       label: 'Health' },
  { id: 'FAMILY',       label: 'Family' },
  { id: 'CAREER',       label: 'Career' },
  { id: 'FINANCIAL',    label: 'Financial' },
  { id: 'RELATIONSHIP', label: 'Relationship' },
  { id: 'SPIRITUAL',    label: 'Spiritual' },
];

const CATEGORY_LABELS = {
  GENERAL:      'General',
  HEALTH:       'Health',
  FAMILY:       'Family',
  CAREER:       'Career',
  FINANCIAL:    'Financial',
  RELATIONSHIP: 'Relationship',
  SPIRITUAL:    'Spiritual',
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
  const [top3, setTop3] = useState([]);
  const [restPrayers, setRestPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [prayerToast, setPrayerToast] = useState(null);
  const [streak, setStreak] = useState(null);
  const [answeredFeed, setAnsweredFeed] = useState([]);
  const [testimonyRequest, setTestimonyRequest] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [quota, setQuota] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(25);
  const [userCoords, setUserCoords] = useState(() => {
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    return lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null;
  });
  const [showLocationBanner, setShowLocationBanner] = useState(() => {
    return !localStorage.getItem('user_lat') && !localStorage.getItem('location_denied');
  });

  // Show in-app toast when someone prays for you
  useEffect(() => {
    const latest = notifications[0];
    if (latest?.type === 'PRAYER_STARTED') {
      setPrayerToast(latest.message + ' 🙏');
      const t = setTimeout(() => setPrayerToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notifications]);

  // Live prayer count updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handler = ({ prayerRequestId, newCount }) => {
      const update = (arr) => arr.map(r =>
        r.id === prayerRequestId ? { ...r, prayerCount: newCount, totalPrayerCount: newCount } : r
      );
      setTop3(prev => update(prev));
      setRestPrayers(prev => update(prev));
    };
    socket.on('prayer_count_updated', handler);
    return () => socket.off('prayer_count_updated', handler);
  }, [socket]);

  const loadFeed = useCallback(async (isRefresh = false, opts = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params = {};
      const coords = opts.coords !== undefined ? opts.coords : userCoords;
      const useNear = opts.nearMe !== undefined ? opts.nearMe : nearMe;
      const km = opts.radius !== undefined ? opts.radius : radius;
      if (useNear && coords) {
        params.radius = km;
        params.lat = coords.latitude;
        params.lng = coords.longitude;
      }
      const res = await api.get('/prayers/feed', { params });
      setTop3(res.data.top3 || []);
      setRestPrayers(res.data.rest || []);
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [userCoords, nearMe, radius]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Debounce radius re-fetch
  useEffect(() => {
    if (!nearMe) return;
    const t = setTimeout(() => loadFeed(false, { nearMe, radius, coords: userCoords }), 500);
    return () => clearTimeout(t);
  }, [radius]); // eslint-disable-line

  useEffect(() => {
    api.get('/users/me/dashboard').then(res => {
      setStreak({ current: res.data.streak || 0, longest: res.data.longestStreak || 0 });
    }).catch(() => {});
    api.get('/prayers/answered').then(res => setAnsweredFeed(res.data)).catch(() => {});
    api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {});
  }, []);

  function handleTestimonySaved(updatedRequest) {
    setTestimonyRequest(null);
    const update = arr => arr.map(r => r.id === updatedRequest.id ? { ...r, ...updatedRequest } : r);
    setTop3(update);
    setRestPrayers(update);
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
    loadFeed();
  }

  function onNewRequest(request) {
    setRestPrayers(prev => [{ ...request, prayerCount: 0, isTop3: false, rank: prev.length + 4 }, ...prev]);
    setShowNewRequest(false);
  }

  if (activeSession) {
    return <PrayerSession session={activeSession.session} request={activeSession.request} onEnd={onSessionEnd} />;
  }

  if (showQueue) {
    return (
      <PrayerQueue
        onClose={() => setShowQueue(false)}
        onComplete={() => {
          api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {});
          loadFeed(activeCategory);
        }}
      />
    );
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
        <p className="text-white/80 text-sm mb-1">{greeting}, {firstName}</p>
        <h2 className="text-2xl font-bold text-white mb-4">Who will you pray<br />for today?</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-white text-faith-700 font-bold rounded-2xl px-4 py-2.5 text-sm shadow-lg flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Share Request
          </button>
          <button
            onClick={() => setShowQueue(true)}
            className="bg-amber-400 text-gray-900 font-bold rounded-2xl px-4 py-2.5 text-sm shadow-lg flex items-center gap-1.5"
          >
            🙏 Start Daily Prayers
          </button>

          {streak !== null && (
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

          {/* My Prayer Requests button */}
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

      {/* Feed */}
      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-4">
        {streak !== null && streak.current > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706" stroke="none">
                <path d="M12 2c0 0-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11zm0 15a2 2 0 0 1-2-2c0-2 2-5 2-5s2 3 2 5a2 2 0 0 1-2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{streak.current} Day Prayer Streak</p>
              <p className="text-xs text-amber-600">{streakMessage(streak.current)}</p>
            </div>
          </div>
        )}

        {/* Prayer Room tile */}
        <PrayerRoomTile quota={quota} onTap={() => setShowQueue(true)} />

        {/* Location banner */}
        {showLocationBanner && (
          <LocationBanner onLocationGranted={(coords) => {
            setShowLocationBanner(false);
            if (coords) setUserCoords(coords);
          }} />
        )}

        {/* Worldwide / Near Me toggle */}
        <div className="mb-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => { setNearMe(false); loadFeed(false, { nearMe: false }); }}
              className={`flex-1 py-2 rounded-full text-xs font-bold border transition-all ${
                !nearMe ? 'prayer-gradient text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              🌍 Worldwide
            </button>
            <button
              onClick={() => {
                if (!userCoords) {
                  setShowLocationBanner(true);
                  return;
                }
                setNearMe(true);
                loadFeed(false, { nearMe: true, radius, coords: userCoords });
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold border transition-all ${
                nearMe ? 'prayer-gradient text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              📍 Near Me
            </button>
          </div>
          {nearMe && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-semibold text-gray-600">Radius</p>
                <p className="text-xs font-bold text-faith-600">{radius} km</p>
              </div>
              <input
                type="range" min="5" max="100" step="5"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-faith-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>5 km</span><span>100 km</span>
              </div>
            </div>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all tracking-wide ${
                activeCategory === tab.id
                  ? 'prayer-gradient text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pull to refresh */}
        <button onClick={() => loadFeed(true)}
          className="w-full text-center text-xs text-gray-400 mb-3 py-1 active:text-faith-600 transition-colors">
          {refreshing ? '🌍 Refreshing rankings...' : '↻ Refresh rankings'}
        </button>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : (() => {
          const filteredTop3 = activeCategory === 'ALL' ? top3 : top3.filter(p => p.category === activeCategory);
          const filteredRest = activeCategory === 'ALL' ? restPrayers : restPrayers.filter(p => p.category === activeCategory);
          const allEmpty = filteredTop3.length === 0 && filteredRest.length === 0;

          if (allEmpty) return (
            <div className="text-center py-16">
              <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🕊️</span>
              </div>
              <p className="font-semibold text-gray-700">
                {nearMe ? 'No prayers found nearby' : 'No prayer requests yet'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {nearMe ? `Try increasing the radius beyond ${radius} km` : 'Be the first to share one!'}
              </p>
            </div>
          );

          const cardProps = (request) => ({
            key: request.id,
            request,
            currentUserId: user?.id,
            onPray: () => startPraying(request),
            onUserClick: () => navigate(`/profile/${request.user.id}`),
            onMarkAnswered: () => setTestimonyRequest(request),
            onViewTestimony: () => navigate(`/prayer/${request.id}`),
          });

          return (
            <>
              {filteredTop3.length > 0 && (
                <>
                  <div className="mb-3">
                    <p className="font-bold text-gray-900 text-sm">
                      {nearMe ? `📍 Top Prayers Near You` : '🌍 Top Prayers Worldwide'}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {nearMe ? `Within ${radius} km · sorted by most prayed` : 'Updated live · sorted by most prayed'}
                    </p>
                  </div>
                  <div className="space-y-3 mb-6">
                    {filteredTop3.map((request, i) => (
                      <TopPrayerCard {...cardProps(request)} rank={i + 1} showDistance={nearMe} />
                    ))}
                  </div>
                </>
              )}

              {filteredRest.length > 0 && (
                <>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {nearMe ? `Near You · ${radius} km radius` : 'All Prayer Requests · Sorted by most prayed'}
                  </p>
                  <div className="space-y-3">
                    {filteredRest.map(request => (
                      <PrayerCard {...cardProps(request)} showDistance={nearMe} />
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })()}
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

      {showMyRequests && (
        <MyPrayerRequestsDrawer onClose={() => setShowMyRequests(false)} />
      )}
    </div>
  );
}

function PrayerCard({ request, currentUserId, onPray, onUserClick, onMarkAnswered, onViewTestimony, showDistance }) {
  const timeAgo = getTimeAgo(request.createdAt);
  const isOwner = request.user?.id === currentUserId;
  const catLabel = request.category && request.category !== 'GENERAL' ? CATEGORY_LABELS[request.category] : null;

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border fade-in ${
      request.isUrgent ? 'border-red-200 ring-1 ring-red-100' :
      request.isAnswered ? 'border-emerald-100' : 'border-gray-100'
    }`}>
      {/* Top badges */}
      {(request.isUrgent || request.isAnswered || catLabel) && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {request.isUrgent && (
            <span className="bg-red-50 text-red-600 text-[11px] font-semibold px-3 py-1 rounded-full border border-red-100 uppercase tracking-wide">Urgent</span>
          )}
          {request.isAnswered && (
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Answered</span>
          )}
          {catLabel && (
            <span className="bg-gray-50 text-gray-500 text-[11px] font-semibold px-3 py-1 rounded-full border border-gray-100 uppercase tracking-wide">
              {catLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <button onClick={!request.isAnonymous ? onUserClick : undefined} className="flex-shrink-0">
          {request.isAnonymous ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          ) : (
            <Avatar user={request.user} size="md" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {request.isAnonymous ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <p className="text-xs font-semibold text-gray-500">{request.displayLocation || 'Anonymous Believer'}</p>
                </div>
              ) : (
                <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">
                  {request.user?.name}
                </button>
              )}
              {!request.isAnonymous && request.user?.churchName && (
                <p className="text-xs text-faith-500 mt-0.5">{request.user.churchName}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {request.visibility && request.visibility !== 'PUBLIC' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  request.visibility === 'PRIVATE'
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-purple-50 text-purple-600'
                }`}>
                  {request.visibility === 'PRIVATE' ? '🔒 Private' : '✝️ Pastor Only'}
                </span>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 mb-1">
            <h4 className="font-bold text-gray-900 text-sm">{request.title}</h4>
            {showDistance && request.distanceKm != null && (
              <span className="text-[10px] text-gray-400 whitespace-nowrap">📍 {request.distanceKm} km</span>
            )}
          </div>
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
                  {request.currentlyPrayingCount} praying now
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
                  className="prayer-gradient text-white text-xs font-bold rounded-xl px-4 py-2 shadow-sm"
                >
                  Pray Now
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

function PrayerRoomTile({ quota, onTap }) {
  const pct = quota ? Math.min((quota.completed / quota.target) * 100, 100) : 0;
  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl mb-4 overflow-hidden shadow-md active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #f97316 100%)', minHeight: 130 }}
    >
      <div className="px-5 py-4 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Daily Prayer Room</p>
            <h3 className="text-white text-xl font-extrabold leading-tight">Prayer Room</h3>
            <p className="text-white/70 text-xs mt-0.5">Pray for others · See who needs prayer</p>
          </div>
          <span className="text-3xl mt-0.5">🙏</span>
        </div>
        <div className="mt-4">
          {quota ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-white/80 text-xs font-semibold">
                  {quota.completed} / {quota.target} prayers today
                </p>
                {quota.isComplete && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">Complete!</span>
                )}
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <div className="w-32 h-3 bg-white/20 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </button>
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
