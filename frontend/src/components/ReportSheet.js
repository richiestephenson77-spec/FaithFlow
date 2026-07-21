import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const ACCENT = '#2C4055';

export const REPORT_REASONS = [
  { id: 'SPAM', label: 'Spam' },
  { id: 'HARASSMENT', label: 'Harassment or bullying' },
  { id: 'HATE_SPEECH', label: 'Hate speech' },
  { id: 'SEXUAL_CONTENT', label: 'Sexual content' },
  { id: 'VIOLENCE', label: 'Violence' },
  { id: 'SELF_HARM', label: 'Self-harm' },
  { id: 'MISINFORMATION', label: 'Misinformation' },
  { id: 'OTHER', label: 'Something else' },
];

// Reusable report bottom sheet. Reports content of any type; on success shows a
// toast and calls onReported() so the caller can optimistically hide the item.
export default function ReportSheet({ contentType, contentId, reportedUserId, onClose, onReported }) {
  const showToast = useToast();
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/reports', { contentType, contentId, reason, details: details.trim() || undefined, reportedUserId });
      showToast('Thanks for reporting. Our team will review this.');
      onReported && onReported();
      onClose();
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not submit report', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #EFEFEF' }}>
          <button onClick={onClose} className="text-sm font-medium" style={{ color: '#8E8E8E' }}>Cancel</button>
          <h3 className="font-bold text-[15px]" style={{ color: '#163449', fontFamily: "'Fraunces', serif" }}>Report</h3>
          <button onClick={submit} disabled={!reason || submitting} className="text-sm font-bold disabled:opacity-40" style={{ color: ACCENT }}>
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9AA6AD' }}>Why are you reporting this?</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #EFEFEF' }}>
            {REPORT_REASONS.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setReason(r.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #EFEFEF', color: '#1A1A1A', background: reason === r.id ? 'rgba(44,64,85,0.06)' : '#fff' }}
              >
                <span>{r.label}</span>
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ border: `2px solid ${reason === r.id ? ACCENT : '#D1D5DB'}`, background: reason === r.id ? ACCENT : 'transparent' }}
                />
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Add details (optional)"
            rows={3}
            maxLength={1000}
            className="w-full mt-4 rounded-2xl px-4 py-3 text-sm focus:outline-none resize-none"
            style={{ border: '1px solid #EFEFEF' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
