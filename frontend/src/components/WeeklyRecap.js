import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2 } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const ACCENT = '#2C4055';

// Date string of the most recent Sunday (<= today), used as the once-per-week key.
function weekKey() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // getDay() 0 = Sunday
  return d.toISOString().slice(0, 10);
}

export default function WeeklyRecap() {
  const showToast = useToast();
  const [recap, setRecap] = useState(null);
  const [dismissed, setDismissed] = useState(true);
  const key = weekKey();

  useEffect(() => {
    // Show on Sundays, or the first open after (until dismissed for this week)
    if (localStorage.getItem(`recap_seen_${key}`)) return;
    api.get('/users/me/recap')
      .then(res => {
        const r = res.data;
        const meaningful = r && (r.prayersOffered > 0 || r.gratitudeEntries > 0 || r.peoplePrayedForYou > 0);
        if (meaningful) { setRecap(r); setDismissed(false); }
      })
      .catch(() => {});
  }, [key]);

  function dismiss() {
    localStorage.setItem(`recap_seen_${key}`, '1');
    setDismissed(true);
  }

  function shareText() {
    if (!recap) return '';
    const bits = [`This week I prayed ${recap.prayersOffered} ${recap.prayersOffered === 1 ? 'time' : 'times'} for ${recap.uniquePeoplePrayedFor} ${recap.uniquePeoplePrayedFor === 1 ? 'person' : 'people'}`];
    if (recap.countriesReached > 0) bits.push(`across ${recap.countriesReached} ${recap.countriesReached === 1 ? 'place' : 'places'}`);
    return `${bits.join(' ')}. 🙏 #FaithString`;
  }

  async function share() {
    const text = shareText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Recap copied to clipboard');
    } catch {
      showToast('Could not share recap', 'error');
    }
  }

  return (
    <AnimatePresence>
      {!dismissed && recap && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="rounded-2xl p-4 mb-3 text-white relative overflow-hidden"
          style={{ background: ACCENT }}
        >
          <button onClick={dismiss} aria-label="Dismiss" className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={14} color="#fff" />
          </button>

          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Your week in prayer</p>
          <p className="text-[15px] leading-snug mt-1.5 pr-8" style={{ fontFamily: "'Fraunces', serif" }}>
            You prayed <span className="font-bold">{recap.prayersOffered}</span> {recap.prayersOffered === 1 ? 'time' : 'times'} for <span className="font-bold">{recap.uniquePeoplePrayedFor}</span> {recap.uniquePeoplePrayedFor === 1 ? 'person' : 'people'}
            {recap.countriesReached > 0 && <> across <span className="font-bold">{recap.countriesReached}</span> {recap.countriesReached === 1 ? 'place' : 'places'}</>}.
          </p>

          <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {recap.peoplePrayedForYou > 0 && <span>{recap.peoplePrayedForYou} prayed for you</span>}
            {recap.gratitudeEntries > 0 && <span>{recap.gratitudeEntries} gratitude {recap.gratitudeEntries === 1 ? 'entry' : 'entries'}</span>}
            {recap.currentStreak > 0 && <span>🔥 {recap.currentStreak}-day streak</span>}
          </div>

          <button
            onClick={share}
            className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <Share2 size={13} strokeWidth={2} /> Share
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
