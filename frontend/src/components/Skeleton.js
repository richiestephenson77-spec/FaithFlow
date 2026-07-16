// Flat gray pulse block — the app's single loading primitive (no spinners).
export default function Skeleton({ width, height, rounded = 12, circle = false, className = '', style = {} }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse ${className}`}
      style={{
        background: '#F0F0F0',
        width,
        height,
        borderRadius: circle ? '9999px' : rounded,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
