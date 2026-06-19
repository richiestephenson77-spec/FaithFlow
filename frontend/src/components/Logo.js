const SIZES = {
  sm: { cross: { w: 10, h: 13 }, text: '1.25rem' },
  md: { cross: { w: 13, h: 17 }, text: '1.6rem' },
  lg: { cross: { w: 18, h: 24 }, text: '2.25rem' },
};

export default function Logo({ size = 'md', light = true }) {
  const textColor = light ? 'white' : '#111827';
  const crossColor = '#F59E0B';
  const { cross, text: fontSize } = SIZES[size] || SIZES.md;

  return (
    <div className="flex items-center gap-2">
      <svg width={cross.w} height={cross.h} viewBox="0 0 14 18" fill="none">
        <rect x="6" y="0" width="2" height="18" fill={crossColor} rx="1" />
        <rect x="1" y="5" width="12" height="2" fill={crossColor} rx="1" />
      </svg>
      <span
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontWeight: 700,
          fontSize,
          color: textColor,
          lineHeight: 1,
        }}
      >
        FaithFlow
      </span>
    </div>
  );
}
