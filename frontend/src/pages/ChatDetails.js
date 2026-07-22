import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Search, BellOff, Bell, MoreHorizontal, Palette, EyeOff, ShieldCheck, Download, Check } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import ReportSheet from '../components/ReportSheet';
import ImageLightbox from '../components/ImageLightbox';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../utils/haptics';
import { CHAT_THEMES, CHAT_THEME_ORDER, getChatTheme } from '../utils/chatThemes';
import { vanishLabel } from '../utils/vanish';

const BLACK = '#0A0A0A';

function QuickAction({ Icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-1">
      <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: active ? '#2C4055' : '#F2F3F4' }}>
        <Icon size={20} strokeWidth={1.9} color={active ? '#fff' : BLACK} />
      </span>
      <span className="text-[11px]" style={{ color: '#3D4A57' }}>{label}</span>
    </button>
  );
}

function Row({ Icon, label, sub, right, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50" style={{ borderBottom: '1px solid #F2F2F2' }}>
      <Icon size={20} strokeWidth={1.8} color={BLACK} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: BLACK }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{sub}</p>}
      </div>
      {right}
    </button>
  );
}

function Toggle({ on }) {
  return (
    <span className="relative inline-flex flex-shrink-0 rounded-full transition-colors" style={{ width: 44, height: 26, background: on ? '#2C4055' : '#D1D5DB' }}>
      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 22, height: 22, left: on ? 20 : 2 }} />
    </span>
  );
}

export default function ChatDetails() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const showToast = useToast();

  const [other, setOther] = useState(location.state?.other || null);
  const [settings, setSettings] = useState(location.state?.settings || null);
  const [media, setMedia] = useState(null);
  const [muted, setMuted] = useState(false); // UI-only this batch
  const [themePicker, setThemePicker] = useState(false);
  const [options, setOptions] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const load = useCallback(async () => {
    try {
      const [convRes, mediaRes, threadRes] = await Promise.all([
        api.get('/messages/conversations'),
        api.get(`/messages/conversations/${conversationId}/media`),
        settings ? Promise.resolve(null) : api.get(`/messages/conversations/${conversationId}`),
      ]);
      const convo = convRes.data.find(c => c.id === conversationId);
      if (convo?.other) setOther(convo.other);
      setMedia(mediaRes.data);
      if (threadRes) setSettings(threadRes.data.settings);
    } catch { setMedia([]); }
  }, [conversationId, settings]);

  useEffect(() => { load(); }, [load]);

  async function patchSettings(patch) {
    setSettings(s => ({ ...(s || {}), ...patch })); // optimistic
    try { await api.patch(`/messages/conversations/${conversationId}/settings`, patch); }
    catch (err) { showToast(err.friendlyMessage || 'Could not update setting', 'error'); }
  }

  function pickTheme(id) {
    hapticLight();
    patchSettings({ theme: id });
    setThemePicker(false);
    showToast(`${CHAT_THEMES[id].name} theme applied`);
  }

  async function toggleAutoDownload() {
    const next = !user?.autoDownloadMedia;
    updateUser({ autoDownloadMedia: next }); // optimistic
    try { await api.patch('/users/me/settings', { autoDownloadMedia: next }); }
    catch (err) { updateUser({ autoDownloadMedia: !next }); showToast(err.friendlyMessage || 'Could not update', 'error'); }
  }

  async function doBlock() {
    try {
      await api.post('/blocks', { userId: other?.id });
      showToast(`Blocked ${other?.name?.split(' ')[0] || ''}`.trim());
      navigate('/messages');
    } catch (err) { showToast(err.friendlyMessage || 'Could not block', 'error'); }
  }

  return (
    <div className="bg-gray-50 min-h-full pb-10">
      {/* Top bar */}
      <div className="bg-white px-3 pt-4 pb-2 flex items-center" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center">
          <ChevronLeft size={24} color={BLACK} strokeWidth={2} />
        </button>
      </div>

      {/* Identity */}
      <div className="bg-white px-5 pt-4 pb-5 flex flex-col items-center text-center" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <div style={{ transform: 'scale(1.6)', margin: '10px 0 18px' }}>
          {other ? <Avatar user={other} size="xl" /> : <div className="w-16 h-16 rounded-full bg-gray-100" />}
        </div>
        <p className="text-xl font-bold" style={{ color: BLACK, fontFamily: "'Fraunces', serif" }}>{other?.name || '…'}</p>
        {other?.churchName && <p className="text-sm mt-0.5" style={{ color: '#8E8E8E' }}>{other.churchName}</p>}

        {/* Quick actions */}
        <div className="flex items-stretch gap-2 mt-5 w-full">
          <QuickAction Icon={User} label="Profile" onClick={() => other && navigate(`/profile/${other.id}`)} />
          <QuickAction Icon={Search} label="Search" onClick={() => showToast('Search in chat is coming soon')} />
          <QuickAction Icon={muted ? BellOff : Bell} label={muted ? 'Muted' : 'Mute'} active={muted} onClick={() => { setMuted(m => !m); hapticLight(); }} />
          <QuickAction Icon={MoreHorizontal} label="Options" onClick={() => setOptions(true)} />
        </div>
      </div>

      {/* Settings list */}
      <div className="mt-3 bg-white" style={{ borderTop: '1px solid #EFEFEF', borderBottom: '1px solid #EFEFEF' }}>
        <Row Icon={Palette} label="Theme" sub={getChatTheme(settings?.theme).name}
          right={<ChevronRight size={18} color="#C7C7C7" />} onClick={() => setThemePicker(true)} />
        <Row Icon={EyeOff} label="Vanish mode" sub={vanishLabel(settings?.vanishMode || 'off')}
          right={<ChevronRight size={18} color="#C7C7C7" />}
          onClick={() => navigate(`/messages/${conversationId}/vanish`, { state: { current: settings?.vanishMode || 'off' } })} />
        <Row Icon={ShieldCheck} label="Privacy & safety"
          right={<ChevronRight size={18} color="#C7C7C7" />}
          onClick={() => navigate(`/messages/${conversationId}/privacy`, { state: { other, settings } })} />
        <Row Icon={Download} label="Auto-download media" sub="Automatically download photos. When off, tap to load."
          right={<Toggle on={!!user?.autoDownloadMedia} />} onClick={toggleAutoDownload} />
      </div>

      {/* Shared media */}
      <div className="px-4 mt-5">
        <p className="text-sm font-bold mb-2.5" style={{ color: BLACK, fontFamily: "'Fraunces', serif" }}>Shared media</p>
        {media === null ? (
          <div className="grid grid-cols-3 gap-1">
            {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: '#9AA6AD' }}>No media shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {media.map(m => (
              <button key={m.id} onClick={() => setLightboxSrc(m.mediaUrl)} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img loading="lazy" decoding="async" src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme picker sheet */}
      <AnimatePresence>
        {themePicker && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setThemePicker(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="bg-white w-full max-w-md mx-auto rounded-t-3xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #EFEFEF' }}>
                <h3 className="font-bold text-[15px]" style={{ color: BLACK, fontFamily: "'Fraunces', serif" }}>Theme</h3>
                <button onClick={() => setThemePicker(false)} className="text-sm font-medium" style={{ color: '#8E8E8E' }}>Done</button>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {CHAT_THEME_ORDER.map(id => {
                  const t = CHAT_THEMES[id];
                  const selected = (settings?.theme || 'light') === id;
                  return (
                    <button key={id} onClick={() => pickTheme(id)} className="flex flex-col items-center gap-1.5">
                      <span className="relative w-full rounded-2xl overflow-hidden flex flex-col justify-end p-1.5 gap-1"
                        style={{ height: 76, background: t.background, border: `2px solid ${selected ? '#2C4055' : '#EFEFEF'}` }}>
                        <span className="self-start rounded-full" style={{ width: '55%', height: 12, background: t.theirBubble, border: `1px solid ${t.theirBubbleBorder}` }} />
                        <span className="self-end rounded-full" style={{ width: '55%', height: 12, background: t.myBubble }} />
                        {selected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#2C4055' }}>
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="text-[11px]" style={{ color: BLACK }}>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Options sheet */}
      {options && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setOptions(false)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setOptions(false); setReportOpen(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#1A1A1A' }}>Report</button>
            <button onClick={() => { setOptions(false); setBlockConfirm(true); }} className="w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl" style={{ color: '#C0392B' }}>Block user</button>
            <button onClick={() => setOptions(false)} className="w-full text-center px-4 py-3.5 text-sm font-semibold rounded-xl mt-1" style={{ color: '#8E8E8E' }}>Cancel</button>
          </div>
        </div>
      )}

      {reportOpen && other && (
        <ReportSheet contentType="PROFILE" contentId={other.id} reportedUserId={other.id} onClose={() => setReportOpen(false)} />
      )}

      {blockConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-8" onClick={() => setBlockConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-[15px]" style={{ color: BLACK }}>Block {other?.name || 'this user'}?</p>
            <p className="text-sm mt-2 leading-snug" style={{ color: '#6B7680' }}>They won't be able to message you or see your content, and you won't see theirs.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setBlockConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: '#F0F0F0', color: '#1A1A1A' }}>Cancel</button>
              <button onClick={doBlock} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: '#C0392B' }}>Block</button>
            </div>
          </div>
        </div>
      )}

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
