import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import ReportSheet from './ReportSheet';

// Drop-in "•••" moderation control for any reportable content.
//   <ContentModeration contentType="PRAYER" contentId={r.id}
//      targetUserId={r.user?.id} targetName={r.user?.name}
//      onHidden={() => hide(r.id)} />
// Confessions are anonymous, so pass no targetUserId — only Report is offered.
export default function ContentModeration({
  contentType, contentId, targetUserId, targetName, onHidden,
  iconSize = 18, iconColor = '#9AA6AD', className = '',
}) {
  const showToast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const canBlock = !!targetUserId; // caller omits targetUserId for own content / anonymous

  async function doBlock() {
    if (blocking) return;
    setBlocking(true);
    try {
      await api.post('/blocks', { userId: targetUserId });
      showToast(`Blocked${targetName ? ` ${targetName.split(' ')[0]}` : ''}`);
      setConfirmBlock(false);
      onHidden && onHidden();
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not block user', 'error');
      setBlocking(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(true); }}
        aria-label="More options"
        className={`flex items-center justify-center ${className}`}
      >
        <MoreHorizontal size={iconSize} strokeWidth={2} color={iconColor} />
      </button>

      {/* Action sheet */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2">
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                  className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl"
                  style={{ color: '#1A1A1A' }}
                >
                  Report
                </button>
                {canBlock && (
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmBlock(true); }}
                    className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl"
                    style={{ color: '#C0392B' }}
                  >
                    Block user
                  </button>
                )}
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1"
                  style={{ color: '#8E8E8E' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report sheet */}
      <AnimatePresence>
        {reportOpen && (
          <ReportSheet
            contentType={contentType}
            contentId={contentId}
            reportedUserId={targetUserId}
            onClose={() => setReportOpen(false)}
            onReported={onHidden}
          />
        )}
      </AnimatePresence>

      {/* Block confirmation */}
      <AnimatePresence>
        {confirmBlock && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-8" onClick={() => setConfirmBlock(false)}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xs p-5 text-center"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-bold text-[15px]" style={{ color: '#163449' }}>Block {targetName || 'this user'}?</p>
              <p className="text-sm mt-2 leading-snug" style={{ color: '#6B7680' }}>
                They won't be able to message you or see your content, and you won't see theirs.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmBlock(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: '#F0F0F0', color: '#1A1A1A' }}
                >
                  Cancel
                </button>
                <button
                  onClick={doBlock}
                  disabled={blocking}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#C0392B' }}
                >
                  {blocking ? 'Blocking…' : 'Block'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
