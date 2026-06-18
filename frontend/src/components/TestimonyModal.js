import { useState } from 'react';
import api from '../utils/api';

export default function TestimonyModal({ request, onSave, onClose }) {
  const [what, setWhat] = useState('');
  const [how, setHow] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const text = [what.trim(), how.trim()].filter(Boolean).join('\n\n');
    if (!text) return;
    setSaving(true);
    try {
      const res = await api.post(`/prayers/${request.id}/answered`, { testimonyMessage: text });
      onSave(res.data);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h3 className="font-bold text-gray-900">Share Your Testimony</h3>
          <button
            onClick={handleSave}
            disabled={saving || (!what.trim() && !how.trim())}
            className="text-faith-600 font-bold text-sm disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="px-4 py-5 space-y-4 pb-8">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-2">
            <span className="text-xl">🙌</span>
            <div>
              <p className="text-xs font-bold text-emerald-700">God answered this prayer!</p>
              <p className="text-xs text-emerald-600 mt-0.5 line-clamp-1">{request.title}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              What happened?
            </label>
            <textarea
              value={what}
              onChange={e => setWhat(e.target.value)}
              placeholder="Share what God did..."
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              How did God answer this prayer?
            </label>
            <textarea
              value={how}
              onChange={e => setHow(e.target.value)}
              placeholder="Describe how He moved..."
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || (!what.trim() && !how.trim())}
            className="w-full py-4 rounded-2xl font-bold text-white prayer-gradient shadow-sm disabled:opacity-40 text-sm"
          >
            {saving ? 'Saving...' : '🙌 Save Testimony'}
          </button>
        </div>
      </div>
    </div>
  );
}
