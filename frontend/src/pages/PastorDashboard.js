import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { WaterCard, WaterButton, WaterPill } from '../components/water';

const STATUS_STYLES = {
  PENDING:   'bg-terracotta-50 text-terracotta-600',
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

function PastorRequestCard({ r, onAction, responding, setResponding, response, setResponse, saving }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
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
            <WaterButton variant="primary" onClick={() => onAction(r.id, 'RESPONDED', response)} disabled={saving || !response.trim()} className="flex-1 py-2 text-xs font-bold">
              {saving ? 'Saving...' : 'Respond'}
            </WaterButton>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {r.status === 'PENDING' && (
            <button onClick={() => onAction(r.id, 'PRAYED', r.response)} disabled={saving}
              className="flex-1 bg-faith-50 text-faith-600 border border-faith-100 rounded-xl py-2 text-xs font-bold">
              Mark as Prayed
            </button>
          )}
          <WaterButton variant="primary" onClick={() => { setResponding(r.id); setResponse(r.response || ''); }} className="flex-1 py-2 text-xs font-bold">
            {r.response ? 'Edit Response' : 'Respond'}
          </WaterButton>
        </div>
      )}
    </div>
  );
}

function PrivatePrayerCard({ prayer }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p className="text-xs font-semibold text-gray-500">{prayer.displayLocation}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            prayer.visibility === 'PRIVATE' ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-600'
          }`}>
            {prayer.visibility === 'PRIVATE' ? '🔒 Private' : '✝️ Pastor Only'}
          </span>
          <span className="text-[10px] text-gray-400">{getTimeAgo(prayer.createdAt)}</span>
        </div>
      </div>
      <h4 className="font-bold text-gray-800 text-sm mb-1">{prayer.title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
        {prayer.body}
      </p>
      <p className="text-xs text-terracotta-700 font-semibold mt-3">🙏 {prayer.totalPrayerCount || 0} people prayed</p>
    </div>
  );
}

export default function PastorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [privatePrayers, setPrivatePrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/pastors/dashboard').then(res => setRequests(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'private') return;
    setPrivateLoading(true);
    api.get('/pastors/private-prayers').then(res => setPrivatePrayers(res.data)).catch(() => {}).finally(() => setPrivateLoading(false));
  }, [activeTab]);

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
      <WaterCard tone="blue" style={{ borderRadius: '0 0 24px 24px', padding: '16px 16px 28px' }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(22,52,73,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#163449" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#163449' }}>Pastor Dashboard</h2>
            <p className="text-xs" style={{ color: '#4A6674' }}>Prayer requests from the community</p>
          </div>
        </div>
      </WaterCard>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <WaterPill active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} className="flex-1 py-2.5 text-xs font-bold text-center">
            Prayer Requests
          </WaterPill>
          <WaterPill active={activeTab === 'private'} onClick={() => setActiveTab('private')} className="flex-1 py-2.5 text-xs font-bold text-center">
            🔒 Private Requests
          </WaterPill>
        </div>

        {activeTab === 'requests' && (
          loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-gray-600">No prayer requests yet</p>
              <p className="text-sm text-gray-400 mt-1">Requests from believers will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <PastorRequestCard
                  key={r.id} r={r} onAction={handleAction}
                  responding={responding} setResponding={setResponding}
                  response={response} setResponse={setResponse} saving={saving}
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'private' && (
          privateLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
          ) : privatePrayers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <p className="font-semibold text-gray-600">No private requests</p>
              <p className="text-sm text-gray-400 mt-1">Private and pastor-only prayers will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {privatePrayers.map(p => <PrivatePrayerCard key={p.id} prayer={p} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
