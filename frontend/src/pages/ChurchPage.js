import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { WaterButton } from '../components/water';

const POST_TYPE_LABELS = { UPDATE: '📢 Update', EVENT: '📅 Event', SERVICE: '🕊️ Service Time' };
const POST_TYPE_COLORS = {
  UPDATE: 'bg-blue-50 text-blue-700',
  EVENT: 'bg-purple-50 text-purple-700',
  SERVICE: 'bg-green-50 text-green-700',
};

export default function ChurchPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    api.get(`/churches/${id}`)
      .then(r => { setChurch(r.data); setFollowing(r.data.isFollowing); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleFollow() {
    try {
      const res = await api.post(`/churches/${id}/follow`);
      setFollowing(res.data.following);
      setChurch(p => ({
        ...p,
        _count: { ...p._count, followers: p._count.followers + (res.data.following ? 1 : -1) },
      }));
    } catch {}
  }

  function onPostCreated(post) {
    setChurch(p => ({ ...p, posts: [post, ...(p.posts || [])] }));
    setShowPost(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!church) return <div className="p-8 text-center text-gray-400">Church not found</div>;

  const isAdmin = church.adminId === user?.id;

  return (
    <div className="pb-4">
      {/* Cover */}
      <div className="relative h-40 bg-gradient-to-br from-faith-800 to-faith-600">
        {church.coverPhoto && (
          <img src={church.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <button onClick={() => navigate(-1)}
          className="absolute top-3 left-3 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
          ‹
        </button>
        {isAdmin && (
          <button onClick={() => setShowEdit(true)}
            className="absolute top-3 right-3 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full border border-white/40">
            Edit Church
          </button>
        )}
      </div>

      {/* Church Identity */}
      <div className="px-4 -mt-8 mb-4">
        <div className="flex items-end gap-3 mb-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
            {church.logo
              ? <img src={church.logo} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full water-tile-blue flex items-center justify-center text-3xl" style={{ color: '#163449' }}>⛪</div>
            }
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-xl font-bold text-gray-900">{church.name}</h1>
            {church.location && <p className="text-sm text-gray-400">📍 {church.location}</p>}
          </div>
        </div>

        {church.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{church.description}</p>
        )}
        {church.website && (
          <p className="text-sm text-faith-600 mb-3">🌐 {church.website}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            <strong className="text-gray-900">{church._count?.followers || 0}</strong> members
          </span>
          {!isAdmin && (
            following ? (
              <button onClick={handleFollow}
                className="text-sm px-5 py-2 rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200">
                Following
              </button>
            ) : (
              <WaterButton variant="primary" onClick={handleFollow} className="text-sm px-5 py-2 font-bold" style={{ borderRadius: 999 }}>
                Follow Church
              </WaterButton>
            )
          )}
          {isAdmin && (
            <WaterButton variant="primary" onClick={() => setShowPost(true)} className="text-sm px-5 py-2 font-bold" style={{ borderRadius: 999 }}>
              + Post Update
            </WaterButton>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity</h3>

        {church.posts?.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">📣</div>
            <p>No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {church.posts?.map(post => (
              <div key={post.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POST_TYPE_COLORS[post.type]}`}>
                    {POST_TYPE_LABELS[post.type]}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{getTimeAgo(post.createdAt)}</span>
                </div>
                {post.title && <h4 className="font-bold text-gray-900 text-sm mb-1">{post.title}</h4>}
                <p className="text-sm text-gray-600 leading-relaxed">{post.content}</p>
                {post.eventDate && (
                  <p className="text-xs text-faith-600 mt-2 font-medium">
                    📅 {new Date(post.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                )}
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="" className="mt-3 w-full rounded-xl object-cover max-h-48" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPost && (
        <NewChurchPostModal churchId={id} onClose={() => setShowPost(false)} onCreate={onPostCreated} />
      )}
      {showEdit && (
        <EditChurchModal church={church} onClose={() => setShowEdit(false)}
          onSave={updated => { setChurch(p => ({ ...p, ...updated })); setShowEdit(false); }} />
      )}
    </div>
  );
}

function NewChurchPostModal({ churchId, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', content: '', type: 'UPDATE', eventDate: '' });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (fileRef.current?.files[0]) fd.append('image', fileRef.current.files[0]);
      const res = await api.post(`/churches/${churchId}/posts`, fd);
      onCreate(res.data);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-8 fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-4">New Church Post</h3>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {['UPDATE', 'EVENT', 'SERVICE'].map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap font-medium ${
                form.type === t ? 'border-faith-500 bg-faith-50 text-faith-700' : 'border-gray-200 text-gray-500'}`}>
              {POST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Post title (optional)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500" />
          <textarea required value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Post content..." rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none" />
          {form.type === 'EVENT' && (
            <input type="datetime-local" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500" />
          )}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-faith-600">📷 Add Image</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm">Cancel</button>
            <WaterButton variant="primary" type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold">
              {saving ? 'Posting...' : 'Post'}
            </WaterButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditChurchModal({ church, onClose, onSave }) {
  const [form, setForm] = useState({
    name: church.name,
    description: church.description || '',
    location: church.location || '',
    website: church.website || '',
  });
  const [saving, setSaving] = useState(false);
  const logoRef = useRef();
  const coverRef = useRef();

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoRef.current?.files[0]) fd.append('logo', logoRef.current.files[0]);
      if (coverRef.current?.files[0]) fd.append('coverPhoto', coverRef.current.files[0]);
      const res = await api.put(`/churches/${church.id}`, fd);
      onSave(res.data);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-8 fade-in max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-4">Edit Church</h3>
        <form onSubmit={submit} className="space-y-3">
          {[
            { field: 'name', placeholder: 'Church name', required: true },
            { field: 'location', placeholder: 'Location' },
            { field: 'website', placeholder: 'Website' },
          ].map(({ field, placeholder, required }) => (
            <input key={field} required={required}
              value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500" />
          ))}
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description" rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none" />
          <div className="flex gap-3">
            <button type="button" onClick={() => logoRef.current?.click()}
              className="flex items-center gap-1 text-xs text-faith-600">📷 Logo</button>
            <button type="button" onClick={() => coverRef.current?.click()}
              className="flex items-center gap-1 text-xs text-faith-600">🖼️ Cover</button>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" />
          <input ref={coverRef} type="file" accept="image/*" className="hidden" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm">Cancel</button>
            <WaterButton variant="primary" type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold">
              {saving ? 'Saving...' : 'Save'}
            </WaterButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
