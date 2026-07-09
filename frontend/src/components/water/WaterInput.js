import { WATER_NEUTRAL } from '../../styles/waterTokens';

export default function WaterInput({
  className = '',
  style = {},
  children,
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 999,
        border: WATER_NEUTRAL.border,
        background: WATER_NEUTRAL.background,
        boxShadow: WATER_NEUTRAL.boxShadow,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '-40%', left: '-10%',
          width: '45%', height: '180%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
