import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, UserPlus, Search, Shield, Crown, X, Pencil, Trash2, LogOut, Globe, Lock } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const ACCENT = '#2C4055';

// ---- bottom sheet shell ---------------------------------------------------
function Sheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function PrayerCellInfo() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();
  const [cell, setCell] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null); // 'add' | 'edit' | null
  const [memberMenu, setMemberMenu] = useState(null); // member obj
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/prayer-cells/${cellId}`);
      setCell(res.data);
      if (res.data.myRole === 'admin' && res.data.joinPolicy === 'request') {
        const rr = await api.get(`/prayer-cells/${cellId}/requests`);
        setRequests(rr.data);
      } else {
        setRequests([]);
      }
    } catch { showToast('Could not load group info', 'error'); }
    setLoading(false);
  }, [cellId, showToast]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = cell?.myRole === 'admin';
  const isCreator = cell?.creatorId === user?.id;

  async function resolveRequest(req, action) {
    setBusyId(req.id);
    try {
      await api.post(`/prayer-cells/${cellId}/requests/${req.id}`, { action });
      showToast(action === 'approve' ? `${req.user.name.split(' ')[0]} added` : 'Request denied');
      await load();
    } catch { showToast('Action failed', 'error'); }
    setBusyId(null);
  }

  async function setRole(member, role) {
    setMemberMenu(null);
    try {
      await api.patch(`/prayer-cells/${cellId}/members/${member.id}`, { role });
      showToast(role === 'admin' ? `${member.name.split(' ')[0]} is now an admin` : 'Admin removed');
      await load();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  async function removeMember(member) {
    setMemberMenu(null);
    try {
      await api.delete(`/prayer-cells/${cellId}/members/${member.id}`);
      showToast(`${member.name.split(' ')[0]} removed`);
      await load();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  async function changePolicy(policy) {
    try {
      await api.patch(`/prayer-cells/${cellId}`, { joinPolicy: policy });
      await load();
    } catch { showToast('Failed', 'error'); }
  }

  async function leaveCell() {
    try {
      await api.post(`/prayer-cells/${cellId}/leave`);
      showToast('You left the cell');
      navigate('/prayer-cells');
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  async function deleteCell() {
    try {
      await api.delete(`/prayer-cells/${cellId}`);
      showToast('Cell deleted');
      navigate('/prayer-cells');
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (!cell) return null;

  return (
    <div className="min-h-full" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Group Info</h1>
        {isAdmin && (
          <button onClick={() => setSheet('edit')} aria-label="Edit" className="p-1 -mr-1">
            <Pencil size={18} color={ACCENT} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="px-5 py-4 flex items-center gap-3 bg-white" style={{ borderBottom: '1px solid #EFEFEF' }}>
        {cell.imageUrl ? (
          <img src={cell.imageUrl} alt="" className="rounded-2xl object-cover" style={{ width: 56, height: 56 }} />
        ) : (
          <div className="rounded-2xl flex items-center justify-center" style={{ width: 56, height: 56, background: 'rgba(44,64,85,0.1)' }}>
            <span className="font-bold" style={{ color: ACCENT, fontSize: 24, fontFamily: "'Fraunces', serif" }}>{cell.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold" style={{ color: '#0A0A0A' }}>{cell.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{cell.memberCount} {cell.memberCount === 1 ? 'member' : 'members'}</p>
        </div>
      </div>

      {/* Join policy (admins can change) */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8E8E8E' }}>Join policy</p>
        {isAdmin ? (
          <div className="flex gap-2">
            {[['open', Globe, 'Open'], ['request', Lock, 'Request']].map(([val, Icon, label]) => (
              <button
                key={val}
                onClick={() => changePolicy(val)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1.5px solid ${cell.joinPolicy === val ? ACCENT : '#EFEFEF'}`, background: cell.joinPolicy === val ? 'rgba(44,64,85,0.05)' : '#fff', color: cell.joinPolicy === val ? ACCENT : '#8E8E8E' }}
              >
                <Icon size={15} strokeWidth={2} /> {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#5C6672' }}>{cell.joinPolicy === 'request' ? 'Request to join — admins approve' : 'Open to everyone'}</p>
        )}
      </div>

      {/* Pending requests (admins, request policy) */}
      {isAdmin && requests.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8E8E8E' }}>Pending requests ({requests.length})</p>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EFEFEF' }}>
            {requests.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid #EFEFEF' }}>
                <Avatar user={r.user} size="md" />
                <p className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{r.user.name}</p>
                <button onClick={() => resolveRequest(r, 'approve')} disabled={busyId === r.id} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: ACCENT }}>Approve</button>
                <button onClick={() => resolveRequest(r, 'deny')} disabled={busyId === r.id} className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#F0F0F0', color: '#5C6672' }}>Deny</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Members ({cell.memberCount})</p>
          {isAdmin && (
            <button onClick={() => setSheet('add')} className="flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>
              <UserPlus size={14} strokeWidth={2} /> Add
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #EFEFEF' }}>
          {cell.members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid #EFEFEF' }}>
              <Avatar user={m} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{m.name}{m.id === user?.id ? ' (You)' : ''}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {m.isCreator && <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: '#B8860B' }}><Crown size={10} strokeWidth={2.5} /> Creator</span>}
                  {!m.isCreator && m.role === 'admin' && <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: ACCENT }}><Shield size={10} strokeWidth={2.5} /> Admin</span>}
                </div>
              </div>
              {isAdmin && m.id !== user?.id && !m.isCreator && (
                <button onClick={() => setMemberMenu(m)} aria-label="Manage member" className="p-1.5 -mr-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA6AD" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="px-5 pb-8 space-y-2">
        {cell.isMember && !isCreator && (
          <button onClick={leaveCell} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fff', border: '1px solid #EFEFEF', color: '#C0392B' }}>
            <LogOut size={16} strokeWidth={2} /> Leave cell
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setMemberMenu({ confirmDelete: true })} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }}>
            <Trash2 size={16} strokeWidth={2} /> Delete cell
          </button>
        )}
      </div>

      {/* Member action menu */}
      <AnimatePresence>
        {memberMenu && !memberMenu.confirmDelete && (
          <Sheet onClose={() => setMemberMenu(null)}>
            <div className="p-2">
              <p className="text-center text-sm font-semibold py-3" style={{ color: '#0A0A0A' }}>{memberMenu.name}</p>
              {memberMenu.role === 'admin' ? (
                <button onClick={() => setRole(memberMenu, 'member')} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>Remove as admin</button>
              ) : (
                <button onClick={() => setRole(memberMenu, 'admin')} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>Make admin</button>
              )}
              <button onClick={() => removeMember(memberMenu)} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#C0392B' }}>Remove from cell</button>
              <button onClick={() => setMemberMenu(null)} className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1" style={{ color: '#8E8E8E' }}>Cancel</button>
            </div>
          </Sheet>
        )}
        {memberMenu?.confirmDelete && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-8" onClick={() => setMemberMenu(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
              <p className="font-bold text-[15px]" style={{ color: '#0A0A0A' }}>Delete this cell?</p>
              <p className="text-sm mt-2 leading-snug" style={{ color: '#6B7680' }}>This removes the cell and all its members permanently. This can't be undone.</p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setMemberMenu(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: '#F0F0F0', color: '#1A1A1A' }}>Cancel</button>
                <button onClick={deleteCell} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }}>Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add member sheet */}
      <AnimatePresence>
        {sheet === 'add' && <AddMemberSheet cellId={cellId} onClose={() => setSheet(null)} onAdded={load} showToast={showToast} />}
        {sheet === 'edit' && <EditCellSheet cell={cell} onClose={() => setSheet(null)} onSaved={load} showToast={showToast} />}
      </AnimatePresence>
    </div>
  );
}

// ---- Add member (search users) --------------------------------------------
function AddMemberSheet({ cellId, onClose, onAdded, showToast }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try { const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`); setResults(res.data); } catch {}
      setSearching(false);
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [q]);

  async function add(u) {
    setAddingId(u.id);
    try {
      await api.post(`/prayer-cells/${cellId}/members`, { userId: u.id });
      showToast(`${u.name.split(' ')[0]} added`);
      await onAdded();
      setResults(rs => rs.filter(r => r.id !== u.id));
    } catch (err) { showToast(err.response?.data?.error || 'Could not add', 'error'); }
    setAddingId(null);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={onClose}><X size={20} color="#8E8E8E" /></button>
        <h3 className="font-bold text-[15px]" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Add members</h3>
        <div className="w-5" />
      </div>
      <div className="px-4 py-3 flex-shrink-0">
        <div className="relative">
          <Search size={16} strokeWidth={2} color="#9AA6AD" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search believers…" className="w-full bg-gray-50 rounded-xl pl-10 pr-4 text-sm focus:outline-none" style={{ height: 44, border: '1px solid #EFEFEF', color: '#1A1A1A' }} />
        </div>
      </div>
      <div className="overflow-y-auto px-4 pb-4">
        {q.trim().length < 2 ? (
          <p className="text-sm text-center py-8" style={{ color: '#9AA6AD' }}>Type a name to search</p>
        ) : searching ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} /></div>
        ) : results.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#9AA6AD' }}>No believers found</p>
        ) : (
          <div className="space-y-2">
            {results.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-white rounded-2xl p-3" style={{ border: '1px solid #EFEFEF' }}>
                <Avatar user={u} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{u.name}</p>
                  {u.churchName && <p className="text-xs truncate" style={{ color: '#8E8E8E' }}>{u.churchName}</p>}
                </div>
                <button onClick={() => add(u)} disabled={addingId === u.id} className="text-xs font-bold px-3.5 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: ACCENT }}>
                  {addingId === u.id ? '…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ---- Edit cell -------------------------------------------------------------
function EditCellSheet({ cell, onClose, onSaved, showToast }) {
  const fileRef = useRef(null);
  const [name, setName] = useState(cell.name);
  const [description, setDescription] = useState(cell.description || '');
  const [imageUrl, setImageUrl] = useState(cell.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function doUpload(file) {
    setUploading(true);
    try { const fd = new FormData(); fd.append('image', file); const res = await api.post('/prayer-cells/image', fd); setImageUrl(res.data.imageUrl); }
    catch (err) { showToast('Could not upload image', 'error'); }
    setUploading(false);
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.patch(`/prayer-cells/${cell.id}`, { name: name.trim(), description: description.trim(), imageUrl });
      showToast('Cell updated');
      await onSaved();
      onClose();
    } catch (err) { showToast(err.response?.data?.error || 'Could not save', 'error'); setSaving(false); }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={onClose} className="text-sm font-medium" style={{ color: '#8E8E8E' }}>Cancel</button>
        <h3 className="font-bold text-[15px]" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Edit cell</h3>
        <button onClick={save} disabled={!name.trim() || saving} className="text-sm font-bold disabled:opacity-40" style={{ color: ACCENT }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex justify-center">
          <button onClick={() => fileRef.current?.click()} className="relative">
            {imageUrl ? <img src={imageUrl} alt="" className="rounded-3xl object-cover" style={{ width: 84, height: 84 }} />
              : <div className="rounded-3xl flex items-center justify-center" style={{ width: 84, height: 84, background: 'rgba(44,64,85,0.08)' }}><span className="font-bold" style={{ color: ACCENT, fontSize: 30, fontFamily: "'Fraunces', serif" }}>{name.charAt(0).toUpperCase() || 'C'}</span></div>}
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: ACCENT }}>
              {uploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Pencil size={12} color="#fff" strokeWidth={2} />}
            </span>
            <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doUpload(f); }} className="hidden" />
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-1.5 w-full bg-gray-50 rounded-xl px-4 text-sm focus:outline-none" style={{ height: 46, border: '1px solid #EFEFEF', color: '#1A1A1A' }} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} className="mt-1.5 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none" style={{ border: '1px solid #EFEFEF', color: '#1A1A1A' }} />
        </div>
      </div>
    </Sheet>
  );
}
