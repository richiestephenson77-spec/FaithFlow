import { TONES } from '../../styles/waterTokens';

const RADIUS = { sm: 16, md: 20, lg: 24, xl: 32 };

export default function WaterCard({
  tone = 'blue',
  onClick,
  className = '',
  style = {},
  radius = 'lg',
  children,
  as: Tag,
}) {
  const token = TONES[tone] ?? TONES.blue;
  const borderRadius = RADIUS[radius] ?? RADIUS.lg;
  const El = Tag ?? (onClick ? 'button' : 'div');

  return (
    <El
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius,
        border: token.border,
        background: token.background,
        boxShadow: token.boxShadow,
        ...style,
      }}
    >
      {/* specular highlight */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '-25%', left: '-15%',
          width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* content above specular */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </El>
  );
}
