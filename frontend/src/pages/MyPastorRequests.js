import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { WaterCard, WaterButton } from '../components/water';

const STATUS_STYLES = {
  PENDING:   'bg-gray-100 text-gray-500',
  PRAYED:    'bg-faith-50 text-faith-600',
  RESPONDED: 'bg-emerald-50 text-emerald-700',
};
const STATUS_LABELS = { PENDING: 'Pending', PRAYED: 'Prayed', RESPONDED: 'Responded' };

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MyPastorRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/pastors/my-requests').then(res => setRequests(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-full">
      <WaterCard tone="blue" style={{ borderRadius: '0 0 24px 24px', padding: '16px 16px 28px' }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,52,73,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="text-lg font-bold" style={{ color: '#0A0A0A' }}>My Pastor Requests</h2>
        </div>
      </WaterCard>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-semibold text-gray-600">No requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Connect with a pastor for prayer</p>
            <WaterButton variant="primary" onClick={() => navigate('/pastors')} className="mt-4 px-6 py-2.5 text-sm font-bold">
              Find a Pastor
            </WaterButton>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{r.pastor?.name} · {r.pastor?.pastorTitle}</p>
                    <p className="text-xs text-gray-400">{getTimeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                  {r.request}
                </p>
                {r.response && (
                  <div className="mt-3">
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="text-xs font-semibold text-emerald-600">
                      {expanded === r.id ? 'Hide response ↑' : 'View pastor response ↓'}
                    </button>
                    {expanded === r.id && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-wide">{r.pastor?.name} responded</p>
                        <p className="text-sm text-emerald-900 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{r.response}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
