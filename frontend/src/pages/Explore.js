import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Church, Shield, Users, Heart, Handshake, Search, ChevronRight, Radio, BookMarked, Map } from 'lucide-react';

const features = [
  {
    id: 'bible',
    label: 'Bible',
    subtitle: 'Read & search scripture',
    route: '/bible',
    Icon: BookOpen,
    active: true,
    section: 'featured',
  },
  {
    id: 'churches',
    label: 'Churches',
    subtitle: 'Find local · Join community',
    route: '/churches-hub',
    Icon: Church,
    active: true,
    section: 'explore',
  },
  {
    id: 'confessions',
    label: 'Confession Wall',
    subtitle: 'Share your heart without fear. Completely anonymous.',
    route: '/confessions',
    Icon: Shield,
    active: true,
    section: 'hero',
  },
  {
    id: 'cells',
    label: 'Prayer Cells',
    subtitle: 'Join a live audio prayer session',
    route: '/prayer-cells',
    Icon: Radio,
    active: true,
    section: 'featured',
  },
  {
    id: 'pastors',
    label: 'Pray w/ Pastor',
    subtitle: 'Connect with verified pastors',
    route: '/pastors',
    Icon: Users,
    active: true,
    section: 'connect',
  },
  {
    id: 'bibleDictionary',
    label: 'Bible Dictionary',
    subtitle: 'Search any word, name or topic',
    route: '/bible-dictionary',
    Icon: BookMarked,
    active: true,
    section: 'connect',
  },
  {
    id: 'bibleMaps',
    label: 'Bible Maps',
    subtitle: 'Explore the Biblical world through time',
    route: '/bible-maps',
    Icon: Map,
    active: true,
    isNew: true,
    section: 'connect',
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray for each other for 7 days',
    route: '/prayer-partners',
    Icon: Handshake,
    active: true,
    section: 'connect',
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    Icon: Heart,
    active: false,
    section: 'soon',
  },
  {
    id: 'believers',
    label: 'Find Believers',
    Icon: Search,
    active: false,
    section: 'soon',
  },
];

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-[#8E8E8E] tracking-wide uppercase px-4 mt-6 mb-1">
      {children}
    </p>
  );
}

function FeaturedRow({ feature, onTap, isLast }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => onTap(feature)}
      className={`w-full flex items-center gap-3 px-4 py-4 bg-white text-left${isLast ? '' : ' border-b border-[#EFEFEF]'}`}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 44, height: 44, background: '#F6F1E4' }}
      >
        <feature.Icon size={28} color="#262626" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[#262626] font-semibold text-[17px] leading-tight">{feature.label}</span>
        {feature.subtitle && (
          <p className="text-[#8E8E8E] text-[13px] mt-0.5 leading-snug">{feature.subtitle}</p>
        )}
      </div>
      <ChevronRight size={18} color="#C7C7C7" className="flex-shrink-0" />
    </motion.button>
  );
}

function ListRow({ feature, onTap, isLast }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => onTap(feature)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white text-left${isLast ? '' : ' border-b border-[#EFEFEF]'}`}
    >
      <feature.Icon size={22} color="#262626" strokeWidth={1.6} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[#262626] font-semibold text-[15px] leading-tight">{feature.label}</span>
          {feature.isNew && (
            <span className="text-[10px] font-bold text-[#C9932F]">New</span>
          )}
        </div>
        {feature.subtitle && (
          <p className="text-[#8E8E8E] text-[13px] mt-0.5 leading-snug">{feature.subtitle}</p>
        )}
      </div>
      <ChevronRight size={18} color="#C7C7C7" className="flex-shrink-0" />
    </motion.button>
  );
}

function HeroCard({ feature, onTap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative w-full flex flex-col p-5 rounded-2xl text-left overflow-hidden mx-4"
        style={{ width: 'calc(100% - 2rem)', height: 110, background: 'linear-gradient(135deg, #4C1D95, #6D28D9)' }}
      >
        <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          ANONYMOUS SPACE
        </span>
        <p className="text-white font-bold text-base mt-1">{feature.label}</p>
        <p className="text-white/60 text-xs mt-1 flex-1">{feature.subtitle}</p>
        <div className="flex justify-end">
          <span className="text-white/80 text-sm">Enter →</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

function ComingSoonPill({ feature }) {
  return (
    <div
      className="flex-shrink-0 flex items-center rounded-full px-4 bg-gray-100"
      style={{ height: 36, opacity: 0.6 }}
    >
      <span className="text-gray-400 text-xs whitespace-nowrap">{feature.label}</span>
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();

  function handleTap(feature) {
    if (feature.active) navigate(feature.route);
  }

  const featuredItems = features.filter(f => f.section === 'featured');
  const exploreItems = features.filter(f => f.section === 'explore');
  const confessions = features.find(f => f.id === 'confessions');
  const connectItems = features.filter(f => f.section === 'connect');
  const soonItems = features.filter(f => f.section === 'soon');

  return (
    <div className="min-h-full" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-4 pt-6 pb-3"
      >
        <h2 className="text-3xl font-bold text-gray-900">Explore</h2>
        <p className="text-sm text-gray-400 mt-1">Deepen your faith journey</p>
      </motion.div>

      <div className="pb-32">
        {/* Featured — Bible + Prayer Cells */}
        <SectionLabel>Get Started</SectionLabel>
        <div className="bg-white rounded-2xl mx-4 overflow-hidden">
          {featuredItems.map((f, i) => (
            <FeaturedRow key={f.id} feature={f} onTap={handleTap} isLast={i === featuredItems.length - 1} />
          ))}
        </div>

        {/* Explore section */}
        <SectionLabel>Explore</SectionLabel>
        <div className="bg-white rounded-2xl mx-4 overflow-hidden">
          {exploreItems.map((f, i) => (
            <ListRow key={f.id} feature={f} onTap={handleTap} isLast={i === exploreItems.length - 1} />
          ))}
        </div>

        {/* Confession Wall hero */}
        <div className="mt-4">
          <HeroCard feature={confessions} onTap={handleTap} />
        </div>

        {/* Connect section */}
        <SectionLabel>Connect</SectionLabel>
        <div className="bg-white rounded-2xl mx-4 overflow-hidden">
          {connectItems.map((f, i) => (
            <ListRow key={f.id} feature={f} onTap={handleTap} isLast={i === connectItems.length - 1} />
          ))}
        </div>

        {/* Coming Soon */}
        <SectionLabel>Coming Soon</SectionLabel>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          {soonItems.map(f => <ComingSoonPill key={f.id} feature={f} />)}
        </div>
      </div>
    </div>
  );
}
