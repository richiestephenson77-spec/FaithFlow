import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const STATUS_STYLES = {
  PENDING:   'bg-amber-50 text-amber-600',
  PRAYED:    'bg-faith-50 text-faith-600',
  RESPONDED: 'bg-emerald-50 text-emerald-700',
};

function getTimeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PastorDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/pastors/dashboard').then(res => setRequests(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleAction(id, status, resp) {
    setSaving(true);
    try {
      await api.put(`/pastors/requests/${id}`, { status, response: resp });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status, response: resp } : r));
      setResponding(null);
      setResponse('');
    } catch {}
    setSaving(false);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="prayer-gradient px-4 pt-4 pb-7">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Pastor Dashboard</h2>
            <p className="text-white/60 text-xs">Prayer requests from the community</p>
          </div>
        </div>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-semibold text-gray-600">No prayer requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Requests from believers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500">{r.requester?.name || 'Anonymous Believer'} · {getTimeAgo(r.createdAt)}</p>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                  {r.request}
                </p>

                {responding === r.id ? (
                  <div className="space-y-2">
                    <textarea value={response} onChange={e => setResponse(e.target.value)}
                      rows={3} autoFocus
                      placeholder="Write a response or encouragement..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
                      style={{ fontFamily: 'Georgia, serif' }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setResponding(null); setResponse(''); }}
                        className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2 text-xs font-semibold">
                        Cancel
                      </button>
                      <button onClick={() => handleAction(r.id, 'RESPONDED', response)} disabled={saving || !response.trim()}
                        className="flex-1 prayer-gradient text-white rounded-xl py-2 text-xs font-bold disabled:opacity-40">
                        {saving ? 'Saving...' : 'Respond'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {r.status === 'PENDING' && (
                      <button onClick={() => handleAction(r.id, 'PRAYED', r.response)} disabled={saving}
                        className="flex-1 bg-faith-50 text-faith-600 border border-faith-100 rounded-xl py-2 text-xs font-bold">
                        Mark as Prayed
                      </button>
                    )}
                    <button onClick={() => { setResponding(r.id); setResponse(r.response || ''); }}
                      className="flex-1 prayer-gradient text-white rounded-xl py-2 text-xs font-bold">
                      {r.response ? 'Edit Response' : 'Respond'}
                    </button>
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
