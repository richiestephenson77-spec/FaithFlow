import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { hapticLight } from '../utils/haptics';
import { VANISH_OPTIONS } from '../utils/vanish';

const BLACK = '#0A0A0A';

export default function ChatVanish() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  // Seed from nav state for an instant paint, but always confirm against the
  // authoritative persisted value so a reopen shows the real saved option.
  const [mode, setMode] = useState(location.state?.current || 'off');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/messages/conversations/${conversationId}/settings`)
      .then(res => { if (alive && res.data?.vanishMode) setMode(res.data.vanishMode); })
      .catch(() => {});
    return () => { alive = false; };
  }, [conversationId]);

  async function pick(id) {
    if (saving) return;
    hapticLight();
    setMode(id);
    setSaving(true);
    try {
      await api.patch(`/messages/conversations/${conversationId}/settings`, { vanishMode: id });
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not update', 'error');
    }
    setSaving(false);
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-3 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-11 h-11 flex items-center justify-center -ml-2">
          <ChevronLeft size={24} color={BLACK} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: BLACK, fontFamily: "'Fraunces', serif" }}>Vanish mode</h1>
      </div>

      <div className="mt-3 bg-white" style={{ borderTop: '1px solid #EFEFEF', borderBottom: '1px solid #EFEFEF' }}>
        {VANISH_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => pick(opt.id)}
            className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
            style={{ borderBottom: '1px solid #F2F2F2' }}
          >
            <span className="flex-1 text-sm font-medium" style={{ color: BLACK }}>{opt.label}</span>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: `2px solid ${mode === opt.id ? '#2C4055' : '#D1D5DB'}`, background: mode === opt.id ? '#2C4055' : 'transparent' }}
            >
              {mode === opt.id && <Check size={12} color="#fff" strokeWidth={3} />}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs px-5 mt-3 leading-relaxed" style={{ color: '#8E8E8E' }}>
        When vanish mode is on, new messages disappear automatically. “After seen” removes them once
        the other person has seen them and left the chat; the timed options delete every message after
        the chosen duration. This applies to the whole conversation for both people.
      </p>
    </div>
  );
}
