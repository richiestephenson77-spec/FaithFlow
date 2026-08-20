import TintAvatar from './TintAvatar';
import { tintFor, CARD, BORDER, MUTED, SURFACE } from '../../utils/inboxTints';

// The bubble's two-dot tail (8px + 4px circles, both white with a 1px border)
// that makes the note read as a speech bubble pointing at the avatar.
function BubbleTail() {
  return (
    <>
      <span
        className="absolute rounded-full"
        style={{ width: 8, height: 8, bottom: -5, left: 14, background: CARD, border: `1px solid ${BORDER}` }}
      />
      <span
        className="absolute rounded-full"
        style={{ width: 4, height: 4, bottom: -11, left: 10, background: CARD, border: `1px solid ${BORDER}` }}
      />
    </>
  );
}

function NoteItem({ note, onOpen }) {
  const tint = tintFor(note.user?.id || note.user?.name || '');
  return (
    <button
      onClick={() => onOpen(note)}
      className="flex flex-col items-center flex-shrink-0 text-center"
      style={{ width: 82 }}
    >
      {/* Note bubble */}
      <div
        className="relative w-full"
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '8px 10px',
          minHeight: 30,
        }}
      >
        <span
          className="block"
          style={{
            fontSize: 11.5,
            lineHeight: 1.25,
            color: note.isOwn && !note.text ? MUTED : '#3A3733',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {note.text || 'Share a note…'}
        </span>
        <BubbleTail />
      </div>

      {/* Avatar overlaps the bubble's tail */}
      <div className="-mt-[6px]">
        <TintAvatar
          user={note.user}
          size={60}
          initialSize={22}
          ringColor={tint.ring}
          online={note.online}
          dotSize={15}
          cutout={SURFACE}
        />
      </div>

      <span
        className="block w-full truncate mt-1"
        style={{ fontSize: 11.5, color: '#3A3733' }}
      >
        {note.isOwn ? 'Your note' : (note.user?.name || '').split(' ')[0]}
      </span>

      {note.isOwn && note.subLabel && (
        <span className="block w-full truncate" style={{ fontSize: 11, color: MUTED }}>
          {note.subLabel}
        </span>
      )}
    </button>
  );
}

export default function NotesRow({ notes, onOpen }) {
  if (!notes?.length) return null;
  return (
    <div className="no-scrollbar overflow-x-auto px-4 pt-3 pb-2">
      <div className="flex gap-3">
        {notes.map(n => (
          <NoteItem key={n.id} note={n} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
