import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ComingSoonToast({ onDone }) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-xs">
      <div className="bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center animate-fade-in">
        Coming Soon 🙏
      </div>
    </div>
  );
}

const features = [
  {
    id: 'bible',
    label: 'Bible',
    subtitle: 'Read & Search Scripture',
    route: '/bible',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    textColor: 'text-amber-700',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="12" y1="6" x2="12" y2="12" />
        <line x1="9" y1="9" x2="15" y2="9" />
      </svg>
    ),
    active: true,
  },
  {
    id: 'churches',
    label: 'Find Churches',
    subtitle: 'Join your local church',
    route: '/churches',
    color: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    textColor: 'text-indigo-700',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L12 7M9 4.5L15 4.5" />
        <path d="M5 10h14l1 11H4L5 10z" />
        <rect x="9" y="14" width="6" height="7" />
      </svg>
    ),
    active: true,
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    subtitle: 'Celebrate God\'s faithfulness',
    color: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    textColor: 'text-emerald-700',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11.34V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8.66" />
        <path d="M9 14s.5 2 3 2 3-2 3-2" />
        <path d="M12 3C8 3 6 6 6 9l6 3 6-3c0-3-2-6-6-6z" />
      </svg>
    ),
    active: false,
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray together in pairs',
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    textColor: 'text-purple-700',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    active: false,
  },
  {
    id: 'believers',
    label: 'Find Believers',
    subtitle: 'Connect by faith & location',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    textColor: 'text-rose-700',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    active: false,
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(false);

  function handleTap(feature) {
    if (feature.active) {
      navigate(feature.route);
    } else {
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {toast && <ComingSoonToast />}

      {/* Header */}
      <div className="prayer-gradient px-5 pt-5 pb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Explore</h2>
        <p className="text-white/70 text-sm">Deepen your faith journey</p>
      </div>

      <div className="-mt-3 rounded-t-3xl bg-gray-50 px-4 pt-6 pb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Features</p>

        <div className="grid grid-cols-2 gap-3">
          {features.map(f => (
            <button
              key={f.id}
              onClick={() => handleTap(f)}
              className={`relative flex flex-col items-start p-4 rounded-2xl border ${f.bg} ${f.border} shadow-sm active:scale-95 transition-transform text-left`}
            >
              {!f.active && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Soon
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-sm text-white`}>
                {f.icon}
              </div>
              <p className={`font-bold text-sm ${f.textColor} leading-tight`}>{f.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{f.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Verse of the day */}
        <div className="mt-6 prayer-gradient rounded-2xl p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Verse of the Day</p>
          <p className="text-sm font-medium leading-relaxed italic">
            "I can do all things through Christ who strengthens me."
          </p>
          <p className="text-xs text-white/60 mt-2">Philippians 4:13</p>
        </div>
      </div>
    </div>
  );
}
