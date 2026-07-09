import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './Avatar';
import { WaterButton } from './water';

const POST_TYPES = [
  { id: 'UPDATE',    emoji: '📢', label: 'Update',    desc: 'Share something from your life' },
  { id: 'TESTIMONY', emoji: '🙌', label: 'Testimony', desc: 'Something God did for you' },
  { id: 'VERSE',     emoji: '📖', label: 'Verse',     desc: 'A Bible verse to share' },
];

export default function CreatePostModal({ onClose, onCreate }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1 = media, 2 = details
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'IMAGE' | 'VIDEO'

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('UPDATE');
  const [bibleVerse, setBibleVerse] = useState('');
  const [bibleRef, setBibleRef] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith('video') ? 'VIDEO' : 'IMAGE');
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    setStep(2);
  }

  function skipMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setStep(2);
  }

  async function handleShare() {
    if (!content.trim()) { setError('Please write a caption.'); return; }
    setSharing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('type', postType);
      if (postType === 'VERSE' && bibleVerse.trim()) {
        const verseText = bibleRef.trim() ? `${bibleRef.trim()}: ${bibleVerse.trim()}` : bibleVerse.trim();
        formData.append('bibleVerse', verseText);
      }
      if (location.trim()) formData.append('location', location.trim());
      if (mediaFile) formData.append('media', mediaFile);

      const res = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreate(res.data);
      onClose();
    } catch {
      setError('Failed to share post. Please try again.');
    }
    setSharing(false);
  }

  const typeObj = POST_TYPES.find(t => t.id === postType);

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto"
    >
      {/* STEP 1 — Media */}
      {step === 1 && (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={onClose} className="text-gray-500 p-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p className="font-bold text-gray-900 text-base">New Post</p>
            <button
              onClick={() => mediaFile && setStep(2)}
              disabled={!mediaFile}
              className={`font-bold text-sm px-3 py-1 rounded-full ${mediaFile ? 'text-amber-500' : 'text-gray-300'}`}
            >
              Next →
            </button>
          </div>

          {/* Media preview / picker */}
          <div
            className="flex-1 flex flex-col items-center justify-center bg-gray-50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {mediaPreview ? (
              mediaType === 'VIDEO'
                ? <video src={mediaPreview} className="w-full max-h-80 object-contain" controls />
                : <img src={mediaPreview} alt="preview" className="w-full max-h-80 object-contain" />
            ) : (
              <div className="text-center px-8">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-700 mb-1">Tap to select a photo or video</p>
                <p className="text-sm text-gray-400">From your camera roll</p>
              </div>
            )}
          </div>

          <div className="px-4 py-4 flex flex-col items-center gap-3 border-t border-gray-100">
            <WaterButton variant="primary" onClick={() => fileInputRef.current?.click()} className="w-full font-bold py-3 text-sm">
              {mediaPreview ? 'Change Photo / Video' : 'Choose from Gallery'}
            </WaterButton>
            <button onClick={skipMedia} className="text-sm text-gray-400 underline">
              Skip — text only post
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* STEP 2 — Caption & Details */}
      {step === 2 && (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setStep(1)} className="text-gray-500 text-sm font-semibold flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <p className="font-bold text-gray-900 text-base">New Post</p>
            <button
              onClick={handleShare}
              disabled={sharing || !content.trim()}
              className="font-bold text-sm px-4 py-1.5 rounded-full bg-amber-400 text-gray-900 disabled:opacity-40 flex items-center gap-1.5"
            >
              {sharing ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : null}
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Caption row */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              {mediaPreview && (
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {mediaType === 'VIDEO'
                    ? <video src={mediaPreview} className="w-full h-full object-cover" />
                    : <img src={mediaPreview} alt="" className="w-full h-full object-cover" />}
                </div>
              )}
              {!mediaPreview && <Avatar user={user} size="md" />}
              <div className="flex-1">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  maxLength={2000}
                  placeholder="Write a caption..."
                  rows={mediaPreview ? 4 : 5}
                  autoFocus
                  className="w-full text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
                />
                {content.length > 1800 && (
                  <p className={`text-xs mt-1 text-right ${content.length >= 2000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {2000 - content.length} remaining
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-500 px-4 pb-2">{error}</p>}

            <div className="border-t border-gray-100 mx-4" />

            {/* Options rows */}
            <div className="divide-y divide-gray-50">
              {/* Post Type */}
              <button
                onClick={() => setShowTypePicker(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{typeObj.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Post Type</p>
                    <p className="text-xs text-gray-400">{typeObj.label}</p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              {/* Bible Verse (VERSE type only) */}
              {postType === 'VERSE' && (
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">📖</span>
                    <p className="text-sm font-semibold text-gray-700">Bible Verse</p>
                  </div>
                  <textarea
                    value={bibleVerse}
                    onChange={e => setBibleVerse(e.target.value)}
                    placeholder="Type the verse text here..."
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 text-gray-700"
                  />
                  <input
                    value={bibleRef}
                    onChange={e => setBibleRef(e.target.value)}
                    placeholder="Reference (e.g. John 3:16)"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 text-gray-700"
                  />
                </div>
              )}

              {/* Location */}
              <div>
                {!showLocationInput ? (
                  <button
                    onClick={() => setShowLocationInput(true)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📍</span>
                      <p className="text-sm font-semibold text-gray-700">
                        {location ? location : 'Add Location'}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ) : (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📍</span>
                      <input
                        autoFocus
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Dallas, Texas"
                        className="flex-1 text-sm border-b border-gray-200 pb-1 focus:outline-none focus:border-amber-400 text-gray-700"
                        onKeyDown={e => e.key === 'Enter' && setShowLocationInput(false)}
                      />
                      <button onClick={() => setShowLocationInput(false)} className="text-xs font-semibold text-amber-500">Done</button>
                      {location && <button onClick={() => { setLocation(''); setShowLocationInput(false); }} className="text-xs text-gray-400">Clear</button>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Post Type Bottom Sheet */}
      {showTypePicker && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-end" onClick={() => setShowTypePicker(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
            <p className="text-center font-bold text-gray-900 mb-4 px-4">Post Type</p>
            <div className="px-4 space-y-2">
              {POST_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setPostType(t.id); setShowTypePicker(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all ${
                    postType === t.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                  {postType === t.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
