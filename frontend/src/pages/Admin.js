import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const REMOVABLE = ['PRAYER', 'CONFESSION', 'COMMENT', 'MESSAGE'];

function ContentPreview({ content, contentType }) {
  if (!content) return <p className="text-xs text-gray-400 italic">Content not found (may already be deleted).</p>;
  switch (content.kind) {
    case 'PRAYER':
      return (
        <div>
          <p className="text-sm font-semibold text-gray-900">{content.title}</p>
          <p className="text-sm text-gray-600 mt-0.5">{content.body}</p>
          <p className="text-[11px] text-gray-400 mt-1">by {content.author?.name || 'unknown'}</p>
        </div>
      );
    case 'CONFESSION':
      return (
        <div>
          <p className="text-sm text-gray-700">{content.content}</p>
          <div className="mt-1.5 rounded-lg px-2 py-1 inline-block" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <p className="text-[11px]" style={{ color: '#92400E' }}>
              🔒 Sensitive — author revealed for moderation only: <strong>{content.sensitiveAuthor?.name || 'unknown'}</strong>
            </p>
          </div>
        </div>
      );
    case 'COMMENT':
      return (
        <div>
          <p className="text-sm text-gray-700">{content.content}</p>
          <p className="text-[11px] text-gray-400 mt-1">{content.isAnonymous ? 'posted anonymously — ' : ''}by {content.author?.name || 'unknown'}</p>
        </div>
      );
    case 'MESSAGE':
      return (
        <div>
          <p className="text-sm text-gray-700">{content.content || '(non-text message)'}</p>
          <p className="text-[11px] text-gray-400 mt-1">from {content.author?.name || 'unknown'}</p>
        </div>
      );
    case 'PROFILE':
      return (
        <div>
          <p className="text-sm font-semibold text-gray-900">{content.name}</p>
          {content.bio && <p className="text-sm text-gray-600 mt-0.5">{content.bio}</p>}
          {content.isSuspended && <p className="text-[11px] text-red-500 mt-1">Already suspended</p>}
        </div>
      );
    case 'PRAYER_CELL':
      return <p className="text-sm text-gray-700">Prayer cell hosted by {content.author?.name || 'unknown'} {content.isActive ? '(live)' : '(ended)'}</p>;
    default:
      return <p className="text-xs text-gray-400">{contentType}</p>;
  }
}

export default function Admin() {
  const { user } = useAuth();
  const showToast = useToast();
  const [reports, setReports] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/reports', { params: { status: 'PENDING' } })
      .then(res => setReports(res.data))
      .catch(() => setReports([]));
  }, []);

  useEffect(() => { if (user?.isAdmin) load(); }, [user, load]);

  // Guard — non-admins never see this
  if (user && !user.isAdmin) return <Navigate to="/" replace />;

  async function act(fn, id) {
    setBusy(id);
    try { await fn(); load(); }
    catch (err) { showToast(err.friendlyMessage || err.response?.data?.error || 'Action failed', 'error'); }
    setBusy(null);
  }

  const removeContent = (r) => act(async () => {
    await api.post('/admin/content/remove', { contentType: r.contentType, contentId: r.contentId, reason: `Report: ${r.reason}` });
    showToast('Content removed');
  }, r.id);

  const dismiss = (r) => act(async () => {
    await api.patch(`/admin/reports/${r.id}`, { status: 'DISMISSED' });
    showToast('Report dismissed');
  }, r.id);

  const suspend = (r) => {
    const uid = r.content?.authorId || r.reportedUser?.id;
    if (!uid) { showToast('No user to suspend for this report', 'error'); return; }
    act(async () => {
      await api.post(`/admin/users/${uid}/suspend`, { suspend: true });
      await api.patch(`/admin/reports/${r.id}`, { status: 'ACTIONED' });
      showToast('User suspended');
    }, r.id);
  };

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-4 pt-5 pb-3" style={{ borderBottom: '1px solid #EFEFEF' }}>
        <h1 className="text-lg font-bold" style={{ color: '#0A0A0A', fontFamily: "'Fraunces', serif" }}>Moderation</h1>
        <p className="text-xs mt-0.5" style={{ color: '#8E8E8E' }}>Pending reports</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {reports === null ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No pending reports 🎉</p>
        ) : (
          reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EFEFEF' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}>
                  {r.reason}
                </span>
                <span className="text-[11px] text-gray-400">{r.contentType} · {new Date(r.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="rounded-xl p-3 mb-2" style={{ background: '#FAFAFA', border: '1px solid #F0F0F0' }}>
                <ContentPreview content={r.content} contentType={r.contentType} />
                {r.content?.isRemoved && <p className="text-[11px] text-red-500 mt-1.5">Already removed</p>}
              </div>

              {r.details && <p className="text-xs text-gray-500 mb-2">“{r.details}”</p>}
              <p className="text-[11px] text-gray-400 mb-3">Reported by {r.reporter?.name || 'unknown'}</p>

              <div className="flex flex-wrap gap-2">
                {REMOVABLE.includes(r.contentType) && !r.content?.isRemoved && (
                  <button
                    onClick={() => removeContent(r)}
                    disabled={busy === r.id}
                    className="text-xs font-semibold px-3.5 py-2 rounded-xl text-white disabled:opacity-50"
                    style={{ background: '#C0392B' }}
                  >
                    Remove content
                  </button>
                )}
                <button
                  onClick={() => suspend(r)}
                  disabled={busy === r.id}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: 'rgba(44,64,85,0.1)', color: '#0A0A0A' }}
                >
                  Suspend user
                </button>
                <button
                  onClick={() => dismiss(r)}
                  disabled={busy === r.id}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl disabled:opacity-50"
                  style={{ background: '#F0F0F0', color: '#1A1A1A' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
