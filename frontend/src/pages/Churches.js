import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WaterCard, WaterButton, WaterInput } from '../components/water';

export default function Churches({ embedded = false }) {
  const [search, setSearch] = useState('');
  const [churches, setChurches] = useState([]);
  const [myChurch, setMyChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get('/churches/search'),
      api.get('/churches/mine'),
    ])
      .then(([allRes, mineRes]) => {
        setChurches(allRes.data);
        setMyChurch(mineRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(q) {
    setSearch(q);
    try {
      const res = await api.get('/churches/search', { params: { q } });
      setChurches(res.data);
    } catch {}
  }

  function onChurchCreated(church) {
    setMyChurch(church);
    setShowCreate(false);
    navigate(`/churches/${church.id}`);
  }

  return (
    <div className={embedded ? '' : 'bg-gray-50 min-h-full'}>
      {!embedded && (
        <WaterCard tone="blue" style={{ borderRadius: '0 0 24px 24px', padding: '20px 20px 32px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#163449' }}>Churches</h2>
              <p className="text-sm mt-0.5" style={{ color: '#4A6674' }}>Find your faith community</p>
            </div>
            {!myChurch ? (
              <button onClick={() => setShowCreate(true)}
                className="bg-white text-faith-700 text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                + Register
              </button>
            ) : (
              <button onClick={() => navigate(`/churches/${myChurch.id}`)}
                className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/30">
                My Church
              </button>
            )}
          </div>
        </WaterCard>
      )}

      <div className={embedded ? 'px-4 pt-4 pb-4' : '-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-4'}>
        {embedded && (
          <div className="flex items-center justify-end mb-3">
            {!myChurch ? (
              <WaterButton variant="primary" onClick={() => setShowCreate(true)} className="text-xs font-bold px-4 py-2">
                + Register Church
              </WaterButton>
            ) : (
              <button onClick={() => navigate(`/churches/${myChurch.id}`)}
                className="bg-faith-100 text-faith-700 text-xs font-semibold px-4 py-2 rounded-full">
                My Church
              </button>
            )}
          </div>
        )}
        {/* Search */}
        <WaterInput className="relative mb-5" style={{ borderRadius: 16 }}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#4A6674', zIndex: 2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search churches..."
            className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
          />
        </WaterInput>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : churches.length === 0 ? (
          <div className="text-center py-16">
            <WaterCard tone="blue" style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.875rem' }}>
              ⛪
            </WaterCard>
            <p className="font-semibold text-gray-700">{search ? 'No churches found' : 'No churches yet'}</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to register yours!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {churches.map(church => (
              <ChurchCard key={church.id} church={church} onClick={() => navigate(`/churches/${church.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateChurchModal onClose={() => setShowCreate(false)} onCreate={onChurchCreated} />}
    </div>
  );
}

function ChurchCard({ church, onClick }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left active:scale-[0.98] transition-transform">
      <div className="relative h-20">
        {church.coverPhoto
          ? <img loading="lazy" decoding="async" src={church.coverPhoto} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full water-tile-blue" />
        }
      </div>
      <div className="px-4 pb-4 pt-2 flex items-end gap-3 -mt-6 relative">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white border-2 border-white shadow-md">
          {church.logo
            ? <img loading="lazy" decoding="async" src={church.logo} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full water-tile-blue flex items-center justify-center text-lg" style={{ color: '#163449' }}>⛪</div>
          }
        </div>
        <div className="flex-1 min-w-0 pt-5">
          <p className="font-bold text-gray-900 text-sm leading-tight">{church.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {church.location && <p className="text-xs text-gray-400">{church.location}</p>}
            <p className="text-xs text-faith-600 font-medium">{church._count?.followers || 0} members</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

function CreateChurchModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', location: '', website: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await api.post('/churches', fd);
      onCreate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create church');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto pb-8 fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white pt-3 pb-3 px-5 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400 font-medium">Cancel</button>
            <h3 className="text-base font-bold text-gray-900">Register Church</h3>
            <WaterButton variant="primary" onClick={handleSubmit} disabled={saving} className="text-sm font-bold px-4 py-1.5">
              {saving ? 'Saving...' : 'Create'}
            </WaterButton>
          </div>
        </div>

        <div className="px-5 pt-4 space-y-3">
          {error && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 text-sm">{error}</div>}
          {[
            { field: 'name', placeholder: 'Church name *', required: true },
            { field: 'location', placeholder: 'City, State / Country' },
            { field: 'website', placeholder: 'Website (optional)' },
          ].map(({ field, placeholder, required }) => (
            <input key={field} required={required}
              value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400"
            />
          ))}
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Vision / description..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
