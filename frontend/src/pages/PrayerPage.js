import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, RefreshCw, Flame, BookOpen, Users, Plus, Bookmark, Play, Target, Settings, TrendingUp, Pencil } from 'lucide-react';
import api from '../utils/api';
import { fadeUp, fadeIn, scaleIn, slideInRight, slideUp, staggerContainer, staggerContainerFast, staggerItem } from '../utils/animations';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import PrayerSession from '../components/PrayerSession';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';
import TestimonyModal from '../components/TestimonyModal';
import MyPrayerRequestsDrawer from '../components/MyPrayerRequestsDrawer';
import TopPrayerCard from '../components/TopPrayerCard';
import LocationBanner from '../components/LocationBanner';
import PrayerQueue from './PrayerQueue';

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
  GENERAL: 'General', HEALTH: 'Health', FAMILY: 'Family',
  CAREER: 'Career', FINANCIAL: 'Financial', RELATIONSHIP: 'Relationship', SPIRITUAL: 'Spiritual',
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-gray-100 rounded-full w-1/3" /><div className="h-4 bg-gray-100 rounded-full w-2/3" /><div className="h-3 bg-gray-100 rounded-full w-full" /></div></div>
    </div>
  );
}

function PrayerCard({ request, currentUserId, onPray, onUserClick, onMarkAnswered, onViewTestimony, showDistance }) {
  const timeAgo = getTimeAgo(request.createdAt);
  // Use backend-provided isOwner — user.id is null for anonymized prayers
  const isOwner = request.isOwner ?? (request.user?.id === currentUserId);
  const catLabel = request.category && request.category !== 'GENERAL' ? CATEGORY_LABELS[request.category] : null;

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border fade-in ${
      request.isUrgent ? 'border-red-200 ring-1 ring-red-100' :
      request.isAnswered ? 'border-emerald-100' : 'border-gray-100'}`}>
      {(request.isUrgent || request.isAnswered || catLabel) && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {request.isUrgent && <span className="bg-red-50 text-red-600 text-[11px] font-semibold px-3 py-1 rounded-full border border-red-100 uppercase tracking-wide">Urgent</span>}
          {request.isAnswered && <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Answered</span>}
          {catLabel && <span className="bg-gray-50 text-gray-500 text-[11px] font-semibold px-3 py-1 rounded-full border border-gray-100 uppercase tracking-wide">{catLabel}</span>}
        </div>
      )}
      <div className="flex items-start gap-3">
        <button onClick={!request.isAnonymous ? onUserClick : undefined} className="flex-shrink-0">
          {request.isAnonymous ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          ) : <Avatar user={request.user} size="md" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {request.isAnonymous ? (
                <div className="flex items-center gap-1 mt-0.5"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><p className="text-xs font-semibold text-gray-500">{request.displayLocation || 'Anonymous Believer'}</p></div>
              ) : (
                <button onClick={onUserClick} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">{request.user?.name}</button>
              )}
              {!request.isAnonymous && request.user?.churchName && <p className="text-xs text-faith-500 mt-0.5">{request.user.churchName}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {request.visibility && request.visibility !== 'PUBLIC' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${request.visibility === 'PRIVATE' ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-600'}`}>
                  {request.visibility === 'PRIVATE' ? '🔒' : '✝️'}
                </span>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 mb-1">
            <h4 className="font-bold text-gray-900 text-sm">{request.title}</h4>
            {showDistance && request.distanceKm != null && <span className="text-[10px] text-gray-400 whitespace-nowrap">📍 {request.distanceKm} km</span>}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{request.body}</p>
          {request.isAnswered && request.testimonyMessage && (
            <button onClick={onViewTestimony} className="mt-2 text-xs font-semibold text-emerald-600 hover:underline">View Testimony →</button>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              {request.currentlyPrayingCount > 0
                ? <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">{request.currentlyPrayingCount} praying now</span>
                : <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={11} strokeWidth={1.5} /> {request.totalPrayerCount || 0} prayed</span>}
            </div>
            <div className="flex items-center gap-2">
              {isOwner && !request.isAnswered && (
                <button onClick={onMarkAnswered} className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-1.5">✓ Answered</button>
              )}
              {!request.isAnswered && (
                <button onClick={!isOwner ? onPray : undefined} disabled={isOwner}
                  className={`text-xs font-bold rounded-xl px-4 py-2 shadow-sm ${isOwner ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'prayer-gradient text-white'}`}>
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

export default function PrayerPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [quota, setQuota] = useState(null);
  const [streak, setStreak] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [target, setTarget] = useState('5');
  const [savingTarget, setSavingTarget] = useState(false);

  const [top3, setTop3] = useState([]);
  const [restPrayers, setRestPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeSession, setActiveSession] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [testimonyRequest, setTestimonyRequest] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);

  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(25);
  const [userCoords, setUserCoords] = useState(() => {
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    return lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null;
  });
  const [showLocationBanner, setShowLocationBanner] = useState(() =>
    !localStorage.getItem('user_lat') && !localStorage.getItem('location_denied')
  );

  const loadFeed = useCallback(async (isRefresh = false, opts = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const params = {};
      const coords = opts.coords !== undefined ? opts.coords : userCoords;
      const useNear = opts.nearMe !== undefined ? opts.nearMe : nearMe;
      const km = opts.radius !== undefined ? opts.radius : radius;
      if (useNear && coords) { params.radius = km; params.lat = coords.latitude; params.lng = coords.longitude; }
      const res = await api.get('/prayers/feed', { params });
      setTop3(res.data.top3 || []);
      setRestPrayers(res.data.rest || []);
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [userCoords, nearMe, radius]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    api.get('/prayers/draft').then(res => {
      setHasDraft(!!(res.data && (res.data.title || res.data.body)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!nearMe) return;
    const t = setTimeout(() => loadFeed(false, { nearMe, radius, coords: userCoords }), 500);
    return () => clearTimeout(t);
  }, [radius]); // eslint-disable-line

  useEffect(() => {
    api.get('/quota/today').then(res => { setQuota(res.data); setTarget(String(res.data.target)); }).catch(() => {});
    api.get('/users/me/dashboard').then(res => setStreak(res.data.streak || 0)).catch(() => {});
  }, []);

  // Live prayer count updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ prayerRequestId, newCount }) => {
      const update = arr => arr.map(r => r.id === prayerRequestId ? { ...r, prayerCount: newCount, totalPrayerCount: newCount } : r);
      setTop3(prev => update(prev));
      setRestPrayers(prev => update(prev));
    };
    socket.on('prayer_count_updated', handler);
    return () => socket.off('prayer_count_updated', handler);
  }, [socket]);

  async function saveTarget(val) {
    const n = parseInt(val);
    if (!n || n < 1) return;
    setSavingTarget(true);
    try {
      await api.post('/quota/settings', { target: n });
      setQuota(q => q ? { ...q, target: n } : q);
      setTarget(String(n));
      setShowSettings(false);
    } catch {}
    setSavingTarget(false);
  }

  async function startPraying(request) {
    try {
      const res = await api.post(`/prayers/${request.id}/start`);
      setActiveSession({ session: res.data, request });
    } catch {}
  }

  function onSessionEnd() { setActiveSession(null); loadFeed(); }

  function onNewRequest(request) {
    setRestPrayers(prev => [{ ...request, prayerCount: 0, isTop3: false, rank: prev.length + 4 }, ...prev]);
    setShowNewRequest(false);
    setHasDraft(false);
  }

  function handleTestimonySaved(updatedRequest) {
    setTestimonyRequest(null);
    const update = arr => arr.map(r => r.id === updatedRequest.id ? { ...r, ...updatedRequest } : r);
    setTop3(update); setRestPrayers(update);
  }

  if (activeSession) {
    return <PrayerSession session={activeSession.session} request={activeSession.request} onEnd={onSessionEnd} />;
  }

  if (showQueue) {
    return (
      <PrayerQueue
        onClose={() => setShowQueue(false)}
        onComplete={() => api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {})}
      />
    );
  }

  const pct = quota ? Math.min((quota.completed / quota.target) * 100, 100) : 0;

  const filteredTop3 = activeCategory === 'ALL' ? top3 : top3.filter(p => p.category === activeCategory);
  const filteredRest = activeCategory === 'ALL' ? restPrayers : restPrayers.filter(p => p.category === activeCategory);

  const cardProps = (request) => ({
    key: request.id, request, currentUserId: user?.id,
    onPray: () => startPraying(request),
    onUserClick: () => navigate(`/profile/${request.user?.id}`),
    onMarkAnswered: () => setTestimonyRequest(request),
    onViewTestimony: () => navigate(`/prayer/${request.id}`),
  });

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Hero — deep navy premium */}
      <div className="px-5 pt-5 pb-12" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <motion.h2
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-3xl font-bold text-white leading-tight mb-3"
        >
          Who will you pray<br />for today?
        </motion.h2>

        {streak !== null && streak > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }}
            className="flex items-center gap-1.5 mb-5"
          >
            <Flame size={14} strokeWidth={2} color="#f59e0b" />
            <p className="text-white/60 text-xs font-medium">{streak} day streak</p>
          </motion.div>
        )}
        {streak === null || streak === 0 ? <div className="mb-5" /> : null}

        {/* Daily Goal — frosted glass card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={15} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
              <p className="text-white/70 text-xs font-medium">Daily Goal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold text-sm">{quota?.completed ?? 0} / {quota?.target ?? '–'}</span>
              <button onClick={() => setShowSettings(true)} className="text-white/40 hover:text-white/70 transition-colors">
                <Settings size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full bg-amber-400"
            />
          </div>
          {quota?.isComplete && <p className="text-amber-400 text-xs font-medium mt-2">Goal complete for today</p>}
        </motion.div>
      </div>

      {/* Feed */}
      <div className="-mt-5 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {/* Action buttons */}
        <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.3 }} className="flex gap-2 mb-5">
          <motion.button
            whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setShowQueue(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-400 text-gray-900 font-medium rounded-xl text-sm shadow-sm"
            style={{ height: 44 }}
          >
            <Play size={14} strokeWidth={2} />
            Start Prayers
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setShowNewRequest(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl text-sm"
            style={{ height: 44 }}
          >
            <Plus size={14} strokeWidth={2} />
            Share Request
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setShowMyRequests(true)}
            className="flex items-center justify-center bg-white border border-gray-200 rounded-xl flex-shrink-0"
            style={{ height: 44, width: 44 }}
          >
            <Bookmark size={17} strokeWidth={1.5} color="#6b7280" />
          </motion.button>
        </motion.div>

        {/* Draft banner */}
        <AnimatePresence>
          {hasDraft && !showNewRequest && (
            <motion.div
              {...fadeUp}
              className="mb-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-3"
            >
              <Pencil size={16} color="#F59E0B" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-800 font-medium">You have an unfinished prayer draft</p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowNewRequest(true)}
                    className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full"
                  >
                    Continue Draft
                  </button>
                  <button
                    onClick={async () => {
                      await api.delete('/prayers/draft').catch(() => {});
                      setHasDraft(false);
                    }}
                    className="text-xs text-amber-500"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location banner */}
        {showLocationBanner && (
          <LocationBanner onLocationGranted={(coords) => {
            setShowLocationBanner(false);
            if (coords) setUserCoords(coords);
          }} />
        )}

        {/* Worldwide / Near Me toggle — sliding pill */}
        <motion.div {...scaleIn} transition={{ delay: 0.1, duration: 0.25 }} className="mb-3">
          <div className="relative flex bg-gray-100 rounded-full p-1 mb-2" style={{ height: 38 }}>
            {/* Sliding background */}
            <motion.div
              layoutId="togglePill"
              className="absolute top-1 bottom-1 rounded-full"
              style={{ background: '#1a1a2e', width: 'calc(50% - 4px)', left: nearMe ? 'calc(50%)' : '4px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => { setNearMe(false); loadFeed(false, { nearMe: false }); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full relative z-10 transition-colors ${!nearMe ? 'text-white' : 'text-gray-500'}`}
            >
              <Globe size={13} strokeWidth={1.8} /> Worldwide
            </button>
            <button
              onClick={() => {
                if (!userCoords) { setShowLocationBanner(true); return; }
                setNearMe(true); loadFeed(false, { nearMe: true, radius, coords: userCoords });
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full relative z-10 transition-colors ${nearMe ? 'text-white' : 'text-gray-500'}`}
            >
              <MapPin size={13} strokeWidth={1.8} /> Near Me
            </button>
          </div>
          <AnimatePresence>
            {nearMe && (
              <motion.div {...slideUp} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold text-gray-600">Radius</p>
                  <p className="text-xs font-bold text-faith-600">{radius} km</p>
                </div>
                <input type="range" min="5" max="100" step="5" value={radius}
                  onChange={e => setRadius(Number(e.target.value))} className="w-full accent-faith-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>5 km</span><span>100 km</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Live Prayer Cells banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/prayer-cells')}
          className="mx-0 mb-4 rounded-2xl p-4 flex items-center justify-between cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white font-semibold text-sm">Live Prayer Cells</span>
            </div>
            <p className="text-white/70 text-xs mt-0.5">Join or host a live prayer session</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </motion.div>

        {/* Category filter tabs */}
        <motion.div {...slideInRight} transition={{ delay: 0.15, duration: 0.3 }} className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
          {FILTER_TABS.map(tab => (
            <motion.button key={tab.id} whileTap={{ scale: 0.93 }} onClick={() => setActiveCategory(tab.id)}
              className={`flex-shrink-0 px-4 rounded-full text-sm font-medium border-0 transition-all ${
                activeCategory === tab.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={{
                height: 34,
                background: activeCategory === tab.id ? '#1a1a2e' : undefined,
              }}>
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Refresh */}
        <button onClick={() => loadFeed(true)}
          className="w-full text-center text-xs text-gray-400 mb-4 py-1 active:text-gray-600 transition-colors">
          <span className="flex items-center justify-center gap-1.5">
            <RefreshCw size={11} strokeWidth={2} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh rankings'}
          </span>
        </button>

        {/* Prayer feed */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : filteredTop3.length === 0 && filteredRest.length === 0 ? (
          <motion.div {...fadeIn} className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm" style={{ background: '#1a1a2e' }}>
              <BookOpen size={26} strokeWidth={1.5} color="white" />
            </div>
            <p className="font-semibold text-gray-700">{nearMe ? 'No prayers found nearby' : 'No prayer requests yet'}</p>
            <p className="text-sm text-gray-400 mt-1">{nearMe ? `Try increasing the radius beyond ${radius} km` : 'Be the first to share one!'}</p>
          </motion.div>
        ) : (
          <>
            {filteredTop3.length > 0 && (
              <>
                <motion.div {...fadeIn} className="flex items-start gap-2 mb-3">
                  <TrendingUp size={14} strokeWidth={1.8} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 text-base">{nearMe ? 'Top Prayers Near You' : 'Top Prayers Worldwide'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{nearMe ? `Within ${radius} km · sorted by most prayed` : 'Updated live · sorted by most prayed'}</p>
                  </div>
                </motion.div>
                <motion.div className="space-y-3 mb-6" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} initial="initial" animate="animate">
                  {filteredTop3.map((request, i) => (
                    <motion.div key={request.id} variants={staggerItem}>
                      <TopPrayerCard {...cardProps(request)} rank={i + 1} showDistance={nearMe} />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
            {filteredRest.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {nearMe ? `Near You · ${radius} km radius` : 'All Prayer Requests'}
                </p>
                <motion.div className="space-y-3" {...staggerContainerFast} initial="initial" animate="animate">
                  {filteredRest.map(request => (
                    <motion.div key={request.id} variants={staggerItem}>
                      <PrayerCard {...cardProps(request)} showDistance={nearMe} />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showNewRequest && <NewPrayerRequestModal onClose={() => setShowNewRequest(false)} onCreate={onNewRequest} />}
      {testimonyRequest && <TestimonyModal request={testimonyRequest} onSave={handleTestimonySaved} onClose={() => setTestimonyRequest(null)} />}
      {showMyRequests && <MyPrayerRequestsDrawer onClose={() => setShowMyRequests(false)} />}
      {showSettings && <QuotaSettingsSheet current={parseInt(target)} onSave={saveTarget} onClose={() => setShowSettings(false)} saving={savingTarget} />}
    </div>
  );
}

function QuotaSettingsSheet({ current, onSave, onClose, saving }) {
  const [custom, setCustom] = useState('');
  const presets = [2, 5, 10];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-10" onClick={e => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h3 className="font-bold text-gray-900 text-sm">Daily Prayer Goal</h3>
          <div className="w-12" />
        </div>
        <div className="px-4 py-5 space-y-3">
          <p className="text-xs text-gray-400 text-center">How many people do you want to pray for each day?</p>
          <div className="flex gap-3">
            {presets.map(n => (
              <button key={n} onClick={() => onSave(n)} disabled={saving}
                className={`flex-1 py-4 rounded-2xl font-bold text-base border-2 transition-all ${current === n ? 'border-faith-500 bg-faith-50 text-faith-700' : 'border-gray-200 text-gray-600'}`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Custom number..." min="1" max="100"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400" />
            <button onClick={() => custom && onSave(custom)} disabled={saving || !custom}
              className="prayer-gradient text-white font-bold rounded-xl px-4 py-2.5 text-sm disabled:opacity-40">
              {saving ? '...' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">Current goal: {current} prayers/day</p>
        </div>
      </div>
    </div>
  );
}
