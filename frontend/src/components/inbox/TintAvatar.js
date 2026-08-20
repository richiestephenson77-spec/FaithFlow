import { tintFor, SURFACE, OLIVE } from '../../utils/inboxTints';

// Avatar for the inbox: a tinted fill with a Fraunces initial, wrapped in a
// ring that is either the person's tint colour or fully transparent. The ring
// is ALWAYS rendered (just transparent when inactive) so every row stays on
// exactly the same horizontal grid whether or not it has a note.
//
// A real profile photo always wins over the tinted initial — the tint is a
// fallback/identity device, not a replacement for someone's actual picture.
export default function TintAvatar({
  user,
  size = 58,
  initialSize = 21,
  ringColor = 'transparent',
  ringWidth = 2.5,
  online = false,
  dotSize = 14,
  cutout = SURFACE,
}) {
  const tint = tintFor(user?.id || user?.name || '');
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 0 ${ringWidth}px ${ringColor}`,
          // inset so the ring sits outside the fill without changing footprint
          transition: 'box-shadow 140ms ease',
        }}
      >
        {user?.profilePhoto ? (
          <img
            src={user.profilePhoto}
            alt={user.name || ''}
            loading="lazy"
            decoding="async"
            className="rounded-full object-cover"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-fraunces"
            style={{
              width: size,
              height: size,
              background: tint.fill,
              color: tint.ring,
              fontSize: initialSize,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {initial}
          </div>
        )}
      </div>

      {online && (
        <span
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            right: 0,
            bottom: 0,
            background: OLIVE,
            boxShadow: `0 0 0 2.5px ${cutout}`,
          }}
        />
      )}
    </div>
  );
}
