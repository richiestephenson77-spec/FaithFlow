import { useState, useId } from 'react';
import { ChevronDown, Flame, Award, HandHeart, Clock, Trophy } from 'lucide-react';
import { INK, MUTED, HAIRLINE, ACCENT } from './ProfileHeader';

// The private prayer journey: ONE collapsed row in place of five stat tiles
// and a trophy banner.
//
// OWNER-ONLY, AND NOT MERELY HIDDEN. This component is never rendered for a
// visitor — but more importantly, the server no longer sends a visitor the
// numbers it would need. If `stats` is absent this renders nothing, which is
// the correct outcome for anyone but the owner.
//
// Metric definitions are untouched. Nothing here recomputes a streak, a total
// or an achievement threshold; it only presents what the API already returns.

function fmtDuration(seconds) {
  const s = Number(seconds) || 0;
  if (s < 60) return `${s}s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function Row({ Icon, label, value, note }) {
  return (
    <div
      className="flex items-start gap-3"
      style={{ padding: '11px 0', borderBottom: `1px solid ${HAIRLINE}` }}
    >
      <Icon size={15} strokeWidth={1.8} color={MUTED} style={{ marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13.5, color: INK }}>{label}</p>
        {note && <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{note}</p>}
      </div>
      <p style={{ fontSize: 13.5, color: INK, fontWeight: 500, flexShrink: 0 }}>{value}</p>
    </div>
  );
}

/**
 * @param {object|null} stats      from the API; absent for non-owners
 * @param {object} profile         for badge fields
 */
export default function PrivatePrayerJourney({ stats, profile }) {
  const [open, setOpen] = useState(false);   // collapsed on every profile entry
  const panelId = useId();

  if (!stats) return null;

  const streak = stats.streak ?? 0;
  const totalSessions = stats.totalSessions ?? 0;

  return (
    <section style={{ padding: '18px 20px 0' }}>
      <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 16, padding: '4px 14px' }}>
        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center gap-3 text-left"
          style={{ minHeight: 56, background: 'none', border: 0 }}
        >
          <span className="flex-1 min-w-0">
            <span className="block type-heading" style={{ fontSize: 15 }}>Your prayer journey</span>
            <span className="block" style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
              {streak === 0 && totalSessions === 0
                ? 'Only you can see this'
                : `${streak}-day streak · ${totalSessions} ${totalSessions === 1 ? 'prayer' : 'prayers'}`}
            </span>
          </span>
          {/* Says plainly whose data this is, every time. */}
          <span
            style={{ fontSize: 10.5, color: MUTED, border: `1px solid ${HAIRLINE}`, borderRadius: 999, padding: '3px 8px', flexShrink: 0 }}
          >
            Only you
          </span>
          <ChevronDown
            size={18}
            strokeWidth={1.9}
            color={MUTED}
            style={{ flexShrink: 0, transition: 'transform 160ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {open && (
          <div id={panelId} style={{ paddingBottom: 8 }}>
            <Row Icon={Flame} label="Current streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} />
            <Row Icon={Award} label="Best streak" value={`${stats.longestStreak ?? 0} days`} />
            <Row Icon={HandHeart} label="Total prayers" value={totalSessions} />
            <Row Icon={Clock} label="Prayer time" value={fmtDuration(stats.totalPrayerSeconds)} />
            {/* NOT "people prayed for". The backend counts DISTINCT REQUESTS
                prayed for — one person posting three requests counts three.
                Labelled for what it actually measures. */}
            <Row
              Icon={HandHeart}
              label="Requests prayed for"
              value={stats.distinctRequestsPrayedFor ?? 0}
              note="Distinct prayer requests you've prayed for."
            />
            <Row
              Icon={Trophy}
              label="Prayer Warrior"
              value={profile.prayerWarriorBadge ? 'Earned' : 'Not yet'}
              note={
                profile.prayerWarriorBadge && profile.prayerWarriorEarnedAt
                  ? `Since ${new Date(profile.prayerWarriorEarnedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
                  : 'Complete your daily prayer goal to earn it.'
              }
            />
            <p style={{ fontSize: 11.5, color: MUTED, paddingTop: 12, lineHeight: 1.5 }}>
              These numbers are private to you. They are a record of showing up,
              not a score.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export { ACCENT };
