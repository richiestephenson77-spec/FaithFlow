import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Row({ label, sublabel, checked, onChange }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    notifyPrayerStarted: true,
    notifyNewFollower: true,
    notifyPostLike: true,
    notifyPostComment: true,
    notifyPrayerAnswered: true,
    notifyConfessionComment: true,
    notifyStreakReminder: true,
    notifyPartnerActivity: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/notification-settings').then(r => {
      setPrefs(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggle(key, val) {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      await api.patch('/users/notification-settings', { [key]: val });
    } catch {
      setPrefs(prefs);
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Push Notifications</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5 divide-y divide-gray-100">
              <Row label="Prayers for You" sublabel="When someone prays for your request" checked={prefs.notifyPrayerStarted} onChange={v => toggle('notifyPrayerStarted', v)} />
              <div className="pt-4">
                <Row label="Prayer Answered" sublabel="When a prayer you prayed for is answered" checked={prefs.notifyPrayerAnswered} onChange={v => toggle('notifyPrayerAnswered', v)} />
              </div>
              <div className="pt-4">
                <Row label="Streak Reminder" sublabel="A nudge when your streak is at risk" checked={prefs.notifyStreakReminder} onChange={v => toggle('notifyStreakReminder', v)} />
              </div>
              <div className="pt-4">
                <Row label="Prayer Partner" sublabel="When your partner shares a new request" checked={prefs.notifyPartnerActivity} onChange={v => toggle('notifyPartnerActivity', v)} />
              </div>
              <div className="pt-4">
                <Row label="Confession Replies" sublabel="When someone comments on your confession" checked={prefs.notifyConfessionComment} onChange={v => toggle('notifyConfessionComment', v)} />
              </div>
              <div className="pt-4">
                <Row label="New Follower" sublabel="When someone follows you" checked={prefs.notifyNewFollower} onChange={v => toggle('notifyNewFollower', v)} />
              </div>
              <div className="pt-4">
                <Row label="Post Likes" sublabel="When someone likes your post" checked={prefs.notifyPostLike} onChange={v => toggle('notifyPostLike', v)} />
              </div>
              <div className="pt-4">
                <Row label="Post Comments" sublabel="When someone comments on your post" checked={prefs.notifyPostComment} onChange={v => toggle('notifyPostComment', v)} />
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 text-center px-2">Changes are saved automatically.</p>
      </div>
    </div>
  );
}
