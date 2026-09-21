// Morning / evening window illustrations for the Daily Prayer cards.
//
// Same editorial vector language as the Explore tiles: flat inline SVG, one
// hairline stroke, one wash fill, no gradients or shadows. Muted gold for
// morning, muted lavender for evening — deliberately quiet so the title and
// the action stay dominant.
//
// index.css carries a universal `* { font-family: Inter }` rule that beats a
// presentation attribute, which is why Explore's SVG labels use inline styles.
// There is no text in these, so it does not arise here.

const MORNING = { line: '#9B8B70', wash: '#F4EFE3', orb: '#D5B86F' };
const EVENING = { line: '#7D728F', wash: '#ECEAF2', orb: '#B1A8C5' };

/**
 * An arched window. Morning puts a low sun in the left pane; evening puts a
 * higher moon in the right. Decorative only — aria-hidden, so the card
 * announces just its heading and detail.
 */
export default function RoomArt({ variant = 'morning', size = 84 }) {
  const t = variant === 'evening' ? EVENING : MORNING;
  const orb = variant === 'evening' ? { cx: 56, cy: 40, r: 11 } : { cx: 32, cy: 50, r: 11 };

  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size * 1.02, flexShrink: 0, pointerEvents: 'none' }}
    >
      <svg
        focusable="false"
        viewBox="0 0 84 86"
        style={{ display: 'block', width: '100%', height: '100%' }}
        fill="none"
        stroke={t.line}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Arch and its glazing */}
        <path
          fill={t.wash}
          d="M13 78V32Q13 3 42 3Q71 3 71 32V78Z"
        />
        <circle fill={t.orb} stroke="none" cx={orb.cx} cy={orb.cy} r={orb.r} />
        {/* Mullions drawn over the orb so it reads as seen THROUGH the window */}
        <path d="M42 3V78M13 32Q13 3 42 3Q71 3 71 32V78H13Z" />
        <path d="M13 59H71" />
        {/* Sill */}
        <path d="M6 78H78M10 83H74" />
      </svg>
    </div>
  );
}
