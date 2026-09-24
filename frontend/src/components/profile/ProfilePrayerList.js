import { MoreHorizontal, Globe, Lock, Shield, EyeOff } from 'lucide-react';
import { INK, MUTED, HAIRLINE, ACCENT } from './ProfileHeader';

// The Prayers tab: prayer REQUESTS authored by this profile's owner.
//
// It is NOT a list of people they prayed for, and NOT their private prayer
// activity — that lives in the journey and is owner-only.
//
// What reaches this component is already filtered by the server: a visitor is
// only ever sent PUBLIC, non-anonymous, non-removed requests, and the count
// beside the tab is scoped the same way. The visibility labels below are for
// the AUTHOR's benefit, so they can see at a glance which of their own
// requests other people can read.

const VISIBILITY = {
  PUBLIC: { label: 'Public', Icon: Globe, note: 'Anyone can see this' },
  PRIVATE: { label: 'Private', Icon: Lock, note: 'Only you and pastors' },
  PASTOR_ONLY: { label: 'Pastors only', Icon: Shield, note: 'Shared with pastors you chose' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Tag({ children, tone }) {
  const tones = {
    answered: { bg: '#ECFDF5', color: '#047857' },
    urgent: { bg: '#FEF2F2', color: '#B91C1C' },
    quiet: { bg: '#FFFFFF', color: MUTED, border: `1px solid ${HAIRLINE}` },
  };
  const t = tones[tone] || tones.quiet;
  return (
    <span
      style={{
        fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', gap: 4, ...t,
      }}
    >
      {children}
    </span>
  );
}

export default function ProfilePrayerList({ requests, isOwner, onOpen, onOptions, onCreate }) {
  if (!requests?.length) {
    return (
      <div className="text-center" style={{ padding: '48px 28px' }}>
        <p className="type-heading" style={{ fontSize: 17 }}>
          {isOwner ? 'No prayer requests yet' : 'No prayer requests'}
        </p>
        <p className="type-subtitle" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
          {isOwner
            ? 'Share what’s on your heart and let others pray with you.'
            : 'This believer hasn’t shared any publicly.'}
        </p>
        {isOwner && onCreate && (
          <button
            onClick={onCreate}
            style={{ marginTop: 20, minHeight: 44, padding: '11px 18px', borderRadius: 10, border: 0, background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 500 }}
          >
            Share a request
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {requests.map(r => {
        const vis = VISIBILITY[r.visibility] || VISIBILITY.PUBLIC;
        return (
          <article key={r.id} style={{ padding: '16px 20px', borderBottom: `1px solid ${HAIRLINE}` }}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => onOpen?.(r)}
                className="flex-1 min-w-0 text-left"
                style={{ background: 'none', border: 0, padding: 0 }}
              >
                <span className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 6 }}>
                  {r.isAnswered && <Tag tone="answered">Answered</Tag>}
                  {r.isUrgent && <Tag tone="urgent">Urgent</Tag>}
                  {/* Visibility is shown to the AUTHOR only — a visitor is
                      only ever sent public requests, so the label would be
                      noise for them. */}
                  {isOwner && (
                    <Tag tone="quiet"><vis.Icon size={9} strokeWidth={2} /> {vis.label}</Tag>
                  )}
                  {isOwner && r.isAnonymous && (
                    <Tag tone="quiet"><EyeOff size={9} strokeWidth={2} /> Anonymous</Tag>
                  )}
                </span>

                <span className="block" style={{ fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                  {r.title}
                </span>
                {r.body && (
                  <span
                    className="block"
                    style={{
                      fontSize: 13.5, color: MUTED, marginTop: 4, lineHeight: 1.45,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {r.body}
                  </span>
                )}
                <span className="block" style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
                  {timeAgo(r.createdAt)}
                </span>
              </button>

              {isOwner && onOptions && (
                <button
                  onClick={() => onOptions(r)}
                  aria-label={`Options for ${r.title}`}
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, marginTop: -4, marginRight: -8, background: 'none', border: 0 }}
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} color={MUTED} />
                </button>
              )}
            </div>

            {/* Why a private request is visible here but nowhere else. */}
            {isOwner && r.visibility && r.visibility !== 'PUBLIC' && (
              <p style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>{vis.note}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
