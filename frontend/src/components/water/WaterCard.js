import { TONES } from '../../styles/waterTokens';

const RADIUS = { sm: 16, md: 20, lg: 24, xl: 32 };

// Flat card: white surface, hairline border, no gradient/shadow/specular.
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
        borderRadius,
        border: token.border,
        background: token.background,
        boxShadow: token.boxShadow,
        ...style,
      }}
    >
      {children}
    </El>
  );
}
