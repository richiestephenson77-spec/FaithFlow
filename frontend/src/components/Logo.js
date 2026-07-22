export default function Logo({ size = 'md', light = true }) {
  // light = white logo (for dark/colored backgrounds); otherwise dark ink
  const color = light ? 'white' : '#0A0A0A';
  // Cross-T follows the text color so it stays visible on any background
  const barShadow = light ? '0 0 1px rgba(0,0,0,0.3)' : 'none';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
      <span style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: '26px',
        fontWeight: '800',
        WebkitTextStroke: `0.7px ${color}`,
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
          width: '3px', height: '100%',
          backgroundColor: color, borderRadius: '2px',
          boxShadow: barShadow,
        }} />
        {/* Top crossbar (T) */}
        <div style={{
          position: 'absolute', left: '0', top: '4px',
          width: '100%', height: '3px',
          backgroundColor: color, borderRadius: '2px',
          boxShadow: barShadow,
        }} />
        {/* Lower crossbar (cross) */}
        <div style={{
          position: 'absolute', left: '15%', top: '45%',
          width: '70%', height: '2.5px',
          backgroundColor: color, borderRadius: '2px',
          boxShadow: barShadow,
        }} />
      </div>

      <span style={{
        fontFamily: "'Dancing Script', cursive",
        fontSize: '26px',
        fontWeight: '800',
        WebkitTextStroke: `0.7px ${color}`,
        color,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        hString
      </span>
    </div>
  );
}
