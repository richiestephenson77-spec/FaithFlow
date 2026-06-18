import { useState } from 'react';
import api from '../utils/api';

const CATEGORIES = [
  { id: 'GENERAL',      label: 'General',          emoji: '🙏' },
  { id: 'HEALTH',       label: 'Health',            emoji: '🏥' },
  { id: 'FAMILY',       label: 'Family',            emoji: '👨‍👩‍👧' },
  { id: 'CAREER',       label: 'Career',            emoji: '💼' },
  { id: 'FINANCIAL',    label: 'Financial',         emoji: '💰' },
  { id: 'RELATIONSHIP', label: 'Relationship',      emoji: '💑' },
  { id: 'SPIRITUAL',    label: 'Spiritual Growth',  emoji: '✝️' },
];

export default function NewPrayerRequestModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'GENERAL', isUrgent: false });
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
      <div className="bg-white rounded-t-3xl w-full max-w-md pb-8 fade-in max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h2 className="font-bold text-gray-900">Share a Prayer Request</h2>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim() || !form.body.trim()}
            className="text-faith-600 font-bold text-sm disabled:opacity-40"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {error && <div className="bg-red-50 text-red-600 rounded-xl px-4 py-2 text-sm">{error}</div>}

          {/* Title */}
          <input
            type="text"
            required
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400"
            placeholder="Prayer request title"
            autoFocus
          />

          {/* Body */}
          <textarea
            required
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-faith-400 resize-none"
            rows={4}
            placeholder="Share what you'd like the community to pray for..."
          />

          {/* Category */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.category === cat.id
                      ? 'border-faith-400 bg-faith-50 text-faith-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgent toggle */}
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, isUrgent: !p.isUrgent }))}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
              form.isUrgent
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <span className="text-xl">🚨</span>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Mark as Urgent</p>
              <p className="text-xs opacity-70">Pinned at top of feed</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              form.isUrgent ? 'bg-red-500 border-red-500' : 'border-gray-300'
            }`}>
              {form.isUrgent && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim() || !form.body.trim()}
            className="w-full prayer-gradient text-white rounded-2xl py-4 text-sm font-bold disabled:opacity-60 shadow-sm"
          >
            {loading ? 'Posting...' : 'Share Request 🙏'}
          </button>
        </div>
      </div>
    </div>
  );
}
