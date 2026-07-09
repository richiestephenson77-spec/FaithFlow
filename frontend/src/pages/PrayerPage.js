import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, RefreshCw, Flame, BookOpen, Users, Plus, Bookmark, Play, Target, Settings, TrendingUp, Pencil, Lock, Cross, Sparkles, HeartHandshake, Sun, Cloud, CloudRain, Heart, Zap, ChevronRight, X } from 'lucide-react';
import { WaterCard, WaterButton, WaterPill } from '../components/water';
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
                <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${request.visibility === 'PRIVATE' ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-600'}`}>
                  {request.visibility === 'PRIVATE' ? <Lock size={10} strokeWidth={2.5} /> : <Cross size={10} strokeWidth={2.5} />}
                </span>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 mb-1">
            <h4 className="font-bold text-gray-900 text-sm">{request.title}</h4>
            {showDistance && request.distanceKm != null && <span className="flex items-center gap-0.5 text-[10px] text-gray-400 whitespace-nowrap"><MapPin size={10} strokeWidth={2} />{request.distanceKm} km</span>}
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
  const location = useLocation();

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
  const [newRequestPrefill, setNewRequestPrefill] = useState('');

  // Gratitude journal state
  const [todayGratitude, setTodayGratitude] = useState(undefined); // undefined=loading, null=none, obj=done
  const [gratitudeStreak, setGratitudeStreak] = useState(0);
  const [showGratitudeSheet, setShowGratitudeSheet] = useState(false);
  const [liveCells, setLiveCells] = useState([]);
  const [gratitudeText, setGratitudeText] = useState('');
  const [gratitudeMood, setGratitudeMood] = useState(null);
  const [gratitudePublic, setGratitudePublic] = useState(false);
  const [savingGratitude, setSavingGratitude] = useState(false);

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
    api.get('/users/me/dashboard').then(res => { setStreak(res.data.streak || 0); setGratitudeStreak(res.data.gratitudeStreak || 0); }).catch(() => {});
    api.get('/gratitude/today').then(res => setTodayGratitude(res.data)).catch(() => setTodayGratitude(null));
    api.get('/prayer-cells').then(res => setLiveCells(res.data || [])).catch(() => {});
  }, []);

  // Handle navigate-with-state from Feelings page
  useEffect(() => {
    if (location.state?.openNewRequest) {
      setNewRequestPrefill(location.state.prefillBody || '');
      setShowNewRequest(true);
      window.history.replaceState({}, '');
    }
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

  async function handleSaveGratitude() {
    if (!gratitudeText.trim()) return;
    setSavingGratitude(true);
    try {
      const res = await api.post('/gratitude', { content: gratitudeText, mood: gratitudeMood, isPublic: gratitudePublic });
      setTodayGratitude(res.data.entry);
      setGratitudeStreak(res.data.streak || gratitudeStreak);
      setShowGratitudeSheet(false);
      setGratitudeText('');
      setGratitudeMood(null);
      setGratitudePublic(false);
    } catch {}
    setSavingGratitude(false);
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
      {/* Hero */}
      <WaterCard tone="blue" radius="sm" style={{ borderRadius: '0 0 24px 24px', padding: '20px 20px 24px' }}>
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(22,52,73,0.1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex items-center gap-3 mb-3"
        >
          <h2 className="text-2xl font-bold leading-tight" style={{ color: '#163449' }}>
            Who will you pray<br />for today?
          </h2>
          {streak !== null && streak > 0 && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0 self-start mt-1"
              style={{ background: 'rgba(201,147,47,0.18)' }}
            >
              <Flame size={11} strokeWidth={2} color="#A8823C" />
              <span className="text-[11px] font-semibold" style={{ color: '#A8823C' }}>{streak}</span>
            </motion.span>
          )}
        </motion.div>

        {/* Daily Goal — water glass card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35, ease: 'easeOut' }}
          className="water-tile-static water-tile-blue px-4 py-3.5"
        >
          <div className="flex items-center justify-between mb-3" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center gap-2">
              <Target size={15} strokeWidth={1.5} color="#163449" />
              <p className="text-xs font-medium" style={{ color: '#163449' }}>Daily Goal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm" style={{ color: '#163449' }}>{quota?.completed ?? 0} / {quota?.target ?? '–'}</span>
              <button onClick={() => setShowSettings(true)} style={{ color: 'rgba(22,52,73,0.4)' }} className="hover:opacity-70 transition-opacity">
                <Settings size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(22,52,73,0.12)', position: 'relative', zIndex: 1 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: '#163449' }}
            />
          </div>
          {quota?.isComplete && <p className="text-xs font-medium mt-2" style={{ color: '#4A6674', position: 'relative', zIndex: 1 }}>Goal complete for today</p>}
        </motion.div>

        {/* Today's Grace — gratitude card */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35, ease: 'easeOut' }}
          onClick={() => !todayGratitude && setShowGratitudeSheet(true)}
          className="water-tile-static water-tile-blue w-full text-left mt-3 px-4 py-3.5"
        >
          <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center gap-2.5">
              <div className="icon-orb flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
                <Sparkles size={15} strokeWidth={1.5} color="#A8823C" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <span className="font-semibold text-sm" style={{ color: '#163449' }}>Today's Grace</span>
              {gratitudeStreak > 0 && (
                <span className="flex items-center gap-0.5 text-[11px]" style={{ color: '#4A6674' }}>
                  <Flame size={10} strokeWidth={2} color="#4A6674" />{gratitudeStreak}d
                </span>
              )}
            </div>
            {!todayGratitude && <ChevronRight size={14} color="#4A6674" />}
          </div>
          {todayGratitude ? (
            <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: '#4A6674', position: 'relative', zIndex: 1 }}>{todayGratitude.content}</p>
          ) : (
            <p className="text-xs mt-1" style={{ color: '#7A9BAD', position: 'relative', zIndex: 1 }}>What did God do today?</p>
          )}
        </motion.button>

        {/* Need a verse — feelings entry */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.35, ease: 'easeOut' }}
          onClick={() => navigate('/feelings')}
          className="water-tile-static water-tile-blue w-full text-left mt-3 px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5" style={{ position: 'relative', zIndex: 1 }}>
            <div className="icon-orb flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
              <HeartHandshake size={15} strokeWidth={1.5} color="#A8823C" style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div>
              <span className="font-semibold text-sm" style={{ color: '#163449' }}>Need a verse right now?</span>
              <p className="text-xs mt-0.5" style={{ color: '#4A6674' }}>Find scripture for how you're feeling</p>
            </div>
          </div>
          <ChevronRight size={14} color="#4A6674" style={{ position: 'relative', zIndex: 1 }} />
        </motion.button>
      </WaterCard>

      {/* Feed */}
      <div className="-mt-5 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {/* Action buttons */}
        <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.3 }} className="flex gap-2 mb-5">
          <WaterButton
            variant="primary"
            onClick={() => setShowQueue(true)}
            className="flex-1 flex items-center justify-center gap-2 text-sm"
            style={{ height: 44 }}
          >
            <Play size={14} strokeWidth={2} />
            Start Prayers
          </WaterButton>
          <WaterButton
            variant="secondary"
            onClick={() => setShowNewRequest(true)}
            className="flex-1 flex items-center justify-center gap-2 text-sm"
            style={{ height: 44 }}
          >
            <Plus size={14} strokeWidth={2} />
            Share Request
          </WaterButton>
          <WaterButton
            variant="secondary"
            onClick={() => setShowMyRequests(true)}
            className="flex items-center justify-center flex-shrink-0"
            style={{ height: 44, width: 44 }}
          >
            <Bookmark size={17} strokeWidth={1.5} color="#4A6674" />
          </WaterButton>
        </motion.div>

        {/* Draft banner */}
        <AnimatePresence>
          {hasDraft && !showNewRequest && (
            <motion.div
              {...fadeUp}
              className="mb-3 rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: '#FAFAFA', border: '1px solid #EFEFEF' }}
            >
              <Pencil size={16} color="#262626" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">You have an unfinished prayer draft</p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setShowNewRequest(true)}
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ border: '1px solid #DBDBDB', color: '#262626' }}
                  >
                    Continue Draft
                  </button>
                  <button
                    onClick={async () => {
                      await api.delete('/prayers/draft').catch(() => {});
                      setHasDraft(false);
                    }}
                    className="text-xs"
                    style={{ color: '#8E8E8E' }}
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

        {/* Worldwide / Near Me toggle */}
        <motion.div {...scaleIn} transition={{ delay: 0.1, duration: 0.25 }} className="mb-3">
          <div className="flex gap-2 mb-2">
            <WaterPill
              active={!nearMe}
              onClick={() => { setNearMe(false); loadFeed(false, { nearMe: false }); }}
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
            >
              <Globe size={13} strokeWidth={1.8} /> Worldwide
            </WaterPill>
            <WaterPill
              active={nearMe}
              onClick={() => {
                if (!userCoords) { setShowLocationBanner(true); return; }
                setNearMe(true); loadFeed(false, { nearMe: true, radius, coords: userCoords });
              }}
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
            >
              <MapPin size={13} strokeWidth={1.8} /> Near Me
            </WaterPill>
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

        {/* Live Now — Stories-style row */}
        {liveCells.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Live Now</p>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {/* Host button */}
              <button
                onClick={() => navigate('/prayer-cells')}
                className="flex flex-col items-center flex-shrink-0"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ border: '2px dashed #262626' }}
                >
                  <Plus size={20} strokeWidth={2} color="#262626" />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 w-16 text-center truncate">Host</span>
              </button>

              {/* Live cell avatars */}
              {liveCells.map(cell => (
                <button
                  key={cell.id}
                  onClick={() => navigate(`/prayer-cells/${cell.id}/guest`)}
                  className="flex flex-col items-center flex-shrink-0"
                >
                  <div className="rounded-full p-[2.5px]" style={{ background: '#ED4956' }}>
                    <div className="rounded-full p-[2px] bg-white">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <Avatar user={cell.host} size="md" />
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1 w-16 text-center truncate">{cell.host?.name?.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category filter chips */}
        <motion.div {...slideInRight} transition={{ delay: 0.15, duration: 0.3 }} className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
          {FILTER_TABS.map(tab => (
            <WaterPill key={tab.id} active={activeCategory === tab.id} onClick={() => setActiveCategory(tab.id)}>
              {tab.label}
            </WaterPill>
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
            <WaterCard tone="blue" style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BookOpen size={26} strokeWidth={1.5} color="#163449" />
            </WaterCard>
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
      {showNewRequest && (
        <NewPrayerRequestModal
          onClose={() => { setShowNewRequest(false); setNewRequestPrefill(''); }}
          onCreate={onNewRequest}
          initialBody={newRequestPrefill}
        />
      )}
      {testimonyRequest && <TestimonyModal request={testimonyRequest} onSave={handleTestimonySaved} onClose={() => setTestimonyRequest(null)} />}
      {showMyRequests && <MyPrayerRequestsDrawer onClose={() => setShowMyRequests(false)} />}

      {/* Gratitude bottom sheet */}
      <AnimatePresence>
        {showGratitudeSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowGratitudeSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 px-5 pt-4 pb-10"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} strokeWidth={1.5} color="#262626" />
                  <span className="font-bold text-[17px] text-gray-900">Today's Grace</span>
                </div>
                <button onClick={() => setShowGratitudeSheet(false)}>
                  <X size={20} strokeWidth={1.8} color="#8E8E8E" />
                </button>
              </div>

              <textarea
                value={gratitudeText}
                onChange={e => setGratitudeText(e.target.value.slice(0, 300))}
                placeholder="Something small God did today..."
                rows={4}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <p className="text-[11px] text-gray-400 text-right mt-1">{gratitudeText.length}/300</p>

              {/* Mood row */}
              <div className="flex items-center gap-3 mt-3">
                {[
                  { id: 'grateful', Icon: Sun },
                  { id: 'peaceful', Icon: Cloud },
                  { id: 'sad',      Icon: CloudRain },
                  { id: 'loved',    Icon: Heart },
                  { id: 'energised',Icon: Zap },
                ].map(({ id, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setGratitudeMood(gratitudeMood === id ? null : id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center border transition-colors"
                    style={{
                      borderColor: gratitudeMood === id ? '#262626' : '#EFEFEF',
                      background: gratitudeMood === id ? 'rgba(0,0,0,0.06)' : 'transparent',
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} color={gratitudeMood === id ? '#262626' : '#8E8E8E'} />
                  </button>
                ))}
              </div>

              {/* Share toggle */}
              <button
                onClick={() => setGratitudePublic(p => !p)}
                className="flex items-center gap-2 mt-4"
              >
                <div
                  className="w-10 h-5 rounded-full transition-colors flex items-center px-0.5"
                  style={{ background: gratitudePublic ? '#262626' : '#DBDBDB' }}
                >
                  <div
                    className="w-4 h-4 bg-white rounded-full shadow transition-transform"
                    style={{ transform: gratitudePublic ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </div>
                <span className="text-[13px] text-gray-600">Share as testimony</span>
              </button>

              <WaterButton
                variant="primary"
                onClick={handleSaveGratitude}
                disabled={!gratitudeText.trim() || savingGratitude}
                className="w-full mt-5 py-3.5 text-[15px] font-bold"
              >
                {savingGratitude ? 'Saving…' : 'Save'}
              </WaterButton>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
