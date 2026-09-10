import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, Flame, BookOpen, Users, Plus, Bookmark, Play, Target, Settings, Pencil, Lock, Cross, Sparkles, HeartHandshake, Sun, Cloud, CloudRain, Heart, Zap, X } from 'lucide-react';
import api from '../utils/api';
import { fadeIn, staggerContainerFast, staggerItem } from '../utils/animations';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from '../components/Avatar';
import PrayerSession from '../components/PrayerSession';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';
import TestimonyModal from '../components/TestimonyModal';
import MyPrayerRequestsDrawer from '../components/MyPrayerRequestsDrawer';
import { hapticMedium, hapticSuccess, hapticLight } from '../utils/haptics';
import PullToRefresh from '../components/PullToRefresh';
import PrayerReceipts from '../components/PrayerReceipts';
import WeeklyRecap from '../components/WeeklyRecap';
import ContentModeration from '../components/ContentModeration';
import { useToast } from '../contexts/ToastContext';
import '../styles/prayer.css';

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
    <div className="bg-white rounded-2xl p-4 animate-pulse" style={{ border: '1px solid #EFEFEF' }}>
      <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-gray-100 rounded-full w-1/3" /><div className="h-4 bg-gray-100 rounded-full w-2/3" /><div className="h-3 bg-gray-100 rounded-full w-full" /></div></div>
    </div>
  );
}

function PrayerCard({ request, currentUserId, onOpen, onPray, onUserClick, onMarkAnswered, onViewTestimony, onHide, showDistance }) {
  const timeAgo = getTimeAgo(request.createdAt);
  // Use backend-provided isOwner — user.id is null for anonymized prayers
  const isOwner = request.isOwner ?? (request.user?.id === currentUserId);
  const catLabel = request.category && request.category !== 'GENERAL' ? CATEGORY_LABELS[request.category] : null;
  const stop = (fn) => (e) => { e.stopPropagation(); fn && fn(); };
  const total = request.totalPrayerCount || 0;

  return (
    <div onClick={onOpen} className={`bg-white rounded-2xl p-4 border fade-in cursor-pointer active:scale-[0.99] transition-transform ${
      request.isUrgent ? 'border-red-200 ring-1 ring-red-100' :
      request.isAnswered ? 'border-emerald-100' : 'border-[#EFEFEF]'}`}>
      {(request.isUrgent || request.isAnswered || catLabel) && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {request.isUrgent && <span className="bg-red-50 text-red-600 text-[11px] font-semibold px-3 py-1 rounded-full border border-red-100 uppercase tracking-wide">Urgent</span>}
          {request.isAnswered && <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">Answered</span>}
          {catLabel && <span className="bg-gray-50 text-gray-500 text-[11px] font-semibold px-3 py-1 rounded-full border border-gray-100 uppercase tracking-wide">{catLabel}</span>}
        </div>
      )}
      <div className="flex items-start gap-3">
        <button onClick={!request.isAnonymous ? stop(onUserClick) : undefined} className="flex-shrink-0">
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
                <button onClick={stop(onUserClick)} className="font-semibold text-gray-900 text-sm leading-tight text-left hover:underline">{request.user?.name}</button>
              )}
              {!request.isAnonymous && request.user?.churchName && <p className="text-xs text-faith-500 mt-0.5" style={{ overflowWrap: 'anywhere' }}>{request.user.churchName}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {request.visibility && request.visibility !== 'PUBLIC' && (
                <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${request.visibility === 'PRIVATE' ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-600'}`}>
                  {request.visibility === 'PRIVATE' ? <Lock size={10} strokeWidth={2.5} /> : <Cross size={10} strokeWidth={2.5} />}
                </span>
              )}
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo}</span>
              {!isOwner && (
                <ContentModeration
                  contentType="PRAYER"
                  contentId={request.id}
                  targetUserId={request.isAnonymous ? undefined : request.user?.id}
                  targetName={request.user?.name}
                  onHidden={onHide}
                  iconSize={16}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 mb-1">
            <h4 className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Fraunces', serif", overflowWrap: 'anywhere' }}>{request.title}</h4>
            {showDistance && request.distanceKm != null && <span className="flex items-center gap-0.5 text-[10px] text-gray-400 whitespace-nowrap"><MapPin size={10} strokeWidth={2} />{request.distanceKm} km</span>}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3" style={{ overflowWrap: 'anywhere' }}>{request.body}</p>
          {request.isAnswered && request.testimonyMessage && (
            <button onClick={stop(onViewTestimony)} className="mt-2 text-xs font-semibold text-emerald-600 hover:underline">View Testimony →</button>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {request.currentlyPrayingCount > 0 ? (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">{request.currentlyPrayingCount} praying now</span>
              ) : total === 0 ? (
                <span className="text-xs font-semibold" style={{ color: '#0A0A0A' }}>Be the first to pray.</span>
              ) : (
                <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={11} strokeWidth={1.5} /> {total} {total === 1 ? 'person praying.' : 'people praying.'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && !request.isAnswered && (
                <button onClick={stop(onMarkAnswered)} className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-1.5">✓ Answered</button>
              )}
              {!request.isAnswered && (
                isOwner ? (
                  <button disabled className="text-xs font-bold rounded-xl px-4 py-2 bg-gray-100 text-gray-400 cursor-not-allowed">Pray Now</button>
                ) : (
                  <button onClick={stop(onPray)} className="text-xs font-bold px-4 py-2 rounded-xl text-white" style={{ background: '#2C4055' }}>Pray Now</button>
                )
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
  const showToast = useToast();
  const location = useLocation();

  const [quota, setQuota] = useState(null);
  const [streak, setStreak] = useState(null);
  const [graceDays, setGraceDays] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [target, setTarget] = useState('5');
  const [savingTarget, setSavingTarget] = useState(false);

  const [top3, setTop3] = useState([]);
  const [restPrayers, setRestPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeSession, setActiveSession] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [testimonyRequest, setTestimonyRequest] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [newRequestPrefill, setNewRequestPrefill] = useState('');

  // Everything secondary — geography, category, personal activity, live
  // rooms, saved requests — lives in this one sheet now.
  const [showOptions, setShowOptions] = useState(false);

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
  const [locatingNearMe, setLocatingNearMe] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [userCoords, setUserCoords] = useState(() => {
    const lat = localStorage.getItem('user_lat');
    const lng = localStorage.getItem('user_lng');
    return lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null;
  });

  const loadFeed = useCallback(async (isRefresh = false, opts = {}) => {
    // PullToRefresh shows its own spinner while it awaits onRefresh, so a
    // pull-triggered reload skips the full skeleton screen; every other
    // reload (initial load, category/scope change) still shows it.
    if (!isRefresh) setLoading(true);
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
    setLoading(false);
      }, [userCoords, nearMe, radius]); // eslint-disable-line

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

  // Quota fetch, hardened: a bare .catch(() => {}) here previously left `quota` stuck at
  // null forever on any transient failure (e.g. DB connection-pool exhaustion), which
  // rendered as "0 / –" with no way to recover short of a full reload. Log the error and
  // retry once after a short delay so a transient blip self-heals.
  const loadQuota = useCallback(async (isRetry = false) => {
    try {
      const res = await api.get('/quota/today');
      setQuota(res.data);
      setTarget(String(res.data.target));
    } catch (err) {
      console.error('Failed to load quota' + (isRetry ? ' (retry)' : '') + ':', err?.response?.status, err?.message);
      if (!isRetry) setTimeout(() => loadQuota(true), 1200);
    }
  }, []);

  useEffect(() => {
    loadQuota();
    api.get('/users/me/dashboard').then(res => { setStreak(res.data.streak || 0); setGratitudeStreak(res.data.gratitudeStreak || 0); setGraceDays(res.data.graceDaysAvailable || 0); }).catch(() => {});
    api.get('/gratitude/today').then(res => setTodayGratitude(res.data)).catch(() => setTodayGratitude(null));
    // Live Now must render ONLY real active rooms: the directory endpoint
    // returns every cell (not just live ones), and its field is `creator`,
    // not `host` — rendering `cell.host` unconditionally was the source of
    // the grey "?" avatars, since Avatar.js falls back to "?" when given no
    // user object at all. Filtering to liveNow here means an empty result
    // is a genuine "nothing is live", not a data mismatch.
    api.get('/prayer-cells').then(res => setLiveCells((res.data || []).filter(c => c.liveNow))).catch(() => {});
  }, [loadQuota]);

  // Handle navigate-with-state from Feelings page
  useEffect(() => {
    if (location.state?.openNewRequest) {
      setNewRequestPrefill(location.state.prefillBody || '');
      setShowNewRequest(true);
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line

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

  // Opening the prayer session only STARTS it (needed for the live "praying
  // now" indicator and to notify the requester) — it must not itself count
  // as a completed prayer. The backend now only counts a session toward
  // totalPrayerCount once it has actually run for the same 15s minimum the
  // "Finish Prayer" button gates on, so tapping Pray Now and immediately
  // cancelling never inflates the count.
  async function startPraying(request) {
    hapticMedium();
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

  async function handleSaveGratitude() {
    if (!gratitudeText.trim()) return;
    setSavingGratitude(true);
    try {
      const res = await api.post('/gratitude', { content: gratitudeText, mood: gratitudeMood, isPublic: gratitudePublic });
      hapticSuccess();
      showToast('Gratitude saved');
      setTodayGratitude(res.data.entry);
      setGratitudeStreak(res.data.streak || gratitudeStreak);
      setShowGratitudeSheet(false);
      setGratitudeText('');
      setGratitudeMood(null);
      setGratitudePublic(false);
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not save gratitude', 'error');
    }
    setSavingGratitude(false);
  }

  // Geolocation fires ONLY here — the moment the user picks "Near me" in the
  // sheet — never on page open. Refusal (or no geolocation support at all)
  // falls back to Worldwide with a short explanation instead of failing silently.
  function chooseNearMe() {
    hapticLight();
    if (userCoords) {
      setNearMe(true);
      setLocationNote('');
      loadFeed(false, { nearMe: true, radius, coords: userCoords });
      return;
    }
    if (!navigator.geolocation) {
      setLocationNote('Location isn’t available on this device. Showing Worldwide.');
      return;
    }
    setLocatingNearMe(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try { await api.patch('/users/location', { latitude, longitude }); } catch {}
        try { localStorage.setItem('user_lat', latitude); localStorage.setItem('user_lng', longitude); } catch {}
        setUserCoords({ latitude, longitude });
        setNearMe(true);
        setLocationNote('');
        setLocatingNearMe(false);
        loadFeed(false, { nearMe: true, radius, coords: { latitude, longitude } });
      },
      () => {
        try { localStorage.setItem('location_denied', 'true'); } catch {}
        setLocatingNearMe(false);
        setNearMe(false);
        setLocationNote('Location access was declined. Showing Worldwide instead.');
      },
      { timeout: 10000 }
    );
  }
  function chooseWorldwide() {
    hapticLight();
    setNearMe(false);
    setLocationNote('');
    loadFeed(false, { nearMe: false });
  }

  const pct = quota ? Math.min((quota.completed / quota.target) * 100, 100) : 0;

  const filteredTop3 = activeCategory === 'ALL' ? top3 : top3.filter(p => p.category === activeCategory);
  const filteredRest = activeCategory === 'ALL' ? restPrayers : restPrayers.filter(p => p.category === activeCategory);
  // Requests appear immediately, as ONE feed — top3 first then rest, exactly
  // the order the server returns (do not resort client-side): no separate
  // "Top Prayers"/rank-medal section above it. The server's own ordering
  // (urgent, then fewest prayers, then newest, with its own tie/pagination
  // behavior) is untouched; this just stops decorating it with a leaderboard.
  const combined = [...filteredTop3, ...filteredRest];

  // Open the immersive prayer flow, carrying the current (filtered) queue + quota
  function openImmersive(request) {
    navigate(`/pray/${request.id}`, { state: { queue: combined, quota } });
  }
  function startImmersive() {
    if (combined.length === 0) return;
    hapticMedium();
    navigate(`/pray/${combined[0].id}`, { state: { queue: combined, quota } });
  }

  const hideRequest = (id) => {
    setTop3(prev => prev.filter(r => r.id !== id));
    setRestPrayers(prev => prev.filter(r => r.id !== id));
  };

  const cardProps = (request) => ({
    request, currentUserId: user?.id,
    onOpen: () => openImmersive(request),
    onPray: () => startPraying(request),
    onUserClick: () => navigate(`/profile/${request.user?.id}`),
    onMarkAnswered: () => setTestimonyRequest(request),
    onViewTestimony: () => navigate(`/prayer/${request.id}`),
    onHide: () => hideRequest(request.id),
  });

  const scopeLabel = `${nearMe ? `Near me · ${radius} km` : 'Worldwide'} · ${activeCategory === 'ALL' ? 'All requests' : FILTER_TABS.find(t => t.id === activeCategory)?.label}`;

  return (
    <PullToRefresh onRefresh={() => loadFeed(true)}>
    <div className="prayer-app bg-white min-h-full">
      {/* Compact header — title + Share, hooked to the existing composer */}
      <header className="header">
        <div>
          <h1>Who will you pray for today?</h1>
          <p className="subtitle">Pause for someone today.</p>
        </div>
        <button className="icon-button" aria-label="Share a prayer request" onClick={() => { hapticLight(); setShowNewRequest(true); }}>
          <Plus size={20} strokeWidth={1.9} />
        </button>
      </header>

      {/* Worldwide / Filter & more — the one row between header and requests */}
      <div className="feedbar">
        <span>{scopeLabel}</span>
        <button className="text-button" aria-haspopup="dialog" onClick={() => { hapticLight(); setShowOptions(true); }}>Filter &amp; more ↓</button>
      </div>

      {/* Draft banner — an in-progress compose the user hasn't finished, not
          decorative chrome, so it stays in the primary view. */}
      <AnimatePresence>
        {hasDraft && !showNewRequest && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: '#FAFAFA', border: '1px solid #EFEFEF' }}
          >
            <Pencil size={16} color="#262626" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">You have an unfinished prayer draft</p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowNewRequest(true)} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ border: '1px solid #DBDBDB', color: '#262626' }}>
                  Continue Draft
                </button>
                <button
                  onClick={async () => { await api.delete('/prayers/draft').catch(() => {}); setHasDraft(false); }}
                  className="text-xs" style={{ color: '#8E8E8E' }}
                >
                  Discard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prayer feed — appears immediately, no hero/stats/rankings above it */}
      <section className="feed" aria-label="Prayer requests">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
        ) : combined.length === 0 ? (
          <motion.div {...fadeIn} className="text-center py-16 px-8">
            <div className="bg-white" style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid #EFEFEF' }}>
              <BookOpen size={26} strokeWidth={1.5} color="#0A0A0A" />
            </div>
            <p className="font-semibold" style={{ color: '#0A0A0A' }}>{nearMe ? 'No prayers found nearby' : 'No prayer requests yet'}</p>
            <p className="text-sm mt-1" style={{ color: '#8E8E8E' }}>{nearMe ? `Try increasing the radius beyond ${radius} km` : 'Be the first to share a request with the community.'}</p>
            {!nearMe && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowNewRequest(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#2C4055' }}
              >
                <Plus size={15} strokeWidth={2} /> Share a request
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div className="space-y-3" {...staggerContainerFast} initial="initial" animate="animate">
            {combined.map(request => (
              <motion.div key={request.id} variants={staggerItem}>
                <PrayerCard {...cardProps(request)} showDistance={nearMe} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {combined.length > 0 && <p className="order-note">Urgent first. Then those with fewer prayers.</p>}

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

      {/* Options sheet — geography, category, personal activity, live rooms,
          saved requests. Fixed overlay in the page's own tree (same pattern
          as QuotaSettingsSheet below), so .prayer-app already reaches it —
          no portal needed. No transform anywhere (mx-auto, not
          left-1/2 -translate-x-1/2), no shadow. */}
      <AnimatePresence>
        {showOptions && (
          <>
            <div className="sheet-backdrop" onClick={() => setShowOptions(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="sheet"
              role="dialog" aria-modal="true" aria-labelledby="prayer-options-title"
            >
              <div className="sheet-head">
                <h2 id="prayer-options-title">Prayer, your way</h2>
                <button className="icon-button" type="button" aria-label="Close" onClick={() => setShowOptions(false)}>
                  <X size={18} strokeWidth={1.9} />
                </button>
              </div>

              <fieldset>
                <legend>Where</legend>
                <div className="choices">
                  <label><input type="radio" name="scope" checked={!nearMe} onChange={chooseWorldwide} /><span><Globe size={13} strokeWidth={1.8} style={{ marginRight: 6 }} />Worldwide</span></label>
                  <label><input type="radio" name="scope" checked={nearMe} disabled={locatingNearMe} onChange={chooseNearMe} /><span><MapPin size={13} strokeWidth={1.8} style={{ marginRight: 6 }} />{locatingNearMe ? 'Locating…' : 'Near me'}</span></label>
                </div>
                {locationNote && <p className="muted" style={{ marginTop: 8 }}>{locationNote}</p>}
                {nearMe && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-semibold text-gray-600">Radius</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--slate)' }}>{radius} km</p>
                    </div>
                    <input type="range" min="5" max="100" step="5" value={radius}
                      onChange={e => setRadius(Number(e.target.value))} className="w-full" style={{ accentColor: 'var(--slate)' }} />
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend>Category</legend>
                <div className="choices">
                  {FILTER_TABS.map(tab => (
                    <label key={tab.id}>
                      <input type="radio" name="category" checked={activeCategory === tab.id} onChange={() => { hapticLight(); setActiveCategory(tab.id); }} />
                      <span>{tab.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <details>
                <summary>Your prayer activity</summary>
                <div className="pt-3">
                  {/* Daily Goal */}
                  <div className="bg-white rounded-2xl px-4 py-3 mb-3" style={{ border: '1px solid #EFEFEF' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Target size={15} strokeWidth={1.5} color="#0A0A0A" />
                        <p className="text-xs font-medium" style={{ color: '#0A0A0A' }}>Daily Goal</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm" style={{ color: '#0A0A0A' }}>{quota?.completed ?? 0} / {quota?.target ?? '–'}</span>
                        <button onClick={() => setShowSettings(true)} style={{ color: '#9AA6AD' }} aria-label="Change daily goal">
                          <Settings size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#EFEFEF' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#2C4055' }} />
                    </div>
                    {quota?.isComplete && <p className="text-xs font-medium mt-2" style={{ color: '#6B7680' }}>Goal complete for today</p>}
                  </div>

                  {(streak > 0 || graceDays > 0) && (
                    <div className="flex items-center gap-2 mb-3">
                      {streak > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(44,64,85,0.1)' }}>
                          <Flame size={13} strokeWidth={2} color="#0A0A0A" /><span className="text-xs font-semibold" style={{ color: '#0A0A0A' }}>{streak} day streak</span>
                        </span>
                      )}
                      {graceDays > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(44,64,85,0.08)' }} title="Grace days — each can save your streak once">
                          <span className="text-xs">❄️</span><span className="text-xs font-semibold" style={{ color: '#0A0A0A' }}>{graceDays} grace</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2.5 mb-3">
                    <button
                      onClick={() => !todayGratitude && setShowGratitudeSheet(true)}
                      className="bg-white rounded-2xl flex-1 text-left px-3 py-2.5 flex items-center gap-2"
                      style={{ border: '1px solid #EFEFEF' }}
                    >
                      <Sparkles size={15} strokeWidth={1.8} color="#0A0A0A" className="flex-shrink-0" />
                      <span className="font-semibold text-xs" style={{ color: '#0A0A0A' }}>Today's Grace</span>
                      {gratitudeStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] ml-auto" style={{ color: '#6B7680' }}>
                          <Flame size={9} strokeWidth={2} color="#6B7680" />{gratitudeStreak}d
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => navigate('/feelings')}
                      className="bg-white rounded-2xl flex-1 text-left px-3 py-2.5 flex items-center gap-2"
                      style={{ border: '1px solid #EFEFEF' }}
                    >
                      <HeartHandshake size={15} strokeWidth={1.8} color="#0A0A0A" className="flex-shrink-0" />
                      <span className="font-semibold text-xs" style={{ color: '#0A0A0A' }}>Need a verse</span>
                    </button>
                  </div>

                  {/* Self-contained: each renders null / its own summary+detail */}
                  <WeeklyRecap />
                  <PrayerReceipts />
                </div>
              </details>

              <details>
                <summary>Live prayer rooms</summary>
                <div className="pt-3">
                  <button
                    onClick={() => { setShowOptions(false); navigate('/prayer-cells'); }}
                    className="flex items-center gap-2 text-sm font-semibold mb-3"
                    style={{ color: 'var(--slate)' }}
                  >
                    <Plus size={15} strokeWidth={2} /> Host a live prayer room
                  </button>
                  {liveCells.length === 0 ? (
                    <p className="muted">No live prayer rooms right now.</p>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                      {liveCells.map(cell => (
                        <button
                          key={cell.id}
                          onClick={() => { setShowOptions(false); navigate(`/prayer-cells/${cell.id}/guest`); }}
                          className="flex flex-col items-center flex-shrink-0"
                        >
                          <div className="rounded-full p-[2.5px]" style={{ background: '#ED4956' }}>
                            <div className="rounded-full p-[2px] bg-white">
                              <div className="w-12 h-12 rounded-full overflow-hidden">
                                <Avatar user={cell.creator} size="md" />
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-600 mt-1 w-16 text-center truncate">{cell.creator?.name?.split(' ')[0] || 'Believer'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <details>
                <summary>Saved requests &amp; more</summary>
                <div className="pt-3 space-y-2">
                  <button
                    onClick={() => { setShowOptions(false); setShowMyRequests(true); }}
                    className="w-full flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl bg-white"
                    style={{ border: '1px solid #EFEFEF', color: '#0A0A0A' }}
                  >
                    <Bookmark size={15} strokeWidth={1.6} /> Your saved requests
                  </button>
                  <button
                    onClick={() => { setShowOptions(false); startImmersive(); }}
                    className="w-full flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl text-white"
                    style={{ background: '#2C4055' }}
                  >
                    <Play size={14} strokeWidth={2.2} fill="#fff" /> Start praying
                  </button>
                  <button
                    onClick={() => navigate('/answered')}
                    className="w-full flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl bg-white"
                    style={{ border: '1px solid #EFEFEF', color: '#0A0A0A' }}
                  >
                    <Sparkles size={14} strokeWidth={1.8} /> See answered prayers
                  </button>
                </div>
              </details>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="fixed bottom-0 w-full max-w-md mx-auto left-0 right-0 bg-white rounded-t-3xl z-50 px-5 pt-4 pb-10"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} strokeWidth={1.5} color="#262626" />
                  <span className="font-bold text-[17px] text-gray-900">Today's Grace</span>
                </div>
                <button onClick={() => setShowGratitudeSheet(false)} aria-label="Close">
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
                  className="w-10 h-5 rounded-full flex items-center px-0.5"
                  style={{ background: gratitudePublic ? '#262626' : '#DBDBDB' }}
                >
                  <div
                    className="w-4 h-4 bg-white rounded-full"
                    style={{ marginLeft: gratitudePublic ? 20 : 0, transition: 'margin-left 0.15s ease' }}
                  />
                </div>
                <span className="text-[13px] text-gray-600">Share as testimony</span>
              </button>

              <button
                onClick={handleSaveGratitude}
                disabled={!gratitudeText.trim() || savingGratitude}
                className="w-full mt-5 py-3.5 text-[15px] font-bold text-white rounded-xl disabled:opacity-45"
                style={{ background: '#2C4055' }}
              >
                {savingGratitude ? 'Saving…' : 'Save'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {showSettings && <QuotaSettingsSheet current={parseInt(target)} onSave={saveTarget} onClose={() => setShowSettings(false)} saving={savingTarget} />}
    </div>
    </PullToRefresh>
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
              className="font-bold px-4 py-2.5 text-sm text-white rounded-xl disabled:opacity-45"
              style={{ background: '#2C4055' }}>
              {saving ? '...' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">Current goal: {current} prayers/day</p>
        </div>
      </div>
    </div>
  );
}
