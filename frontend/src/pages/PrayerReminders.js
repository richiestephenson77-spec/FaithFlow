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

export default function PrayerReminders() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('07:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/users/prayer-reminder').then(r => {
      setEnabled(r.data.prayerReminderEnabled || false);
      setTime(r.data.prayerReminderTime || '07:00');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch('/users/prayer-reminder', { enabled, time: enabled ? time : null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Prayer Reminders</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Daily Prayer Reminder</p>
                  <p className="text-xs text-gray-400 mt-0.5">Get a reminder to pray each day</p>
                </div>
                <Toggle checked={enabled} onChange={setEnabled} />
              </div>

              {enabled && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Reminder Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50"
                  />
                </div>
              )}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Reminder'}
            </button>

            <p className="text-xs text-gray-400 text-center px-2">
              Reminders help you maintain a consistent prayer habit.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
