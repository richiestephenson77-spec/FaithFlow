import { WATER_BLUE, WATER_NEUTRAL } from '../../styles/waterTokens';

export default function WaterPill({
  active = false,
  onClick,
  className = '',
  style = {},
  children,
}) {
  const token = active ? WATER_BLUE : WATER_NEUTRAL;

  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 999,
        border: active ? '1px solid rgba(22,52,73,0.25)' : token.border,
        background: token.background,
        boxShadow: token.boxShadow,
        color: active ? '#163449' : '#6B7680',
        fontWeight: active ? 600 : 400,
        padding: '6px 14px',
        fontSize: 13,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '-40%', left: '-10%',
          width: '50%', height: '180%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  );
}
