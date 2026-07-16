// Flat pill: active = subtle gray tint + dark ink; inactive = transparent + muted text.
export default function WaterPill({
  active = false,
  onClick,
  className = '',
  style = {},
  children,
}) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        borderRadius: 999,
        border: 'none',
        background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
        boxShadow: 'none',
        color: active ? '#163449' : '#8E8E8E',
        fontWeight: active ? 500 : 400,
        padding: '6px 14px',
        fontSize: 13,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
