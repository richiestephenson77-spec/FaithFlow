import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import Avatar from './Avatar';

const CATEGORIES = [
  { id: 'GENERAL',      label: 'General',          emoji: '🙏' },
  { id: 'HEALTH',       label: 'Health',            emoji: '🏥' },
  { id: 'FAMILY',       label: 'Family',            emoji: '👨‍👩‍👧' },
  { id: 'CAREER',       label: 'Career',            emoji: '💼' },
  { id: 'FINANCIAL',    label: 'Financial',         emoji: '💰' },
  { id: 'RELATIONSHIP', label: 'Relationship',      emoji: '💑' },
  { id: 'SPIRITUAL',    label: 'Spiritual Growth',  emoji: '✝️' },
];

const VISIBILITY_OPTIONS = [
  { id: 'PUBLIC',      icon: '🌍', label: 'Public' },
  { id: 'PRIVATE',     icon: '🔒', label: 'Private' },
  { id: 'PASTOR_ONLY', icon: '✝️', label: 'Pastor Only' },
];

function PastorPicker({ selectedPastors, onToggle }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/pastors', { params: { search } });
        setResults(res.data);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const selectedIds = new Set(selectedPastors.map(p => p.id));

  return (
    <div>
      {/* Selected chips */}
      {selectedPastors.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedPastors.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-purple-700">{p.name}</span>
              <button onClick={() => onToggle(p)} className="text-purple-400 hover:text-purple-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search for a pastor..."
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      {searching && <p className="text-xs text-gray-400 mt-1.5 ml-1">Searching...</p>}
      {results.length > 0 && (
        <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-gray-50 last:border-0 transition-colors ${
                selectedIds.has(p.id) ? 'bg-purple-50' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Avatar user={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                {p.pastorChurch && <p className="text-xs text-gray-400 truncate">{p.pastorChurch}</p>}
              </div>
              {selectedIds.has(p.id) && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      {search.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-gray-400 mt-1.5 ml-1">No pastors found</p>
      )}
    </div>
  );
}

export default function NewPrayerRequestModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'GENERAL', isUrgent: false });
  const [visibility, setVisibility] = useState('PUBLIC');
  const [selectedPastors, setSelectedPastors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePastor(pastor) {
    setSelectedPastors(prev =>
      prev.some(p => p.id === pastor.id)
        ? prev.filter(p => p.id !== pastor.id)
        : [...prev, pastor]
    );
  }

  const submitDisabled =
    loading ||
    !form.title.trim() ||
    !form.body.trim() ||
    (visibility === 'PASTOR_ONLY' && selectedPastors.length === 0);

  async function handleSubmit(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/prayers', {
        ...form,
        visibility,
        pastorIds: visibility === 'PASTOR_ONLY' ? selectedPastors.map(p => p.id) : [],
      });
      onCreate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white rounded-t-3xl w-full max-w-md pb-8 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-gray-400 font-semibold text-sm">Cancel</button>
          <h2 className="font-bold text-gray-900">Share a Prayer Request</h2>
          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
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

          {/* Visibility */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Who can see this?</p>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-bold transition-all ${
                    visibility === v.id
                      ? 'bg-amber-400 border-amber-400 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="text-base">{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>

            {visibility === 'PRIVATE' && (
              <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold">🔒 Private</span> — Only verified pastors can see this. Your name will be hidden — your location will be shown instead.
                </p>
              </div>
            )}

            {visibility === 'PASTOR_ONLY' && (
              <div className="mt-3 space-y-3">
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-purple-700 leading-relaxed">
                    <span className="font-semibold">✝️ Pastor Only</span> — Only pastors you select can see this. Your name will be hidden — your location will be shown instead.
                  </p>
                </div>
                <PastorPicker selectedPastors={selectedPastors} onToggle={togglePastor} />
                {selectedPastors.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">Select at least one pastor to continue</p>
                )}
              </div>
            )}
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
            disabled={submitDisabled}
            className="w-full prayer-gradient text-white rounded-2xl py-4 text-sm font-bold disabled:opacity-60 shadow-sm"
          >
            {loading ? 'Posting...' : 'Share Request 🙏'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
