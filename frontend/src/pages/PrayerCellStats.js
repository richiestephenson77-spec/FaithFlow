import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Radio, Clock, Users, CalendarDays, Activity } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const ACCENT = '#2C4055';

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr)) / 86400000));
}

function fmtDuration(mins) {
  const m = Math.max(0, mins || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

function lastActiveLabel(dateStr) {
  if (!dateStr) return 'Never';
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatCard({ icon, value, label }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EFEFEF' }}>
      <span className="w-9 h-9 rounded-full flex items-center justify-center mb-2.5" style={{ background: 'rgba(44,64,85,0.08)' }}>{icon}</span>
      <p className="text-2xl font-bold leading-none" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>{value}</p>
      <p className="text-xs mt-1.5" style={{ color: '#8E8E8E' }}>{label}</p>
    </div>
  );
}

export default function PrayerCellStats() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await api.get(`/prayer-cells/${cellId}/stats`); setStats(res.data); }
    catch { showToast('Could not load stats', 'error'); }
    setLoading(false);
  }, [cellId, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-full" style={{ background: '#FAFAFA' }}>
      <div className="bg-white px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Cell Stats</h1>
      </div>

      {loading ? (
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" style={{ border: '1px solid #EFEFEF' }} />)}
        </div>
      ) : !stats ? null : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Radio size={17} color={ACCENT} strokeWidth={2} />} value={stats.totalSessions} label="Prayer sessions held" />
            <StatCard icon={<Clock size={17} color={ACCENT} strokeWidth={2} />} value={fmtDuration(stats.totalMinutes)} label="Total time in prayer" />
            <StatCard icon={<Users size={17} color={ACCENT} strokeWidth={2} />} value={stats.memberCount} label={stats.memberCount === 1 ? 'Member' : 'Members'} />
            <StatCard icon={<CalendarDays size={17} color={ACCENT} strokeWidth={2} />} value={daysSince(stats.createdAt)} label="Days since created" />
          </div>

          {/* Last active */}
          <div className="mt-3 bg-white rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid #EFEFEF' }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(44,64,85,0.08)' }}>
              <Activity size={17} color={ACCENT} strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>Last active</p>
              <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{lastActiveLabel(stats.lastActiveAt)}</p>
            </div>
          </div>

          <p className="text-[11px] text-center mt-5 leading-relaxed px-6" style={{ color: '#B0B0B0' }}>
            Session time is counted while members pray together live and banked when the room empties.
          </p>
        </div>
      )}
    </div>
  );
}
