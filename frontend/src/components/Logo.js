const SIZES = {
  sm: { fontSize: '20px', tWidth: 16, tHeight: 26, vBar: 2, hBar: 2, crossBar: 1.5, marginTop: -1 },
  md: { fontSize: '28px', tWidth: 22, tHeight: 36, vBar: 2.5, hBar: 2.5, crossBar: 2, marginTop: -2 },
  lg: { fontSize: '38px', tWidth: 30, tHeight: 48, vBar: 3, hBar: 3, crossBar: 2.5, marginTop: -2 },
};

export default function Logo({ size = 'md', light = true }) {
  const color = light ? 'white' : '#111827';
  const s = SIZES[size] || SIZES.md;

  return (
    <div className="flex items-center gap-1">
      <span
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontWeight: 700,
          fontSize: s.fontSize,
          color,
          lineHeight: 1,
        }}
      >
        Fai
      </span>

      {/* T with integrated cross */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: s.tWidth, height: s.tHeight, marginTop: s.marginTop }}
      >
        {/* Vertical bar */}
        <div
          className="absolute bg-amber-500 rounded-full"
          style={{ width: s.vBar, height: '100%', left: '50%', transform: 'translateX(-50%)' }}
        />
        {/* Top crossbar (makes the T) */}
        <div
          className="absolute bg-amber-500 rounded-full"
          style={{ width: '100%', height: s.hBar, top: 0 }}
        />
        {/* Lower crossbar (makes it a cross) */}
        <div
          className="absolute bg-amber-500 rounded-full"
          style={{ width: '70%', height: s.crossBar, top: '40%', left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>

      <span
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontWeight: 700,
          fontSize: s.fontSize,
          color,
          lineHeight: 1,
        }}
      >
        hFlow
      </span>
    </div>
  );
}
