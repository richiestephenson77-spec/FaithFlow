import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import api from '../utils/api';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import PullToRefresh from '../components/PullToRefresh';

const ACCENT = '#2C4055';
const BG = '#F5F7F8';

function dateLabel(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d);
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CardSkeletons() {
  return (
    <div className="space-y-3 px-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EFEFEF' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <Skeleton width={36} height={36} circle />
            <div className="space-y-1.5">
              <Skeleton width={120} height={12} />
              <Skeleton width={80} height={10} />
            </div>
          </div>
          <Skeleton width="100%" height={14} />
          <div className="mt-2"><Skeleton width="70%" height={14} /></div>
        </div>
      ))}
    </div>
  );
}

function AnsweredCard({ item }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EFEFEF' }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar user={item.user} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{item.user?.name || 'Someone'}</p>
          <p className="text-[11px]" style={{ color: '#8E8E8E' }}>
            {item.user?.churchName ? `${item.user.churchName} · ` : ''}Answered {dateLabel(item.answeredAt)}
          </p>
        </div>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(44,64,85,0.1)', color: ACCENT }}>
          Answered
        </span>
      </div>

      <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{item.title}</p>
      <p className="text-sm mt-0.5 leading-snug" style={{ color: '#5C6672' }}>{item.body}</p>

      {item.testimonyMessage && (
        <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(44,64,85,0.05)' }}>
          <p className="text-[11px] font-semibold mb-0.5" style={{ color: ACCENT }}>How God answered</p>
          <p className="text-sm leading-snug whitespace-pre-line" style={{ color: '#3D4A57' }}>{item.testimonyMessage}</p>
        </div>
      )}

      <p className="text-[11px] mt-2.5" style={{ color: '#9AA6AD' }}>
        {item.prayerCount} {item.prayerCount === 1 ? 'person' : 'people'} prayed
      </p>
    </div>
  );
}

function GraceCard({ item }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EFEFEF' }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar user={item.user} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#0A0A0A' }}>{item.user?.name || 'Someone'}</p>
          <p className="text-[11px]" style={{ color: '#8E8E8E' }}>{dateLabel(item.createdAt)}</p>
        </div>
        <Sparkles size={15} strokeWidth={1.8} color={ACCENT} className="ml-auto flex-shrink-0" />
      </div>
      <p className="text-sm leading-snug" style={{ color: '#3D4A57' }}>{item.content}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-16 px-8">
      <p className="text-sm" style={{ color: '#9AA6AD' }}>{text}</p>
    </div>
  );
}

export default function AnsweredPrayers() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('answered'); // 'answered' | 'grace'
  const [answered, setAnswered] = useState(null);
  const [grace, setGrace] = useState(null);

  const load = useCallback(async (which) => {
    if (which === 'answered') {
      try { const res = await api.get('/prayers/answered', { params: { page: 1, limit: 30 } }); setAnswered(res.data.items || []); }
      catch { setAnswered([]); }
    } else {
      try { const res = await api.get('/gratitude/public', { params: { page: 1, limit: 30 } }); setGrace(res.data.items || []); }
      catch { setGrace([]); }
    }
  }, []);

  useEffect(() => {
    if (tab === 'answered' && answered === null) load('answered');
    if (tab === 'grace' && grace === null) load('grace');
  }, [tab, answered, grace, load]);

  const list = tab === 'answered' ? answered : grace;

  return (
    <PullToRefresh onRefresh={() => load(tab)}>
    <div className="min-h-full pb-10" style={{ background: BG }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3 bg-white" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 flex-shrink-0">
          <ChevronLeft size={22} color="#0A0A0A" strokeWidth={2} />
        </button>
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Answered</h2>
          <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>Prayers answered and grace shared</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 bg-white" style={{ borderBottom: '1px solid #EFEFEF' }}>
        {[{ id: 'answered', label: 'Answered Prayers' }, { id: 'grace', label: 'Daily Grace' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-full text-sm text-center transition-colors"
            style={{
              background: tab === t.id ? 'rgba(44,64,85,0.08)' : 'transparent',
              color: tab === t.id ? ACCENT : '#8E8E8E',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="pt-3">
        {list === null ? (
          <CardSkeletons />
        ) : list.length === 0 ? (
          <EmptyState text={tab === 'answered' ? 'No answered prayers shared yet.' : 'No public gratitude shared yet.'} />
        ) : (
          <div className="space-y-3 px-4">
            {tab === 'answered'
              ? list.map(item => <AnsweredCard key={item.id} item={item} />)
              : list.map(item => <GraceCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
