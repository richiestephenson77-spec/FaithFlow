import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PrayerQueue from './PrayerQueue';

export default function PrayerPage() {
  const navigate = useNavigate();
  const [quota, setQuota] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [target, setTarget] = useState('5');
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    api.get('/quota/today').then(res => {
      setQuota(res.data);
      setTarget(String(res.data.target));
    }).catch(() => {});
  }, []);

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

  if (showQueue) {
    return (
      <PrayerQueue
        onClose={() => setShowQueue(false)}
        onComplete={() => {
          api.get('/quota/today').then(res => setQuota(res.data)).catch(() => {});
        }}
      />
    );
  }

  const pct = quota ? Math.min((quota.completed / quota.target) * 100, 100) : 0;

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Hero */}
      <div className="prayer-gradient px-5 pt-5 pb-10">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <p className="text-white/70 text-sm mb-1">Prayer Room</p>
        <h2 className="text-2xl font-bold text-white mb-4">Who will you pray<br />for today?</h2>

        {/* Quota widget */}
        <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🙏</span>
              <p className="text-white font-semibold text-sm">
                Daily Goal: {quota?.completed ?? '–'} / {quota?.target ?? '–'}
              </p>
            </div>
            <button onClick={() => setShowSettings(true)} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {quota?.isComplete && (
            <p className="text-amber-300 text-xs font-semibold mt-1.5">Daily goal complete!</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="-mt-4 rounded-t-3xl bg-gray-50 px-4 pt-6 pb-24">
        <button
          onClick={() => setShowQueue(true)}
          className="w-full bg-amber-400 text-gray-900 font-bold rounded-2xl py-4 text-base mb-3 shadow-md active:scale-[0.98] transition-transform"
        >
          🙏 Start Daily Prayers
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl py-3.5 text-sm"
        >
          Browse Prayer Feed
        </button>

        {/* Info cards */}
        <div className="mt-6 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="font-bold text-gray-800 text-sm mb-1">How Daily Prayers Work</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Each day you'll receive a set of prayer requests matching your daily goal. Pray for each one for at least 15 seconds, and your streak keeps growing.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="font-bold text-amber-800 text-sm mb-1">🏆 Prayer Warrior Badge</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              Complete your daily goal for the first time to earn the Prayer Warrior badge. It's displayed on your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      {showSettings && (
        <QuotaSettingsSheet
          current={parseInt(target)}
          onSave={saveTarget}
          onClose={() => setShowSettings(false)}
          saving={savingTarget}
        />
      )}
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
                className={`flex-1 py-4 rounded-2xl font-bold text-base border-2 transition-all ${
                  current === n ? 'border-faith-500 bg-faith-50 text-faith-700' : 'border-gray-200 text-gray-600'
                }`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Custom number..."
              min="1" max="100"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400"
            />
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
