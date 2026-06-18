export default function Logo({ size = 'md', light = true }) {
  const scales = { sm: 0.45, md: 0.65, lg: 0.9 };
  const scale = scales[size];
  const color = light ? 'white' : '#1e3a8a';
  const subColor = light ? 'rgba(255,255,255,0.65)' : '#6b83f0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size === 'sm' ? 4 : 8 }}>
      {/* SVG wordmark with cross integrated into the t */}
      <svg
        viewBox="0 0 520 120"
        width={520 * scale}
        height={120 * scale}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
            .logo-text { font-family: 'Dancing Script', cursive; font-weight: 700; font-size: 96px; }
          `}</style>
        </defs>

        {/* "Fai" */}
        <text x="0" y="95" className="logo-text" fill={color}>Fai</text>

        {/* Cross replacing the "t" */}
        {/* Vertical bar of cross */}
        <rect x="192" y="18" width="11" height="78" rx="5.5" fill={color} />
        {/* Horizontal bar of cross */}
        <rect x="172" y="42" width="51" height="11" rx="5.5" fill={color} />

        {/* "hFlow" */}
        <text x="208" y="95" className="logo-text" fill={color}>hFlow</text>
      </svg>

      {size !== 'sm' && (
        <p style={{
          fontFamily: "'Cinzel', serif",
          fontSize: size === 'lg' ? 11 : 9,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: subColor,
          margin: 0,
        }}>
          United in Faith
        </p>
      )}
    </div>
  );
}
