import { useNavigate } from 'react-router-dom';
import { BookOpen, Radio, Map, Shield, Church, Users, BookMarked, Handshake, Heart, Search } from 'lucide-react';

function IconOrb({ size = 48, Icon, iconSize = 22 }) {
  return (
    <div
      className="icon-orb flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon size={iconSize} color="#A8823C" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1 }} />
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full" style={{ background: '#EEF3F5' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-5">
        <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>Explore</h2>
        <p className="text-sm mt-1" style={{ color: '#6B7680' }}>Deepen your faith journey</p>
      </div>

      <div className="px-4 space-y-3">

        {/* 1. Bible — full-width hero tile */}
        <button
          className="water-tile water-tile-blue w-full text-left"
          style={{ animation: 'float1 4s ease-in-out infinite', padding: 22 }}
          onClick={() => navigate('/bible')}
        >
          <div style={{ position: 'relative', zIndex: 1 }} className="flex items-center gap-4">
            <IconOrb size={48} Icon={BookOpen} iconSize={22} />
            <div>
              <p className="font-semibold text-lg leading-tight" style={{ color: '#163449' }}>Bible</p>
              <p className="text-xs mt-0.5" style={{ color: '#4A6674' }}>Read and search scripture</p>
            </div>
          </div>
        </button>

        {/* 2. Prayer Cells + Bible Maps — 2-col medium tiles */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="water-tile water-tile-blue text-left"
            style={{ animation: 'float2 4.5s ease-in-out infinite', minHeight: 116, padding: 18 }}
            onClick={() => navigate('/prayer-cells')}
          >
            <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col gap-3 h-full">
              <IconOrb size={38} Icon={Radio} iconSize={18} />
              <p className="font-semibold text-[15px] leading-snug" style={{ color: '#163449' }}>Prayer Cells</p>
              <p className="text-[12px] leading-snug" style={{ color: '#4A6674' }}>Live audio prayer</p>
            </div>
          </button>

          <button
            className="water-tile water-tile-blue text-left relative"
            style={{ animation: 'float3 5s ease-in-out infinite', minHeight: 116, padding: 18 }}
            onClick={() => navigate('/bible-maps')}
          >
            <span
              className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#163449', zIndex: 2 }}
            >
              New
            </span>
            <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col gap-3 h-full">
              <IconOrb size={38} Icon={Map} iconSize={18} />
              <p className="font-semibold text-[15px] leading-snug" style={{ color: '#163449' }}>Bible Maps</p>
              <p className="text-[12px] leading-snug" style={{ color: '#4A6674' }}>Explore the Biblical world</p>
            </div>
          </button>
        </div>

        {/* 3. Confession Wall — full-width violet tile */}
        <button
          className="water-tile water-tile-violet w-full text-left"
          style={{ animation: 'float2 4.8s ease-in-out infinite', padding: '20px 22px 18px' }}
          onClick={() => navigate('/confessions')}
        >
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.25)', color: 'rgba(80,30,120,0.85)', position: 'relative', zIndex: 1 }}
          >
            ANONYMOUS SPACE
          </span>
          <div style={{ position: 'relative', zIndex: 1 }} className="mt-3">
            <p className="font-bold text-base leading-tight" style={{ color: '#2D1050' }}>Confession Wall</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(60,20,100,0.65)' }}>
              Share your heart without fear. Completely anonymous.
            </p>
            <div className="flex justify-end mt-3">
              <span className="text-sm font-medium" style={{ color: 'rgba(60,20,100,0.7)' }}>Enter →</span>
            </div>
          </div>
        </button>

        {/* 4. Small 2×2 grid: Churches, Pray w/ Pastor, Bible Dictionary, Prayer Partners */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Churches',         Icon: Church,    route: '/churches-hub', anim: 'float1 4.2s ease-in-out infinite' },
            { label: 'Pray w/ Pastor',   Icon: Users,     route: '/pastors',      anim: 'float3 4.7s ease-in-out infinite' },
            { label: 'Bible Dictionary', Icon: BookMarked,route: '/bible-dictionary', anim: 'float2 4.4s ease-in-out infinite' },
            { label: 'Prayer Partners',  Icon: Handshake, route: '/prayer-partners',  anim: 'float1 5.1s ease-in-out infinite' },
          ].map(({ label, Icon, route, anim }) => (
            <button
              key={label}
              className="water-tile water-tile-blue text-left"
              style={{ animation: anim, minHeight: 96, padding: 16 }}
              onClick={() => navigate(route)}
            >
              <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col justify-between h-full" >
                <Icon size={18} strokeWidth={1.6} style={{ color: '#163449' }} />
                <p className="font-semibold text-[13px] leading-snug mt-3" style={{ color: '#163449' }}>{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Coming Soon pills */}
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#8E8E8E' }}>Coming Soon</p>
          <div className="flex gap-2">
            {[
              { label: 'Answered Prayers', Icon: Heart },
              { label: 'Find Believers',   Icon: Search },
            ].map(({ label }) => (
              <div
                key={label}
                className="flex items-center rounded-full px-4 bg-white/60"
                style={{ height: 36, opacity: 0.6, border: '1px solid rgba(255,255,255,0.8)' }}
              >
                <span className="text-xs whitespace-nowrap" style={{ color: '#6B7680' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
