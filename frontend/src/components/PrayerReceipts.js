import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../utils/api';
import Avatar from './Avatar';

const ACCENT = '#2C4055';

function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function dayLabel(day) {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === today) return 'Today';
  if (day === yest) return 'Yesterday';
  return new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// "Prayed for you" receipts strip. Self-fetches; renders nothing unless there's
// real activity (no empty state), per spec.
export default function PrayerReceipts() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/prayers/prayed-for-me')
      .then(res => { if (alive) setData(res.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!data || data.total === 0) return null;

  const people = data.recentPeople || [];
  const names = people.slice(0, 2).map(p => p.name?.split(' ')[0]).filter(Boolean);
  // Prefer the "today" framing when there's activity today, else fall back to total
  const useToday = data.todayCount > 0;
  const headCount = useToday ? data.todayPeople : (data.recentPeople?.length || 0);
  const extra = Math.max(0, headCount - names.length);

  let summary;
  if (names.length === 0) {
    summary = `${data.total} ${data.total === 1 ? 'prayer' : 'prayers'} for you`;
  } else if (extra <= 0) {
    summary = `${names.join(' and ')} prayed for you${useToday ? ' today' : ''}`;
  } else {
    summary = `${names.join(', ')} and ${extra} ${extra === 1 ? 'other' : 'others'} prayed for you${useToday ? ' today' : ''}`;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5 mb-3"
        style={{ border: '1px solid #EFEFEF' }}
      >
        <div className="flex -space-x-2 flex-shrink-0">
          {people.slice(0, 4).map((p, i) => (
            <div key={p.id || i} className="rounded-full ring-2 ring-white" style={{ zIndex: 4 - i }}>
              <Avatar user={p} size="xs" />
            </div>
          ))}
        </div>
        <span className="text-xs text-left leading-snug flex-1" style={{ color: '#3D4A57' }}>{summary}</span>
        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: ACCENT }}>View</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="bg-white w-full max-w-md mx-auto rounded-t-3xl max-h-[80vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #EFEFEF' }}>
                <h3 className="font-bold text-[15px]" style={{ color: '#0A0A0A' }}>Prayed for you</h3>
                <button onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <X size={16} color="#8E8E8E" />
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-3">
                {(data.groups || []).map(g => (
                  <div key={g.day} className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#9AA6AD' }}>{dayLabel(g.day)}</p>
                    <div className="space-y-2.5">
                      {g.entries.map((e, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <Avatar user={{ name: e.name, profilePhoto: e.profilePhoto }} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: '#0A0A0A' }}>{e.name || 'Someone'}</p>
                            <p className="text-[11px] truncate" style={{ color: '#8E8E8E' }}>
                              prayed for “{e.requestTitle || 'your request'}”
                            </p>
                          </div>
                          <span className="text-[11px] flex-shrink-0" style={{ color: '#B0AEA8' }}>{timeAgo(e.prayedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
