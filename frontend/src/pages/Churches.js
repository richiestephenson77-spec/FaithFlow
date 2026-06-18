import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Churches() {
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
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Churches</h2>
        {!myChurch && (
          <button onClick={() => setShowCreate(true)}
            className="text-sm prayer-gradient text-white px-4 py-1.5 rounded-full font-medium">
            + Register Church
          </button>
        )}
        {myChurch && (
          <button onClick={() => navigate(`/churches/${myChurch.id}`)}
            className="text-sm text-faith-600 font-medium border border-faith-200 px-3 py-1.5 rounded-full">
            My Church
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search churches by name or location..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : churches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">⛪</div>
          <p>{search ? 'No churches found' : 'No churches yet'}</p>
          <p className="text-sm mt-1">Be the first to register yours!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {churches.map(church => (
            <ChurchCard key={church.id} church={church} onClick={() => navigate(`/churches/${church.id}`)} />
          ))}
        </div>
      )}

      {showCreate && <CreateChurchModal onClose={() => setShowCreate(false)} onCreate={onChurchCreated} />}
    </div>
  );
}

function ChurchCard({ church, onClick }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left">
      {church.coverPhoto && (
        <img src={church.coverPhoto} alt="" className="w-full h-24 object-cover" />
      )}
      {!church.coverPhoto && (
        <div className="w-full h-16 prayer-gradient" />
      )}
      <div className="p-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white border-2 border-white shadow -mt-8 relative">
          {church.logo
            ? <img src={church.logo} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full prayer-gradient flex items-center justify-center text-white text-xl">⛪</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{church.name}</p>
          {church.location && <p className="text-xs text-gray-400">📍 {church.location}</p>}
          <p className="text-xs text-faith-600">{church._count?.followers || 0} members</p>
        </div>
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
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-8 fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-4">Register Your Church</h3>

        {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { field: 'name', placeholder: 'Church name *', required: true },
            { field: 'location', placeholder: 'City, State/Country' },
            { field: 'website', placeholder: 'Website (optional)' },
          ].map(({ field, placeholder, required }) => (
            <input key={field} required={required}
              value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
            />
          ))}
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Church description / vision..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none"
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 prayer-gradient text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60">
              {saving ? 'Creating...' : 'Register ⛪'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
