import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MoreHorizontal, Radio, Info, BarChart3, LogOut, Users, Globe, Lock, Share2, Flag } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import ReportSheet from '../components/ReportSheet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../utils/haptics';

const ACCENT = '#2C4055';
const LIVE_RED = '#ED4956';

export default function PrayerCellDetail() {
  const { cellId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();
  const [cell, setCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    setMenuOpen(false);
    const url = `${window.location.origin}/prayer-cells/${cellId}`;
    const shareText = `Join "${cell.name}" — a prayer cell on FaithString`;
    try {
      if (navigator.share) {
        await navigator.share({ title: cell.name, text: shareText, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Cell link copied');
      }
    } catch { /* user dismissed the share sheet — no-op */ }
  }

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/prayer-cells/${cellId}`);
      setCell(res.data);
    } catch (err) {
      showToast('Could not load this cell', 'error');
    }
    setLoading(false);
  }, [cellId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleJoin() {
    setBusy(true);
    try {
      const res = await api.post(`/prayer-cells/${cellId}/join`);
      if (res.data.status === 'member') { await load(); showToast('Welcome to the cell'); }
      else showToast('Request sent — an admin will review it');
      if (res.data.status !== 'member') load();
    } catch (err) {
      showToast(err.friendlyMessage || err.response?.data?.error || 'Could not join', 'error');
    }
    setBusy(false);
  }

  async function handleLeave() {
    setMenuOpen(false);
    setBusy(true);
    try {
      await api.post(`/prayer-cells/${cellId}/leave`);
      showToast('You left the cell');
      navigate('/prayer-cells');
    } catch (err) {
      showToast(err.friendlyMessage || err.response?.data?.error || 'Could not leave', 'error');
      setBusy(false);
    }
  }

  function goLive() {
    hapticLight();
    navigate(`/prayer-cells/${cellId}/session`, { state: { name: cell.name } });
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (!cell) return null;

  const isAdmin = cell.myRole === 'admin';
  const live = cell.activeSession;

  return (
    <div className="min-h-full" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <button onClick={() => navigate('/prayer-cells')} aria-label="Back" className="p-1 -ml-1">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <button onClick={() => setMenuOpen(true)} aria-label="Options" className="p-1 -mr-1">
          <MoreHorizontal size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
      </div>

      {/* Cell identity */}
      <div className="px-5 pt-2 pb-5 flex flex-col items-center text-center">
        {cell.imageUrl ? (
          <img src={cell.imageUrl} alt="" className="rounded-3xl object-cover" style={{ width: 96, height: 96 }} />
        ) : (
          <div className="rounded-3xl flex items-center justify-center" style={{ width: 96, height: 96, background: 'rgba(44,64,85,0.1)' }}>
            <span className="font-bold" style={{ color: ACCENT, fontSize: 40, fontFamily: "'Fraunces', serif" }}>{cell.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold mt-3 leading-tight" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>{cell.name}</h1>
        {cell.description && <p className="text-sm mt-1.5 leading-snug max-w-xs" style={{ color: '#5C6672' }}>{cell.description}</p>}
        <div className="flex items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#8E8E8E' }}>
            <Users size={13} strokeWidth={2} /> {cell.memberCount} {cell.memberCount === 1 ? 'member' : 'members'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#8E8E8E' }}>
            {cell.joinPolicy === 'request' ? <Lock size={12} strokeWidth={2} /> : <Globe size={12} strokeWidth={2} />}
            {cell.joinPolicy === 'request' ? 'Request to join' : 'Open'}
          </span>
        </div>
      </div>

      {/* Primary action */}
      <div className="px-5">
        {cell.isMember ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={goLive}
            className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: live ? LIVE_RED : ACCENT }}
          >
            <Radio size={17} strokeWidth={2.4} />
            {live ? `Join live prayer · ${live.participants.length} praying` : 'Start live prayer'}
          </motion.button>
        ) : cell.joinRequestStatus === 'pending' ? (
          <button disabled className="w-full h-12 rounded-xl text-sm font-bold" style={{ background: 'rgba(44,64,85,0.1)', color: '#8E8E8E' }}>
            Request pending
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={busy}
            className="w-full h-12 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {cell.joinPolicy === 'request' ? 'Request to join' : 'Join cell'}
          </motion.button>
        )}
      </div>

      {/* Live participants preview */}
      {live && live.participants.length > 0 && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: 'rgba(237,73,86,0.06)', border: '1px solid rgba(237,73,86,0.15)' }}>
            <div className="flex -space-x-2">
              {live.participants.slice(0, 4).map(p => (
                <div key={p.id} className="rounded-full border-2 border-white overflow-hidden" style={{ width: 30, height: 30 }}>
                  <Avatar user={p} size="sm" />
                </div>
              ))}
            </div>
            <p className="text-xs font-medium" style={{ color: LIVE_RED }}>Live prayer in progress</p>
          </div>
        </div>
      )}

      {/* Members section → Group Info */}
      <button
        onClick={() => navigate(`/prayer-cells/${cellId}/info`)}
        className="mx-5 mt-5 w-[calc(100%-2.5rem)] flex items-center justify-between bg-white rounded-2xl p-4"
        style={{ border: '1px solid #EFEFEF' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {cell.members.slice(0, 4).map(m => (
              <div key={m.id} className="rounded-full border-2 border-white overflow-hidden" style={{ width: 30, height: 30 }}>
                <Avatar user={m} size="sm" />
              </div>
            ))}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>Members & info</p>
            {isAdmin && cell.pendingRequestCount > 0 && (
              <p className="text-[11px] font-medium" style={{ color: ACCENT }}>{cell.pendingRequestCount} pending request{cell.pendingRequestCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <ChevronLeft size={18} color="#C7C7C7" style={{ transform: 'rotate(180deg)' }} />
      </button>

      {/* Options sheet */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setMenuOpen(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2">
                <button onClick={() => { setMenuOpen(false); navigate(`/prayer-cells/${cellId}/info`); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>
                  <Info size={18} strokeWidth={1.9} color="#0A0A0A" /> Cell info
                </button>
                <button onClick={() => { setMenuOpen(false); navigate(`/prayer-cells/${cellId}/stats`); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>
                  <BarChart3 size={18} strokeWidth={1.9} color="#0A0A0A" /> Stats
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>
                  <Share2 size={18} strokeWidth={1.9} color="#0A0A0A" /> Share cell
                </button>
                {cell.creatorId !== user?.id && (
                  <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>
                    <Flag size={18} strokeWidth={1.9} color="#0A0A0A" /> Report cell
                  </button>
                )}
                {cell.isMember && cell.creatorId !== user?.id && (
                  <button onClick={handleLeave} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#C0392B' }}>
                    <LogOut size={18} strokeWidth={1.9} color="#C0392B" /> Leave cell
                  </button>
                )}
                <button onClick={() => setMenuOpen(false)} className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1" style={{ color: '#8E8E8E' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report the cell — reuses the moderation report flow */}
      <AnimatePresence>
        {reportOpen && (
          <ReportSheet
            contentType="PRAYER_CELL"
            contentId={cellId}
            reportedUserId={cell.creatorId}
            onClose={() => setReportOpen(false)}
            onReported={() => showToast('Report submitted')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
