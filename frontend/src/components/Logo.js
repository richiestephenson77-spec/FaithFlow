export default function Logo({ size = 'md', light = true }) {
  const color = light ? 'white' : '#111827';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
      <span style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: '26px',
        fontWeight: '700',
        color,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        Fai
      </span>

      <div style={{ position: 'relative', width: '16px', height: '32px', margin: '0 1px', flexShrink: 0 }}>
        {/* Vertical bar */}
        <div style={{
          position: 'absolute', left: '50%', top: '0',
          transform: 'translateX(-50%)',
          width: '2px', height: '100%',
          backgroundColor: '#C9932F', borderRadius: '2px',
        }} />
        {/* Top crossbar (T) */}
        <div style={{
          position: 'absolute', left: '0', top: '4px',
          width: '100%', height: '2px',
          backgroundColor: '#C9932F', borderRadius: '2px',
        }} />
        {/* Lower crossbar (cross) */}
        <div style={{
          position: 'absolute', left: '15%', top: '45%',
          width: '70%', height: '1.5px',
          backgroundColor: '#C9932F', borderRadius: '2px',
        }} />
      </div>

      <span style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: '26px',
        fontWeight: '700',
        color,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        hBridge
      </span>
    </div>
  );
}
