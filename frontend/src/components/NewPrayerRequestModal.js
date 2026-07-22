import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Lock, Shield, Search, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { track } from '../utils/analytics';
import { hapticSuccess } from '../utils/haptics';
import { useToast } from '../contexts/ToastContext';
import Avatar from './Avatar';

const CATEGORIES = [
  { id: 'GENERAL',      label: 'General' },
  { id: 'HEALTH',       label: 'Health' },
  { id: 'FAMILY',       label: 'Family' },
  { id: 'CAREER',       label: 'Career' },
  { id: 'FINANCIAL',    label: 'Financial' },
  { id: 'RELATIONSHIP', label: 'Relationship' },
  { id: 'SPIRITUAL',    label: 'Spiritual' },
];

const VISIBILITY = [
  { id: 'PUBLIC',      label: 'Everyone', Icon: Globe },
  { id: 'PRIVATE',     label: 'Private',  Icon: Lock },
  { id: 'PASTOR_ONLY', label: 'Pastor Only', Icon: Shield },
];

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

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
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-2 pt-2"
    >
      {selectedPastors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPastors.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 bg-terracotta-50 border border-terracotta-200 rounded-full px-3 py-1">
              <span className="text-xs font-semibold text-terracotta-700">{p.name}</span>
              <button onClick={() => onToggle(p)} aria-label={`Remove ${p.name}`} className="text-terracotta-400">
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.8} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for a pastor..."
          className="w-full bg-gray-50 rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
        />
      </div>
      {searching && <p className="text-xs text-gray-400 px-1">Searching...</p>}
      {results.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                selectedIds.has(p.id) ? 'bg-terracotta-50' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Avatar user={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                {p.pastorChurch && <p className="text-xs text-gray-400 truncate">{p.pastorChurch}</p>}
              </div>
              {selectedIds.has(p.id) && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      {search.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-gray-400 px-1">No pastors found</p>
      )}
      {selectedPastors.length === 0 && (
        <p className="text-xs text-terracotta-500 font-medium px-1">Select at least one pastor to continue</p>
      )}
    </motion.div>
  );
}

export default function NewPrayerRequestModal({ onClose, onCreate, initialBody = '' }) {
  const showToast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState('GENERAL');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedPastors, setSelectedPastors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const titleRef = useRef(null);

  // Load draft on open
  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await api.get('/prayers/draft');
        if (res.data && (res.data.title || res.data.body)) {
          setTitle(res.data.title || '');
          setBody(res.data.body || '');
          setCategory(res.data.category || 'GENERAL');
          setVisibility(res.data.visibility || 'PUBLIC');
          setIsUrgent(res.data.isUrgent || false);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 2500);
        }
      } catch {}
    }
    loadDraft();
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  // Auto-save draft with debounce
  const saveDraft = useMemo(() => debounce(async (data) => {
    try {
      await api.patch('/prayers/draft', data);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {}
  }, 1500), []);

  useEffect(() => {
    saveDraft({ title, body, category, visibility, isUrgent });
  }, [title, body, category, visibility, isUrgent, saveDraft]);

  function togglePastor(pastor) {
    setSelectedPastors(prev =>
      prev.some(p => p.id === pastor.id)
        ? prev.filter(p => p.id !== pastor.id)
        : [...prev, pastor]
    );
  }

  const submitDisabled =
    loading ||
    !title.trim() ||
    (visibility === 'PASTOR_ONLY' && selectedPastors.length === 0);

  async function handleSubmit() {
    if (submitDisabled) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/prayers', {
        title, body, category, visibility, isUrgent,
        pastorIds: visibility === 'PASTOR_ONLY' ? selectedPastors.map(p => p.id) : [],
      });
      // delete draft on success
      api.delete('/prayers/draft').catch(() => {});
      track('prayer_request_created', { category, visibility, isUrgent });
      hapticSuccess();
      showToast('Prayer request posted');
      onCreate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post request');
      showToast(err.friendlyMessage || err.response?.data?.error || 'Failed to post request', 'error');
      setLoading(false);
    }
  }

  const draftLabel = draftRestored ? '● Draft restored' : draftSaved ? '● Draft saved' : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white w-full max-w-md pb-10 max-h-[92vh] overflow-y-auto"
        style={{ borderRadius: '28px 28px 0 0' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100"
          >
            <X size={18} color="#9ca3af" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">New Prayer</span>
            <AnimatePresence>
              {draftLabel && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="text-xs px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-600"
                >
                  {draftLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="text-white text-sm font-medium px-5 py-2 rounded-full transition-colors"
            style={{ background: submitDisabled ? '#E9B9A6' : '#2C4055' }}
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>

        <div className="px-5 pt-5 space-y-5">
          {error && <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div>}

          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What do you need prayer for?"
            className="w-full text-xl font-semibold text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
          />

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Body */}
          <div className="relative">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 500))}
              placeholder="Share more details... (optional)"
              rows={4}
              className="w-full text-base text-gray-600 placeholder-gray-300 focus:outline-none bg-transparent resize-none"
            />
            <p className="text-xs text-gray-300 text-right">{body.length} / 500</p>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Category chips */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: category === cat.id ? '#111827' : '#F3F4F6',
                    color: category === cat.id ? '#FFFFFF' : '#4B5563',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Visibility segmented control */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Visibility</p>
            <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
              {VISIBILITY.map(v => {
                const active = visibility === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVisibility(v.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm transition-all"
                    style={{
                      background: active ? '#FFFFFF' : 'transparent',
                      color: active ? '#111827' : '#9CA3AF',
                      fontWeight: active ? 600 : 400,
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <v.Icon size={13} strokeWidth={active ? 2 : 1.5} />
                    <span className="text-xs">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {(visibility === 'PRIVATE' || visibility === 'PASTOR_ONLY') && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-gray-400 mt-2 px-1 leading-relaxed"
                >
                  {visibility === 'PRIVATE'
                    ? 'Only verified pastors can read this. Your location will be shown instead of your name.'
                    : 'Only the pastors you select will see this request.'}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {visibility === 'PASTOR_ONLY' && (
                <PastorPicker selectedPastors={selectedPastors} onToggle={togglePastor} />
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Urgent toggle */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Urgent Request</p>
              <p className="text-xs text-gray-400 mt-0.5">Pinned to top of feed</p>
            </div>
            <button
              type="button"
              onClick={() => setIsUrgent(v => !v)}
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: isUrgent ? '#2C4055' : '#E5E7EB' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isUrgent ? 'translateX(24px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
