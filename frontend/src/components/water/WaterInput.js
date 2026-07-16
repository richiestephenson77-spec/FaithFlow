import { WATER_NEUTRAL } from '../../styles/waterTokens';

// Flat input container: white surface, hairline border, no gradient/specular.
export default function WaterInput({
  className = '',
  style = {},
  children,
}) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 999,
        border: WATER_NEUTRAL.border,
        background: WATER_NEUTRAL.background,
        boxShadow: WATER_NEUTRAL.boxShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
