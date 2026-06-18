export default function Logo({ size = 'md', light = true }) {
  const sizes = {
    sm: { cross: 18, text: 'text-lg', sub: 'text-[10px]', gap: 'gap-1.5' },
    md: { cross: 28, text: 'text-3xl', sub: 'text-xs', gap: 'gap-2' },
    lg: { cross: 40, text: 'text-5xl', sub: 'text-sm', gap: 'gap-3' },
  };
  const s = sizes[size];
  const textColor = light ? 'text-white' : 'text-faith-700';
  const subColor = light ? 'text-white/60' : 'text-faith-400';

  return (
    <div className={`flex flex-col items-center ${s.gap}`}>
      {/* Cross SVG integrated with glow */}
      <div className="relative flex items-center justify-center">
        <svg width={s.cross} height={s.cross} viewBox="0 0 40 40" fill="none">
          {/* Glow effect */}
          <ellipse cx="20" cy="20" rx="14" ry="14" fill={light ? 'rgba(255,255,255,0.08)' : 'rgba(30,58,138,0.06)'} />
          {/* Cross arms */}
          <rect x="17" y="4" width="6" height="32" rx="3" fill={light ? 'white' : '#1e3a8a'} />
          <rect x="6" y="13" width="28" height="6" rx="3" fill={light ? 'white' : '#1e3a8a'} />
          {/* Gold accent dot at center */}
          <circle cx="20" cy="16" r="3.5" fill="#f59e0b" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <div className={`font-cinzel font-bold tracking-widest leading-none ${s.text} ${textColor}`}>
          <span>Faith</span><span style={{ color: '#f59e0b' }}>Flow</span>
        </div>
        {size !== 'sm' && (
          <p className={`font-cinzel tracking-[0.2em] uppercase mt-1 ${s.sub} ${subColor}`}>
            United in Faith
          </p>
        )}
      </div>
    </div>
  );
}
