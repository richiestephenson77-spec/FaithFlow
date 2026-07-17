import { useState } from 'react';
import api from '../utils/api';
import { WaterButton } from './water';

export default function TestimonyModal({ request, onSave, onClose }) {
  const [what, setWhat] = useState('');
  const [how, setHow] = useState('');
  const [sharePublicly, setSharePublicly] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const text = [what.trim(), how.trim()].filter(Boolean).join('\n\n');
    // Testimony is optional — marking answered is still allowed with no text.
    setSaving(true);
    try {
      const res = await api.post(`/prayers/${request.id}/answered`, {
        testimonyMessage: text || null,
        isPublic: sharePublicly,
      });
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
            disabled={saving}
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

          {/* Share publicly toggle — default ON */}
          <button
            type="button"
            onClick={() => setSharePublicly(v => !v)}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 border border-gray-200"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Share publicly</p>
              <p className="text-xs text-gray-500 mt-0.5">Show on the Answered Prayers wall</p>
            </div>
            <span
              className="relative inline-flex flex-shrink-0 rounded-full transition-colors"
              style={{ width: 44, height: 26, background: sharePublicly ? '#2C4055' : '#D1D5DB' }}
            >
              <span
                className="absolute top-0.5 rounded-full bg-white transition-all"
                style={{ width: 22, height: 22, left: sharePublicly ? 20 : 2 }}
              />
            </span>
          </button>

          <WaterButton variant="primary" onClick={handleSave} disabled={saving} className="w-full py-4 font-bold text-sm">
            {saving ? 'Saving...' : '🙌 Save Testimony'}
          </WaterButton>
        </div>
      </div>
    </div>
  );
}
