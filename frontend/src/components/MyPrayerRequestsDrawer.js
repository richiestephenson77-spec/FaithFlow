import { useState, useEffect } from 'react';
import { Globe, Lock, Shield } from 'lucide-react';
import api from '../utils/api';
import Avatar from './Avatar';
import TestimonyModal from './TestimonyModal';
import { WaterButton } from './water';
import { useToast } from '../contexts/ToastContext';

const VISIBILITY_OPTIONS = [
  { id: 'PUBLIC',      label: 'Public',      Icon: Globe,  bg: 'bg-gray-100', text: 'text-gray-600' },
  { id: 'PRIVATE',     label: 'Private',     Icon: Lock,   bg: 'bg-purple-50', text: 'text-purple-600' },
  { id: 'PASTOR_ONLY', label: 'Pastor Only', Icon: Shield, bg: 'bg-green-50',  text: 'text-green-600' },
];

function VisibilityBadge({ visibility }) {
  const opt = VISIBILITY_OPTIONS.find(o => o.id === visibility) || VISIBILITY_OPTIONS[0];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.bg} ${opt.text}`}>
      <opt.Icon size={9} strokeWidth={2} />
      {opt.label}
    </span>
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

export default function MyPrayerRequestsDrawer({ onClose }) {
  const showToast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);       // request with open action menu
  const [editing, setEditing] = useState(null);         // request being edited
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [updating, setUpdating] = useState(null);       // request getting an update
  const [updateText, setUpdateText] = useState('');
  const [testimony, setTestimony] = useState(null);     // request for testimony modal
  const [deleting, setDeleting] = useState(null);       // request awaiting delete confirm
  const [changingPrivacy, setChangingPrivacy] = useState(null); // request for privacy change
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/prayers/mine')
      .then(res => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openEdit(req) {
    setEditForm({ title: req.title, body: req.body });
    setEditing(req);
    setSelected(null);
  }

  async function saveEdit() {
    if (!editForm.title.trim() || !editForm.body.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(`/prayers/${editing.id}`, editForm);
      setRequests(prev => prev.map(r => r.id === editing.id ? res.data : r));
      setEditing(null);
      showToast('Prayer request updated');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not update request', 'error');
    }
    setSaving(false);
  }

  async function saveUpdate() {
    if (!updateText.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/prayers/${updating.id}/update`, { updateMessage: updateText });
      setRequests(prev => prev.map(r => r.id === updating.id ? res.data : r));
      setUpdating(null);
      setUpdateText('');
    } catch {}
    setSaving(false);
  }

  function handleTestimonySaved(updatedReq) {
    setRequests(prev => prev.map(r => r.id === updatedReq.id ? { ...r, ...updatedReq } : r));
    setTestimony(null);
  }

  async function changePrivacy(req, visibility) {
    try {
      const res = await api.put(`/prayers/${req.id}`, { visibility });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, visibility: res.data.visibility } : r));
    } catch {}
    setChangingPrivacy(null);
  }

  async function confirmDelete() {
    try {
      await api.delete(`/prayers/${deleting.id}`);
      setRequests(prev => prev.filter(r => r.id !== deleting.id));
      setDeleting(null);
      showToast('Prayer request deleted');
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not delete request', 'error');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out' }}>

        {/* Handle + header */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-base">My Prayer Requests</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">✕</button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2.5">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 water-tile-blue rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🙏</span>
              </div>
              <p className="font-semibold text-gray-700">No prayer requests yet</p>
              <p className="text-sm text-gray-400 mt-1">Share your first prayer request</p>
            </div>
          ) : (
            requests.map(req => (
              <button
                key={req.id}
                onClick={() => setSelected(req)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm leading-snug flex-1">{req.title}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <VisibilityBadge visibility={req.visibility || 'PUBLIC'} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      req.isAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {req.isAnswered ? 'Answered' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{getTimeAgo(req.createdAt)}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">🙏 {req.totalPrayerCount || 0} prayed</span>
                  {req.updateMessage && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-faith-500 font-medium">Updated</span>
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Action Menu */}
      {selected && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setSelected(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <p className="font-bold text-gray-900 text-sm text-center line-clamp-1">{selected.title}</p>
            </div>
            <div className="px-4 py-2 space-y-1">
              <ActionItem icon="✏️" label="Edit Prayer Request" onClick={() => openEdit(selected)} />
              {!selected.isAnswered && (
                <ActionItem icon="🙌" label="Mark as Answered" onClick={() => { setTestimony(selected); setSelected(null); }} />
              )}
              <ActionItem icon="💬" label="Add Update" onClick={() => { setUpdating(selected); setSelected(null); }} />
              <ActionItem icon="🔒" label="Change Privacy" onClick={() => { setChangingPrivacy(selected); setSelected(null); }} />
              <ActionItem icon="🗑️" label="Delete Request" danger onClick={() => { setDeleting(selected); setSelected(null); }} />
              <button
                onClick={() => setSelected(null)}
                className="w-full text-center py-3.5 text-sm font-semibold text-gray-400 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setEditing(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => setEditing(null)} className="text-gray-400 font-semibold text-sm">Cancel</button>
              <h3 className="font-bold text-gray-900 text-sm">Edit Prayer Request</h3>
              <button onClick={saveEdit} disabled={saving} className="text-faith-600 font-bold text-sm disabled:opacity-40">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <input
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400"
                placeholder="Title"
              />
              <textarea
                value={editForm.body}
                onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                rows={5}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
                placeholder="Description"
              />
              <WaterButton variant="primary" onClick={saveEdit} disabled={saving} className="w-full py-3.5 font-bold text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </WaterButton>
            </div>
          </div>
        </>
      )}

      {/* Add Update modal */}
      {updating && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => { setUpdating(null); setUpdateText(''); }} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => { setUpdating(null); setUpdateText(''); }} className="text-gray-400 font-semibold text-sm">Cancel</button>
              <h3 className="font-bold text-gray-900 text-sm">Add Update</h3>
              <button onClick={saveUpdate} disabled={saving || !updateText.trim()} className="text-faith-600 font-bold text-sm disabled:opacity-40">
                {saving ? 'Posting...' : 'Post'}
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium">"{updating.title}"</p>
              <textarea
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
                rows={4}
                autoFocus
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
                placeholder="Still believing, but God is moving..."
              />
              <WaterButton variant="primary" onClick={saveUpdate} disabled={saving || !updateText.trim()} className="w-full py-3.5 font-bold text-sm">
                {saving ? 'Posting...' : '💬 Post Update'}
              </WaterButton>
            </div>
          </div>
        </>
      )}

      {/* Change Privacy sheet */}
      {changingPrivacy && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setChangingPrivacy(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 text-sm text-center">Change Privacy</h3>
            </div>
            <div className="px-4 py-3 space-y-2">
              {VISIBILITY_OPTIONS.map(opt => {
                const active = (changingPrivacy.visibility || 'PUBLIC') === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => changePrivacy(changingPrivacy, opt.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors text-left ${
                      active ? 'bg-faith-50 text-faith-800' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <opt.Icon size={18} strokeWidth={1.8} />
                    <div>
                      <p>{opt.label}</p>
                      {opt.id === 'PRIVATE' && <p className="text-xs font-normal opacity-60 mt-0.5">Only pastors can see</p>}
                      {opt.id === 'PASTOR_ONLY' && <p className="text-xs font-normal opacity-60 mt-0.5">Selected pastors only</p>}
                      {opt.id === 'PUBLIC' && <p className="text-xs font-normal opacity-60 mt-0.5">Visible to everyone</p>}
                    </div>
                    {active && <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
              <button onClick={() => setChangingPrivacy(null)} className="w-full text-center py-3.5 text-sm font-semibold text-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleting && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setDeleting(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white rounded-t-3xl pb-8 shadow-2xl"
            style={{ animation: 'slideUp 0.2s ease-out' }}>
            <div className="px-4 pt-5 pb-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Delete Prayer Request?</h3>
              <p className="text-sm text-gray-400 mb-5 px-4">This will permanently remove "{deleting.title}" and all its prayer history.</p>
              <div className="px-4 space-y-2">
                <button onClick={confirmDelete}
                  className="w-full bg-red-500 text-white rounded-2xl py-3.5 font-bold text-sm">
                  Yes, Delete
                </button>
                <button onClick={() => setDeleting(null)}
                  className="w-full text-gray-500 font-semibold text-sm py-3">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Testimony modal (reuse existing) */}
      {testimony && (
        <TestimonyModal
          request={testimony}
          onSave={handleTestimonySaved}
          onClose={() => setTestimony(null)}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); }
          to   { transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}

function ActionItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors text-left ${
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-800 hover:bg-gray-50'
      }`}
    >
      <span className="text-xl w-7 text-center">{icon}</span>
      {label}
    </button>
  );
}
