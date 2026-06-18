import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Avatar from '../components/Avatar';

export default function Pastors() {
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pastors').then(res => setPastors(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Pray With a Pastor</h2>
        <p className="text-white/70 text-sm">Connect with a verified pastor for prayer and guidance</p>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-5 pb-24">
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : pastors.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 prayer-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="font-semibold text-gray-700">Pastors coming soon</p>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">Want to be listed as a verified pastor?</p>
            <p className="text-sm text-faith-600 font-semibold mt-1">Contact us to apply</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastors.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar user={p} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                    {p.pastorTitle && <p className="text-xs text-faith-600 font-semibold mt-0.5">{p.pastorTitle}</p>}
                    {p.pastorChurch && <p className="text-xs text-gray-400 mt-0.5">{p.pastorChurch}</p>}
                  </div>
                  <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                </div>
                {p.pastorBio && <p className="text-xs text-gray-500 leading-relaxed mb-3">{p.pastorBio}</p>}
                <button onClick={() => setSelected(p)}
                  className="w-full prayer-gradient text-white rounded-xl py-2.5 text-sm font-bold shadow-sm">
                  Request Prayer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* My requests link */}
        <button onClick={() => navigate('/my-pastor-requests')}
          className="mt-5 w-full text-center text-sm text-faith-600 font-semibold py-2">
          View my prayer request history →
        </button>
      </div>

      {selected && <PastorRequestModal pastor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PastorRequestModal({ pastor, onClose }) {
  const [request, setRequest] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!request.trim()) return;
    setSaving(true);
    try {
      await api.post(`/pastors/${pastor.id}/pray`, { request, isAnonymous: isAnon });
      setDone(true);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-8">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h3 className="font-bold text-gray-900 text-sm">Prayer Request</h3>
          <div className="w-12" />
        </div>

        {done ? (
          <div className="text-center px-6 py-10">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="font-bold text-gray-900 mb-2">Request Sent</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              {pastor.name} will pray for you. May God answer your prayer.
            </p>
            <button onClick={onClose} className="mt-6 prayer-gradient text-white rounded-2xl px-8 py-3 font-bold text-sm">Done</button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            <p className="text-sm text-gray-500">What would you like <span className="font-semibold text-gray-800">{pastor.name}</span> to pray for?</p>
            <textarea value={request} onChange={e => setRequest(e.target.value)}
              rows={5} autoFocus
              placeholder="Share your prayer request..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
              style={{ fontFamily: 'Georgia, serif' }}
            />
            <button onClick={() => setIsAnon(!isAnon)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                isAnon ? 'bg-faith-50 border-faith-200 text-faith-700' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
              <span className="text-base">🤫</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Submit anonymously</p>
                <p className="text-xs opacity-70">Pastor sees "Anonymous Believer"</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isAnon ? 'bg-faith-500 border-faith-500' : 'border-gray-300'}`}>
                {isAnon && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            </button>
            <button onClick={handleSubmit} disabled={saving || !request.trim()}
              className="w-full prayer-gradient text-white rounded-2xl py-3.5 font-bold text-sm disabled:opacity-40">
              {saving ? 'Sending...' : 'Send Prayer Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
