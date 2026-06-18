import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import PrayerSession from '../components/PrayerSession';
import NewPrayerRequestModal from '../components/NewPrayerRequestModal';

export default function Home() {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const res = await api.get('/prayers/feed');
      setFeed(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

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
    setFeed(prev => [{ ...request, currentlyPrayingCount: 0, totalPrayerCount: 0 }, ...prev]);
    setShowNewRequest(false);
  }

  if (activeSession) {
    return <PrayerSession session={activeSession.session} request={activeSession.request} onEnd={onSessionEnd} />;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Pray Now CTA */}
      <div className="prayer-gradient rounded-2xl p-5 text-white shadow-lg">
        <p className="text-white/80 text-sm mb-1">Good day, {user?.name?.split(' ')[0]} 🙏</p>
        <h2 className="text-xl font-bold mb-3">Who will you pray for today?</h2>
        <button
          onClick={() => setShowNewRequest(true)}
          className="bg-white text-faith-700 font-bold rounded-xl px-5 py-2.5 text-sm shadow"
        >
          + Share a Prayer Request
        </button>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Prayer Requests</h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🕊️</div>
            <p>No prayer requests yet.</p>
            <p className="text-sm">Be the first to share one!</p>
          </div>
        ) : (
          feed.map(request => (
            <PrayerCard key={request.id} request={request} onPray={() => startPraying(request)} />
          ))
        )}
      </div>

      {showNewRequest && (
        <NewPrayerRequestModal onClose={() => setShowNewRequest(false)} onCreate={onNewRequest} />
      )}
    </div>
  );
}

function PrayerCard({ request, onPray }) {
  const timeAgo = getTimeAgo(request.createdAt);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 fade-in">
      <div className="flex items-start gap-3">
        <Avatar user={request.user} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">{request.user?.name}</p>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
          {request.user?.churchName && (
            <p className="text-xs text-faith-600 mb-1">⛪ {request.user.churchName}</p>
          )}
          <h4 className="font-bold text-gray-900 mt-1 mb-1">{request.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{request.body}</p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {request.currentlyPrayingCount > 0 && (
                <span className="text-green-600 font-medium animate-prayer">
                  🙏 {request.currentlyPrayingCount} praying now
                </span>
              )}
              <span>{request.totalPrayerCount} total prayers</span>
            </div>
            <button
              onClick={onPray}
              className="prayer-gradient text-white text-xs font-bold rounded-xl px-4 py-2 shadow"
            >
              Pray Now
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
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
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
