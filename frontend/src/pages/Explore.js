import { useNavigate } from 'react-router-dom';

// Each tile previews the interface it opens, drawn as inline SVG — no image
// assets, no embeds, and deliberately NOT the real page components (importing
// those would pull their data fetching and routing into this page). These are
// abstractions of each destination, not live renders, so they are decorative:
// aria-hidden with no text nodes, leaving the tile's visible label as the
// button's accessible name.
//
// Palette: the two Bible tiles use the antique-atlas family the reader and
// atlas actually paint with; everything else uses the app's slate accent.
const SLATE = '#2C4055';
const PARCHMENT = '#E8DCC0';
const PARCHMENT_EDGE = '#DED2B0';
const ATLAS_OCHRE = '#A8823C';
const ATLAS_MAROON = '#7A2E2E';
const VERSE_NUM = '#9C7B3F';
const INK = '#33291B';
const LIVE_RED = '#ED4956';

// The ground is the wrapper's background and the artwork is `meet`-fitted
// inside it. Tile width varies with screen width, so a `slice` fit would crop
// whichever shapes sat nearest the edges on a narrow phone; letting the
// artwork letterbox against a wrapper that always fills keeps every shape
// whole and every circle circular at any tile aspect.
function Preview({ height, viewBox, bg, border, children }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        borderRadius: 10,
        overflow: 'hidden',
        background: bg,
        border: border ? `1px solid ${border}` : undefined,
      }}
    >
      <svg
        focusable="false"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        {children}
      </svg>
    </div>
  );
}

// Head + shoulders inside a circle — the shape Avatar.js falls back to.
function AvatarGlyph({ cx, cy, r, fill, opacity = 1, ring = '#FFFFFF' }) {
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={ring} strokeWidth={r * 0.16} />
      <circle cx={cx} cy={cy - r * 0.22} r={r * 0.3} fill={ring} opacity={0.9} />
      <path
        d={`M${cx - r * 0.5} ${cy + r * 0.62} a ${r * 0.5} ${r * 0.46} 0 0 1 ${r} 0 Z`}
        fill={ring}
        opacity={0.9}
      />
    </g>
  );
}

// A fragment of the parchment reader: warm ground, verse-numbered serif lines.
function BiblePreview({ height }) {
  const lines = [
    { y: 12, w: 150, indent: 14 },
    { y: 21, w: 168, indent: 4 },
    { y: 30, w: 158, indent: 4 },
    { y: 39, w: 96, indent: 4 },
  ];
  return (
    <Preview height={height} viewBox="0 0 186 48" bg={PARCHMENT} border={PARCHMENT_EDGE}>
      <circle cx="8" cy="9" r="2.1" fill={VERSE_NUM} />
      {lines.map(({ y, w, indent }) => (
        <rect key={y} x={indent} y={y} width={w} height="3.4" rx="1.7" fill={INK} opacity="0.5" />
      ))}
    </Preview>
  );
}

// A fragment of the atlas: parchment ground, one illustrative territory, one place.
function MapsPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 166 40" bg={PARCHMENT} border={PARCHMENT_EDGE}>
      <path
        d="M96 4 C124 2 152 10 156 20 C160 31 140 38 118 36 C100 34 88 26 88 17 C88 10 90 5 96 4 Z"
        fill={ATLAS_OCHRE}
        fillOpacity="0.3"
        stroke={ATLAS_OCHRE}
        strokeOpacity="0.75"
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <path
        d="M6 30 C18 22 30 26 44 18 C56 11 64 14 74 8"
        fill="none"
        stroke={PARCHMENT_EDGE}
        strokeWidth="1.6"
      />
      <circle cx="112" cy="22" r="3" fill={ATLAS_MAROON} stroke="#FFF9E9" strokeWidth="1.4" />
    </Preview>
  );
}

// Overlapping participants with the live indicator the session room uses.
function CellsPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 166 40" bg="#F4F7F9">
      {[30, 56, 82, 108].map((cx, i) => (
        <AvatarGlyph key={cx} cx={cx} cy={20} r={13} fill={SLATE} opacity={1 - i * 0.14} />
      ))}
      <circle cx="130" cy="12" r="4.6" fill={LIVE_RED} stroke="#FFFFFF" strokeWidth="1.6" />
    </Preview>
  );
}

// A pin dropped over a suggestion of streets.
function ChurchesPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 170 34" bg="#F4F7F9">
      <g stroke="#DDE3E8" strokeWidth="1.6">
        <path d="M0 11 H170 M0 24 H170 M34 0 V34 M112 0 V34" />
      </g>
      <path d="M136 6 h34 v10 h-34 Z" fill="#E7EDF1" />
      <path
        d="M85 5 c6.2 0 11.2 5 11.2 11.2 C96.2 24 85 32 85 32 s-11.2-8-11.2-15.8 C73.8 10 78.8 5 85 5 Z"
        fill={SLATE}
      />
      <circle cx="85" cy="16" r="4.1" fill="#FFFFFF" />
    </Preview>
  );
}

// Two people turned toward each other.
function PastorPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 170 34" bg="#F4F7F9">
      <AvatarGlyph cx={68} cy={17} r={12} fill={SLATE} />
      <AvatarGlyph cx={102} cy={17} r={12} fill={SLATE} opacity={0.72} />
    </Preview>
  );
}

// Stacked entry lines with the headword picked out.
function DictionaryPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 170 34" bg="#F4F7F9">
      <rect x="16" y="5" width="42" height="7" rx="3.5" fill={SLATE} opacity="0.85" />
      <rect x="63" y="7" width="60" height="3.4" rx="1.7" fill={SLATE} opacity="0.26" />
      <rect x="16" y="17" width="138" height="3.4" rx="1.7" fill={SLATE} opacity="0.26" />
      <rect x="16" y="25" width="104" height="3.4" rx="1.7" fill={SLATE} opacity="0.26" />
    </Preview>
  );
}

// Two people joined by a link.
function PartnersPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 170 34" bg="#F4F7F9">
      <AvatarGlyph cx={62} cy={17} r={11.5} fill={SLATE} />
      <AvatarGlyph cx={108} cy={17} r={11.5} fill={SLATE} opacity={0.72} />
      <g stroke={SLATE} strokeWidth="2.6" strokeLinecap="round" opacity="0.55">
        <path d="M78 17 h6" />
        <path d="M86 17 h6" />
      </g>
    </Preview>
  );
}

// A heart resting over answered-prayer cards.
function AnsweredPreview({ height }) {
  return (
    <Preview height={height} viewBox="0 0 170 34" bg="#F4F7F9">
      <g fill="#FFFFFF" stroke={SLATE} strokeOpacity="0.3" strokeWidth="1.4">
        <rect x="44" y="3" width="82" height="12" rx="4" />
        <rect x="36" y="13" width="98" height="16" rx="4" />
      </g>
      <path
        d="M85 27 c-8.6-6-13.8-10.2-13.8-15.2 C71.2 8.4 74.4 5.4 78.2 5.4 c2.6 0 5.1 1.4 6.8 3.6 c1.7-2.2 4.2-3.6 6.8-3.6 c3.8 0 7 3 7 6.4 C98.8 16.8 93.6 21 85 27 Z"
        fill={SLATE}
        stroke="#F4F7F9"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </Preview>
  );
}

export default function Explore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full" style={{ background: '#EEF3F5' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-5">
        <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>Explore</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7680' }}>Deepen your faith journey</p>
      </div>

      <div className="px-4 space-y-3">

        {/* 1. Bible — full-width hero tile */}
        <button
          className="water-tile water-tile-blue w-full text-left"
          style={{ animation: 'float1 4s ease-in-out infinite', padding: 22 }}
          onClick={() => navigate('/bible')}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <BiblePreview height={52} />
            <p className="font-semibold text-lg leading-tight mt-3" style={{ color: '#0A0A0A' }}>Bible</p>
            <p className="text-xs mt-0.5" style={{ color: '#4A6674' }}>Read and search scripture</p>
          </div>
        </button>

        {/* 2. Prayer Cells + Bible Maps — 2-col medium tiles */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="water-tile water-tile-blue text-left"
            style={{ animation: 'float2 4.5s ease-in-out infinite', minHeight: 116, padding: 18 }}
            onClick={() => navigate('/prayer-cells')}
          >
            <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col gap-2 h-full">
              <CellsPreview height={40} />
              <p className="font-semibold text-[15px] leading-snug" style={{ color: '#0A0A0A' }}>Prayer Cells</p>
              <p className="text-[12px] leading-snug" style={{ color: '#4A6674' }}>Live audio prayer</p>
            </div>
          </button>

          <button
            className="water-tile water-tile-blue text-left relative"
            style={{ animation: 'float3 5s ease-in-out infinite', minHeight: 116, padding: 18 }}
            onClick={() => navigate('/bible-maps')}
          >
            <span
              className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#0A0A0A', zIndex: 2 }}
            >
              New
            </span>
            <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col gap-2 h-full">
              <MapsPreview height={40} />
              <p className="font-semibold text-[15px] leading-snug" style={{ color: '#0A0A0A' }}>Bible Maps</p>
              <p className="text-[12px] leading-snug" style={{ color: '#4A6674' }}>Explore the Biblical world</p>
            </div>
          </button>
        </div>

        {/* 3. Confession Wall — full-width violet tile */}
        <button
          className="water-tile water-tile-violet w-full text-left"
          style={{ animation: 'float2 4.8s ease-in-out infinite', padding: '20px 22px 18px' }}
          onClick={() => navigate('/confessions')}
        >
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.25)', color: 'rgba(80,30,120,0.85)', position: 'relative', zIndex: 1 }}
          >
            ANONYMOUS SPACE
          </span>
          <div style={{ position: 'relative', zIndex: 1 }} className="mt-3">
            <p className="font-bold text-base leading-tight" style={{ color: '#2D1050' }}>Confession Wall</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(60,20,100,0.65)' }}>
              Share your heart without fear. Completely anonymous.
            </p>
            <div className="flex justify-end mt-3">
              <span className="text-sm font-medium" style={{ color: 'rgba(60,20,100,0.7)' }}>Enter →</span>
            </div>
          </div>
        </button>

        {/* 4. Small 2×2 grid: Churches, Pray w/ Pastor, Bible Dictionary, Prayer Partners */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Churches',         Art: ChurchesPreview,   route: '/churches-hub',     anim: 'float1 4.2s ease-in-out infinite' },
            { label: 'Pray w/ Pastor',   Art: PastorPreview,     route: '/pastors',          anim: 'float3 4.7s ease-in-out infinite' },
            { label: 'Bible Dictionary', Art: DictionaryPreview, route: '/bible-dictionary', anim: 'float2 4.4s ease-in-out infinite' },
            { label: 'Prayer Partners',  Art: PartnersPreview,   route: '/prayer-partners',  anim: 'float1 5.1s ease-in-out infinite' },
            { label: 'Answered',         Art: AnsweredPreview,   route: '/answered',         anim: 'float3 4.9s ease-in-out infinite' },
          ].map(({ label, Art, route, anim }) => (
            <button
              key={label}
              className="water-tile water-tile-blue text-left"
              style={{ animation: anim, minHeight: 96, padding: 16 }}
              onClick={() => navigate(route)}
            >
              <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col justify-between h-full" >
                <Art height={34} />
                <p className="font-semibold text-[13px] leading-snug mt-3" style={{ color: '#0A0A0A' }}>{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Coming Soon pills */}
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#8E8E8E' }}>Coming Soon</p>
          <div className="flex gap-2">
            {[
              { label: 'Find Believers' },
            ].map(({ label }) => (
              <div
                key={label}
                className="flex items-center rounded-full px-4 bg-white/60"
                style={{ height: 36, opacity: 0.6, border: '1px solid rgba(255,255,255,0.8)' }}
              >
                <span className="text-xs whitespace-nowrap" style={{ color: '#6B7680' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
