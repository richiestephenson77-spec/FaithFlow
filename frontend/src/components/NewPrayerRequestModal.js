import { useState } from 'react';
import api from '../utils/api';

export default function NewPrayerRequestModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', body: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/prayers', form);
      onCreate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 fade-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <h2 className="text-lg font-bold text-gray-800 mb-4">Share a Prayer Request</h2>

        {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500"
              placeholder="Prayer request title"
            />
          </div>
          <div>
            <textarea
              required
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-500 resize-none"
              rows={4}
              placeholder="Share what you'd like the community to pray for..."
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 prayer-gradient text-white rounded-xl py-3 text-sm font-bold disabled:opacity-60">
              {loading ? 'Posting...' : 'Share Request 🙏'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
