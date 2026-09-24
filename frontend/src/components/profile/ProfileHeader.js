import { useState } from 'react';
import { Link } from 'react-router-dom';

// Identity block: avatar beside name, church, optional location, then bio and
// one quiet count line. No oversized totals next to the avatar — the point of
// this block is that you recognise the person immediately.

export const INK = '#0A0A0A';
export const MUTED = '#8E8E8E';
export const HAIRLINE = '#EFEFEF';
export const ACCENT = '#2C4055';

/**
 * The real uploaded avatar, always preferred. Initials are ONLY the
 * missing-photo fallback — and also the fallback when a real image fails to
 * load, so a broken URL degrades to something intentional rather than a
 * browser's broken-image glyph.
 */
export function ProfileAvatar({ name, photo, size = 76, onClick, editable }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const showPhoto = photo && !failed;

  const inner = showPhoto ? (
    <img
      src={photo}
      alt=""
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  ) : (
    <span
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'rgba(44,64,85,0.08)', color: ACCENT, fontSize: Math.round(size * 0.36), fontFamily: "'Fraunces', serif" }}
    >
      {initial}
    </span>
  );

  const box = (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, border: `1px solid ${HAIRLINE}` }}
    >
      {inner}
    </div>
  );

  if (!onClick) return box;
  return (
    <button onClick={onClick} aria-label={editable ? 'Change profile photo' : 'Profile photo'} className="flex-shrink-0">
      {box}
    </button>
  );
}

/**
 * Bio, exactly as saved — wording and line breaks preserved. Short bios show
 * whole; longer ones collapse behind a real button rather than a fade, so the
 * text stays selectable and reachable by keyboard and screen reader.
 */
function Bio({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > 180 || text.split('\n').length > 4;

  return (
    <div style={{ marginTop: 10 }}>
      <p
        style={{
          fontSize: 14.5, lineHeight: 1.5, color: '#3D4A57',
          // `pre-wrap` is what preserves the author's own line breaks.
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          ...(isLong && !expanded
            ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : null),
        }}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          style={{ marginTop: 4, minHeight: 44, fontSize: 13, color: ACCENT, background: 'none', border: 0 }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/**
 * @param {object} profile
 * @param {boolean} isOwner
 * @param {() => void} onOpenBelievers  opens the existing relationship list
 */
export default function ProfileHeader({ profile, isOwner, onOpenBelievers, onAvatarClick }) {
  const believers = profile._count?.followers ?? 0;
  const posts = profile._count?.posts ?? 0;

  return (
    <header style={{ padding: '4px 20px 0' }}>
      <div className="flex items-center gap-4">
        <ProfileAvatar
          name={profile.name}
          photo={profile.profilePhoto}
          size={76}
          onClick={isOwner ? onAvatarClick : undefined}
          editable={isOwner}
        />
        <div className="min-w-0 flex-1">
          {/* Wraps naturally. No truncation, no fixed height — a long Telugu
              name grows the block rather than being clipped. */}
          <h1
            className="type-heading"
            style={{ fontSize: 26, lineHeight: 1.18, overflowWrap: 'anywhere' }}
          >
            {profile.name}
          </h1>

          {profile.churchName && (
            // A subtle link ONLY when a real church record is connected.
            // A bare name stays plain text: we never guess a directory match,
            // and a church association is not proof of membership.
            profile.churchId ? (
              <Link
                to={`/churches/${profile.churchId}`}
                style={{ display: 'inline-block', fontSize: 13.5, color: ACCENT, marginTop: 4, textDecoration: 'none' }}
              >
                {profile.churchName}
              </Link>
            ) : (
              <p style={{ fontSize: 13.5, color: INK, marginTop: 4, overflowWrap: 'anywhere' }}>
                {profile.churchName}
              </p>
            )
          )}

          {profile.location && (
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 2, overflowWrap: 'anywhere' }}>
              {profile.location}
            </p>
          )}
        </div>
      </div>

      <Bio text={profile.bio} />

      {/* One quiet line, not a row of stat tiles. "Believers" is this app's
          existing word for FOLLOWERS (one-directional) and keeps that meaning. */}
      <p style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>
        <button
          onClick={onOpenBelievers}
          style={{ background: 'none', border: 0, padding: 0, color: INK, fontSize: 12.5 }}
        >
          <strong style={{ fontWeight: 600 }}>{believers}</strong>{' '}
          {believers === 1 ? 'Believer' : 'Believers'}
        </button>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>
          <strong style={{ fontWeight: 600, color: INK }}>{posts}</strong>{' '}
          {posts === 1 ? 'post' : 'posts'}
        </span>
      </p>
    </header>
  );
}
