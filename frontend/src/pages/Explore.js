import { Link } from 'react-router-dom';

// Explore tiles carry a small illustrated scene of the feature they open,
// drawn as inline SVG. The artwork is decorative — aria-hidden with
// focusable="false" — so each tile announces only its heading and blurb.
//
// Two palettes, matching the destinations: the two scripture tiles use the
// antique-atlas family the reader and map actually paint with, everything
// else uses the app's slate accent.
const SLATE = '#2C4055';
const INK = '#0A0A0A';
const BLURB = '#61707a';
const HAIRLINE = '#EFEFEF';

const SLATE_ART = { ink: SLATE, wash: '#e7ecee', solid: SLATE, accent: SLATE };
const ANTIQUE_ART = { ink: '#A8823C', wash: '#DED2B0', solid: '#7A2E2E', accent: '#7A2E2E' };
// Confession Wall keeps a purple accent so it stays recognisable, but now in
// the same white-card system as every other tile rather than a solid block.
const CONFESSION = '#7C5CBF';
const CONFESSION_ART = { ink: CONFESSION, wash: '#EDE7F8', solid: CONFESSION, accent: CONFESSION };

// index.css carries a universal `* { font-family: Inter }` rule, which beats a
// presentation attribute and any inherited value. SVG label fonts therefore
// have to be set as inline styles to survive it.
const SANS = "Inter, Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const label = (size, spacing) => ({ fontFamily: SANS, fontSize: size, letterSpacing: spacing });
const display = (size) => ({ fontFamily: SERIF, fontSize: size });

function Art({ height, theme, margin = '7px 6px 0', viewBox = '0 0 195 150', children }) {
  return (
    <div aria-hidden="true" style={{ height, overflow: 'hidden', margin, position: 'relative', pointerEvents: 'none' }}>
      <svg
        focusable="false"
        viewBox={viewBox}
        style={{ display: 'block', width: '100%', height: '100%' }}
        fill="none"
        stroke={theme.ink}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </div>
  );
}

// An open book, a psalm and a ribbon marker.
const BibleArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M22 39Q58 19 96 37Q133 18 170 36V120Q132 104 96 124Q55 108 22 124Z" />
    <path d="M22 39Q58 19 96 37Q133 18 170 36V120Q132 104 96 124Q55 108 22 124ZM96 37V124M28 130Q64 115 96 131Q136 113 176 127" />
    <path fill={t.accent} stroke="none" d="M131 27V85L140 77L148 82V26Z" />
    <text x="38" y="62" fill={t.ink} stroke="none" style={label(10, '1px')}>PSALMS</text>
    <text x="40" y="83" fill={t.ink} stroke="none" style={label(9)}>Be still,</text>
    <text x="40" y="98" fill={t.ink} stroke="none" style={label(9)}>and know.</text>
    <path d="M112 99Q131 91 157 101M112 108Q133 100 157 110" />
  </>
);

// Three people gathered around a table.
const CellsArt = (t) => (
  <>
    <ellipse fill={t.wash} stroke="none" cx="97" cy="105" rx="76" ry="26" />
    <path fill={t.solid} stroke="none" d="M31 98Q24 71 44 65Q62 68 65 96ZM132 98Q137 65 155 67Q176 75 165 103Z" />
    <circle fill="#fff" stroke={t.ink} cx="44" cy="53" r="12" />
    <circle fill="#fff" stroke={t.ink} cx="153" cy="55" r="12" />
    <path fill={t.wash} stroke="none" d="M77 68Q72 45 96 43Q118 48 115 75Z" />
    <circle fill="#fff" stroke={t.ink} cx="96" cy="30" r="11" />
    <ellipse fill="#fff" cx="98" cy="92" rx="48" ry="17" />
    <path d="M66 93L87 80L99 84L108 78L130 91L106 102ZM99 84V99M64 105L57 128M131 106L139 129M84 69L95 76L106 66" />
  </>
);

// A coastline, a dotted journey between two named places, hills and a compass.
const MapsArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M40 8L122 8L117 25L129 39L118 53L126 70L113 86L107 110L91 140H15V8Z" />
    <path d="M122 8L117 25L129 39L118 53L126 70L113 86L107 110L91 140" />
    <path stroke="#7A2E2E" strokeDasharray="3 4" d="M146 22Q101 46 139 73Q147 90 110 119" />
    <circle fill={t.accent} stroke="none" cx="146" cy="22" r="4" />
    <circle fill={t.accent} stroke="none" cx="110" cy="119" r="4" />
    <path d="M144 99L152 83L161 99M157 105L169 85L181 105M135 58L143 45L153 58M36 83V119M19 101H53M29 94L44 110M43 94L29 110" />
    <text x="138" y="17" fill={t.ink} stroke="none" style={label(9)}>Haran</text>
    <text x="115" y="135" fill={t.ink} stroke="none" style={label(9)}>Jerusalem</text>
    <text x="24" y="58" fill={t.ink} stroke="none" style={label(6, '1px')}>THE GREAT SEA</text>
  </>
);

// A chapel on a rise, with trees.
const ChurchesArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M9 128Q54 104 93 123Q143 102 188 126V143H9Z" />
    <path fill="#fff" d="M46 123V65L94 30L143 65V123ZM81 41V17H107V40" />
    <path fill={t.solid} stroke="none" d="M81 123V93Q94 72 108 93V123Z" />
    <path d="M94 7V27M88 13H100M42 65L94 27L148 65M59 83V100H71V83ZM117 83V100H129V83ZM93 132V144M155 120V80M171 127V101" />
    <path fill={t.wash} stroke="none" d="M155 64Q129 80 155 99Q181 83 155 64ZM171 85Q153 100 171 114Q190 101 171 85Z" />
    <circle cx="95" cy="60" r="9" />
  </>
);

// Two chairs drawn up to a small table, a window and a cross.
const PastorArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M27 20H169V123H27ZM40 31V82Q72 89 89 66V31Z" />
    <path fill={t.solid} stroke="none" d="M29 89H67V111H29ZM128 89H165V111H128Z" />
    <path d="M28 75V117M66 83V120M128 83V120M166 73V118M38 112V131M155 112V131M94 99V130M84 130H106" />
    <ellipse fill="#fff" cx="98" cy="91" rx="24" ry="8" />
    <path fill="#fff" d="M81 83L94 76L110 81L106 90L94 86L83 89Z" />
    <path d="M94 76V86M119 24V44M111 31H127" />
    <path d="M43 65Q54 52 65 65M132 65Q143 52 154 65" />
  </>
);

// An open entry with a headword and its definition.
const DictionaryArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M35 23H141V129H35Z" />
    <path fill="#fff" d="M49 14H154V120H49Z" />
    <path fill={t.solid} stroke="none" d="M154 28H168V48H154ZM154 59H168V78H154ZM154 89H168V108H154Z" />
    <text x="62" y="58" fill={t.ink} stroke="none" style={display(28)}>Aa</text>
    <text x="62" y="81" fill={t.ink} stroke="none" style={label(10, '1px')}>GRACE</text>
    <text x="62" y="99" fill={t.ink} stroke="none" style={label(9)}>A gift freely given.</text>
    <path d="M62 108H131" />
  </>
);

// Two people walking a path together.
const PartnersArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M22 139Q45 93 93 103Q131 111 176 70L187 97Q147 139 110 129Q60 115 57 146Z" />
    <circle fill="#fff" stroke={t.ink} cx="76" cy="35" r="11" />
    <circle fill="#fff" stroke={t.ink} cx="119" cy="45" r="11" />
    <path fill={t.solid} stroke="none" d="M64 52Q76 43 87 57L89 88H60ZM108 64Q121 54 131 67L135 100H105Z" />
    <path d="M66 87L64 112L56 128M80 87L85 108L91 116M112 100L109 126M127 99L135 119M87 62L100 78L109 70M60 61L49 82M135 74L146 89M157 45V81" />
    <path fill={t.wash} stroke="none" d="M157 31Q138 43 157 58Q177 45 157 31Z" />
  </>
);

// A note of thanks, with a heart.
const AnsweredArt = (t) => (
  <>
    <path fill={t.wash} stroke="none" d="M29 31H145V135H29Z" />
    <path fill="#fff" d="M43 20H157V123H43Z" />
    <path d="M51 30V114M65 102H132" />
    <text x="66" y="59" fill={t.ink} stroke="none" style={display(28)}>Thank</text>
    <text x="77" y="83" fill={t.ink} stroke="none" style={display(28)}>You.</text>
    <path fill={t.accent} stroke="none" d="M141 12Q145 1 154 7Q164 1 168 12Q170 23 154 33Q138 22 141 12Z" />
    <path d="M20 74Q17 55 7 47M19 65Q7 64 7 54M175 117Q184 98 179 78M180 100Q194 90 189 80" />
  </>
);

// A screen wall with a lit arch: someone is present behind the lattice, seen
// but not identified. Shelter rather than secrecy — the figure is upright and
// calm, not hidden or hunched. Drawn on a wide viewBox because this tile spans
// both columns, so a 195x150 frame would leave the art marooned in white.
const ConfessionArt = (t) => (
  <>
    <defs>
      <clipPath id="confession-arch">
        <path d="M212 92V54Q212 16 250 16Q288 16 288 54V92Z" />
      </clipPath>
    </defs>
    <path fill={t.wash} stroke="none" d="M40 92V40H210V92ZM290 92V40H460V92Z" />
    <path fill={t.wash} stroke="none" d="M212 92V54Q212 16 250 16Q288 16 288 54V92Z" />
    <g clipPath="url(#confession-arch)" opacity="0.5">
      <circle fill={t.solid} stroke="none" cx="250" cy="48" r="13" />
      <path fill={t.solid} stroke="none" d="M226 92Q229 68 250 66Q271 68 274 92Z" />
    </g>
    <g clipPath="url(#confession-arch)" strokeWidth="1.1">
      <path d="M226 8V96M238 8V96M250 8V96M262 8V96M274 8V96" />
      <path d="M206 36H294M206 54H294M206 72H294" />
    </g>
    <path d="M212 92V54Q212 16 250 16Q288 16 288 54V92" />
    <path d="M40 92V40H210M290 40H460V92" />
    <path d="M80 40V92M120 40V92M160 40V92M330 40V92M370 40V92M410 40V92" />
    <path d="M18 92H482" />
  </>
);

// Border colour is the only thing hover changes — no transform, which on an
// ancestor would re-anchor the fixed bottom nav and any open composer/sheet.
const TILE_CLASS =
  'block bg-white rounded-2xl overflow-hidden min-w-0 relative border border-[#EFEFEF] ' +
  'hover:border-[#a4afb9] transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2C4055] focus-visible:outline-offset-[3px]';

function TileCopy({ title, blurb, titleSize = 18, padding = '8px 12px 10px', children }) {
  return (
    <div style={{ padding, position: 'relative' }}>
      <h3
        className="font-fraunces"
        style={{ fontSize: titleSize, lineHeight: 1.15, margin: '0 0 4px', letterSpacing: '-0.35px', color: INK }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 11, lineHeight: 1.4, color: BLURB, margin: 0 }}>{blurb}</p>
      {children}
    </div>
  );
}

// The six standard tiles, in the order the design lays them out.
const STANDARD_TILES = [
  { title: 'Prayer Cells', blurb: 'Find your prayer circle', to: '/prayer-cells', art: CellsArt, theme: SLATE_ART },
  { title: 'Bible Maps', blurb: 'Walk through the biblical world', to: '/bible-maps', art: MapsArt, theme: ANTIQUE_ART },
];

const LOWER_TILES = [
  { title: 'Churches', blurb: 'Find a place to belong', to: '/churches-hub', art: ChurchesArt, theme: SLATE_ART },
  { title: 'Pray w/ Pastor', blurb: 'A moment of personal prayer', to: '/pastors', art: PastorArt, theme: SLATE_ART },
  { title: 'Bible Dictionary', blurb: 'Discover meaning in every word', to: '/bible-dictionary', art: DictionaryArt, theme: SLATE_ART },
  { title: 'Prayer Partners', blurb: 'Walk in faith, together', to: '/prayer-partners', art: PartnersArt, theme: SLATE_ART },
];

function StandardTile({ title, blurb, to, art, theme }) {
  return (
    <Link to={to} className={`${TILE_CLASS} flex flex-col`}>
      <Art height={70} theme={theme}>{art(theme)}</Art>
      <TileCopy title={title} blurb={blurb} />
    </Link>
  );
}

export default function Explore() {
  return (
    <div className="min-h-full" style={{ background: '#FFFFFF' }}>
      {/* The bottom nav is a floating row of 52px icons with no background of
          its own, so it sits directly over whatever it passes. Clear it here
          rather than relying only on the outlet's padding. */}
      <div className="px-4 pt-4" style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
        <h2 className="font-fraunces" style={{ fontSize: 30, margin: '4px 0', color: INK, lineHeight: 1.1 }}>Explore</h2>
        <p style={{ margin: '2px 0 12px', color: '#66717b', fontSize: 14 }}>Deepen your faith journey</p>

        <div className="grid grid-cols-2 gap-3">

          {/* Bible — wide tile, copy beside the scene */}
          <Link
            to="/bible"
            className={`${TILE_CLASS} col-span-2 grid items-center`}
            style={{ gridTemplateColumns: '1fr 1.12fr', minHeight: 104 }}
          >
            <div style={{ gridColumn: 1, gridRow: 1 }}>
              <TileCopy title="Bible" blurb="Read. Reflect. Begin again." titleSize={24} padding="12px 8px 12px 16px">
                <span style={{ display: 'block', color: SLATE, fontSize: 11, marginTop: 8, whiteSpace: 'nowrap' }}>Open scripture ↗</span>
              </TileCopy>
            </div>
            <div style={{ gridColumn: 2, gridRow: 1 }}>
              <Art height={86} theme={ANTIQUE_ART} margin="0">{BibleArt(ANTIQUE_ART)}</Art>
            </div>
          </Link>

          {STANDARD_TILES.map(tile => <StandardTile key={tile.to} {...tile} />)}

          {/* Confession Wall — same card system as its neighbours, held apart
              by the purple accent rather than by a solid block. */}
          <Link to="/confessions" className={`${TILE_CLASS} col-span-2 flex flex-col`}>
            <Art height={70} theme={CONFESSION_ART} viewBox="0 0 500 100">{ConfessionArt(CONFESSION_ART)}</Art>
            <div style={{ padding: '8px 12px 10px', position: 'relative' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: CONFESSION,
                  background: 'rgba(124,92,191,0.10)',
                  borderRadius: 999,
                  padding: '2px 7px',
                  marginBottom: 5,
                }}
              >
                ANONYMOUS SPACE
              </span>
              <h3
                className="font-fraunces"
                style={{ fontSize: 18, lineHeight: 1.15, margin: '0 0 4px', letterSpacing: '-0.35px', color: INK }}
              >
                Confession Wall
              </h3>
              <p style={{ fontSize: 11, lineHeight: 1.4, color: BLURB, margin: 0 }}>Share your heart without fear</p>
            </div>
          </Link>

          {LOWER_TILES.map(tile => <StandardTile key={tile.to} {...tile} />)}

          {/* Answered Prayers — wide tile, scene beside the copy */}
          <Link
            to="/answered"
            className={`${TILE_CLASS} col-span-2 grid items-center`}
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            <Art height={64} theme={SLATE_ART}>{AnsweredArt(SLATE_ART)}</Art>
            <TileCopy title="Answered Prayers" blurb="Make room for gratitude" />
          </Link>

        </div>

        {/* Coming Soon pills */}
        <div className="pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#8E8E8E' }}>Coming Soon</p>
          <div className="flex gap-2">
            {[{ label: 'Find Believers' }].map(({ label: pill }) => (
              <div
                key={pill}
                className="flex items-center rounded-full px-4"
                style={{ height: 36, opacity: 0.6, border: `1px solid ${HAIRLINE}`, background: '#FBFAF8' }}
              >
                <span className="text-xs whitespace-nowrap" style={{ color: '#6B7680' }}>{pill}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
