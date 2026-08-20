import { Heart, Video } from 'lucide-react';
import TintAvatar from './TintAvatar';
import { tintFor, ACCENT, CARD, FAINT, INK, MUTED, SURFACE } from '../../utils/inboxTints';

// One conversation row. `unread` is the single source of truth that drives
// three things in sync, exactly as specified: the preview's weight, the
// preview's colour, and the trailing accent dot.
export default function ThreadRow({ convo, onOpen }) {
  const { other, unread, preview, time, label, hasNote, online, allowsVideo } = convo;
  const tint = tintFor(other?.id || other?.name || '');
  const isUnread = unread > 0;

  return (
    <button
      onClick={() => onOpen(convo)}
      className="w-full flex items-center gap-3 text-left"
      style={{
        padding: '9px 16px',
        background: 'transparent',
        transition: 'background 140ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = CARD; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <TintAvatar
        user={other}
        size={58}
        initialSize={21}
        // Ring is the tint colour only when this person has an active note;
        // otherwise transparent so alignment is identical either way.
        ringColor={hasNote ? tint.ring : 'transparent'}
        online={online}
        dotSize={14}
        cutout={SURFACE}
      />

      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{ fontSize: 15, fontWeight: 600, color: INK, letterSpacing: '-0.15px' }}
        >
          {other?.name || 'Unknown'}
        </p>

        {/* Preview truncates but the trailing ` · time` never does — the time
            is a non-shrinking sibling so it's always visible, however long
            the last message is. */}
        <div className="flex items-baseline min-w-0" style={{ fontSize: 13.5, marginTop: 1 }}>
          <span
            className="truncate"
            style={{ color: isUnread ? INK : MUTED, fontWeight: isUnread ? 600 : 400 }}
          >
            {preview}
          </span>
          {time && (
            <span
              className="flex-shrink-0 whitespace-nowrap"
              style={{ color: isUnread ? MUTED : FAINT, fontWeight: 400 }}
            >
              {` · ${time}`}
            </span>
          )}
        </div>

        {label && (
          <span className="flex items-center gap-1 mt-0.5" style={{ color: label.color }}>
            <Heart size={11} strokeWidth={2} color={label.color} />
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>{label.text}</span>
          </span>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 22 }}>
        {isUnread ? (
          <span className="rounded-full" style={{ width: 9, height: 9, background: ACCENT }} />
        ) : allowsVideo ? (
          <Video size={21} strokeWidth={1.9} color={FAINT} />
        ) : null}
      </div>
    </button>
  );
}
