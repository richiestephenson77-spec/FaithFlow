import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api from '../utils/api';
import ReportSheet from '../components/ReportSheet';
import { useToast } from '../contexts/ToastContext';

const BLACK = '#0A0A0A';

function ToggleRow({ label, sub, on, onToggle }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left" style={{ borderBottom: '1px solid #F2F2F2' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: BLACK }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>{sub}</p>}
      </div>
      <span className="relative inline-flex flex-shrink-0 rounded-full" style={{ width: 44, height: 26, background: on ? '#2C4055' : '#D1D5DB' }}>
        <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 22, height: 22, left: on ? 20 : 2 }} />
      </span>
    </button>
  );
}

export default function ChatPrivacy() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();

  const [other, setOther] = useState(location.state?.other || null);
  const [settings, setSettings] = useState(location.state?.settings || null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  useEffect(() => {
    if (settings && other) return;
    Promise.all([
      api.get('/messages/conversations').catch(() => ({ data: [] })),
      api.get(`/messages/conversations/${conversationId}`).catch(() => ({ data: {} })),
    ]).then(([convRes, threadRes]) => {
      const convo = (convRes.data || []).find(c => c.id === conversationId);
      if (convo?.other) setOther(convo.other);
      if (threadRes.data?.settings) setSettings(threadRes.data.settings);
    });
  }, [conversationId, settings, other]);

  async function patch(p) {
    setSettings(s => ({ ...(s || {}), ...p }));
    try { await api.patch(`/messages/conversations/${conversationId}/settings`, p); }
    catch (err) { showToast(err.friendlyMessage || 'Could not update', 'error'); }
  }

  async function doBlock() {
    try {
      await api.post('/blocks', { userId: other?.id });
      showToast(`Blocked ${other?.name?.split(' ')[0] || ''}`.trim());
      navigate('/messages');
    } catch (err) { showToast(err.friendlyMessage || 'Could not block', 'error'); }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-3 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center -ml-2">
          <ChevronLeft size={24} color={BLACK} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: BLACK, fontFamily: "'Fraunces', serif" }}>Privacy & safety</h1>
      </div>

      <div className="mt-3 bg-white" style={{ borderTop: '1px solid #EFEFEF', borderBottom: '1px solid #EFEFEF' }}>
        <ToggleRow
          label="Read receipts" sub="Let them know when you've read a message"
          on={settings?.readReceiptsEnabled !== false}
          onToggle={() => patch({ readReceiptsEnabled: !(settings?.readReceiptsEnabled !== false) })}
        />
        <ToggleRow
          label="Typing indicator" sub="Show when you're typing"
          on={settings?.typingIndicatorEnabled !== false}
          onToggle={() => patch({ typingIndicatorEnabled: !(settings?.typingIndicatorEnabled !== false) })}
        />
      </div>

      <div className="mt-3 bg-white" style={{ borderTop: '1px solid #EFEFEF', borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => showToast('Restrict is coming soon')} className="w-full text-left px-4 py-3.5 text-sm font-medium" style={{ color: BLACK, borderBottom: '1px solid #F2F2F2' }}>Restrict</button>
        <button onClick={() => setBlockConfirm(true)} className="w-full text-left px-4 py-3.5 text-sm font-medium" style={{ color: '#C0392B', borderBottom: '1px solid #F2F2F2' }}>Block</button>
        <button onClick={() => setReportOpen(true)} className="w-full text-left px-4 py-3.5 text-sm font-medium" style={{ color: BLACK }}>Report</button>
      </div>

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
    </div>
  );
}
