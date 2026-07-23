import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Globe, Lock } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../utils/haptics';

const ACCENT = '#2C4055';

function PolicyOption({ active, icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors"
      style={{ border: `1.5px solid ${active ? ACCENT : '#EFEFEF'}`, background: active ? 'rgba(44,64,85,0.05)' : '#fff' }}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: active ? ACCENT : 'rgba(10,10,10,0.05)' }}>
        {icon(active ? '#fff' : '#0A0A0A')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{subtitle}</p>
      </div>
      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: `2px solid ${active ? ACCENT : '#D8DEE4'}`, background: active ? ACCENT : 'transparent' }}>
        {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>
    </button>
  );
}

export default function CreatePrayerCell() {
  const navigate = useNavigate();
  const showToast = useToast();
  const fileRef = useRef(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinPolicy, setJoinPolicy] = useState('open');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/prayer-cells/image', fd);
      setImageUrl(res.data.imageUrl);
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not upload image', 'error');
    }
    setUploading(false);
  }

  async function handleCreate() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await api.post('/prayer-cells', { name: name.trim(), description: description.trim(), imageUrl, joinPolicy });
      hapticLight();
      showToast('Prayer cell created');
      navigate(`/prayer-cells/${res.data.id}`, { replace: true });
    } catch (err) {
      showToast(err.friendlyMessage || err.response?.data?.error || 'Could not create cell', 'error');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>New Prayer Cell</h1>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Image */}
        <div className="flex justify-center">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Add cell image">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="rounded-3xl object-cover" style={{ width: 96, height: 96 }} />
            ) : (
              <div className="rounded-3xl flex items-center justify-center" style={{ width: 96, height: 96, background: 'rgba(44,64,85,0.08)' }}>
                <Camera size={26} color={ACCENT} strokeWidth={1.8} />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: ACCENT }}>
              {uploading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={13} color="#fff" strokeWidth={2} />}
            </span>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Tuesday Intercessors"
            className="mt-1.5 w-full bg-white rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4055]/20"
            style={{ height: 46, border: '1px solid #EFEFEF', color: '#1A1A1A' }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What is this group about?"
            className="mt-1.5 w-full bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C4055]/20 resize-none"
            style={{ border: '1px solid #EFEFEF', color: '#1A1A1A' }}
          />
        </div>

        {/* Join policy */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8E8E8E' }}>Who can join</label>
          <div className="mt-2 space-y-2">
            <PolicyOption
              active={joinPolicy === 'open'}
              icon={c => <Globe size={17} color={c} strokeWidth={1.9} />}
              title="Open to everyone"
              subtitle="Anyone can join instantly"
              onClick={() => setJoinPolicy('open')}
            />
            <PolicyOption
              active={joinPolicy === 'request'}
              icon={c => <Lock size={17} color={c} strokeWidth={1.9} />}
              title="Request to join"
              subtitle="Admins approve each request"
              onClick={() => setJoinPolicy('request')}
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="w-full h-12 rounded-xl text-white text-sm font-bold disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          {saving ? 'Creating…' : 'Create Cell'}
        </button>
      </div>
    </div>
  );
}
