import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Church, Shield, Users, Heart, Handshake, Search, ArrowRight, Radio, BookMarked, Map } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

const features = [
  {
    id: 'bible',
    label: 'Bible',
    subtitle: 'Read & search scripture',
    route: '/bible',
    border: '#F59E0B',
    iconBg: '#FEF3C7',
    Icon: BookOpen,
    active: true,
  },
  {
    id: 'churches',
    label: 'Churches',
    subtitle: 'Find local · Join community',
    route: '/churches-hub',
    border: '#10B981',
    iconBg: '#D1FAE5',
    Icon: Church,
    active: true,
  },
  {
    id: 'confessions',
    label: 'Confession Wall',
    subtitle: 'Share your heart without fear. Completely anonymous.',
    route: '/confessions',
    Icon: Shield,
    active: true,
  },
  {
    id: 'cells',
    label: 'Prayer Cells',
    subtitle: 'Join a live audio prayer session',
    route: '/prayer-cells',
    border: '#F97316',
    Icon: Radio,
    active: true,
  },
  {
    id: 'pastors',
    label: 'Pray w/ Pastor',
    subtitle: 'Connect with verified pastors',
    route: '/pastors',
    border: '#3B82F6',
    Icon: Users,
    active: true,
  },
  {
    id: 'bibleDictionary',
    label: 'Bible Dictionary',
    subtitle: 'Search any word, name or topic',
    route: '/bible-dictionary',
    border: '#22C55E',
    Icon: BookMarked,
    active: true,
  },
  {
    id: 'bibleMaps',
    label: 'Bible Maps',
    subtitle: 'Explore the Biblical world through time',
    route: '/bible-maps',
    border: '#F5C842',
    Icon: Map,
    active: true,
    isNew: true,
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    Icon: Heart,
    active: false,
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray for each other for 7 days',
    route: '/prayer-partners',
    border: '#8B5CF6',
    Icon: Handshake,
    active: true,
  },
  {
    id: 'believers',
    label: 'Find Believers',
    Icon: Search,
    active: false,
  },
];

function SectionLabel({ children, muted }) {
  return (
    <p className={`text-[10px] uppercase tracking-widest mx-4 mb-2 ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
      {children}
    </p>
  );
}

function FeaturedCard({ feature, onTap }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative flex flex-col p-5 rounded-2xl text-left w-full bg-white shadow-sm"
        style={{ height: 140, borderTop: `3px solid ${feature.border}` }}
      >
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 36, height: 36, background: feature.iconBg }}
        >
          <feature.Icon size={18} color={feature.border} strokeWidth={1.8} />
        </div>
        <p className="font-bold text-base mt-3 leading-tight text-gray-900">{feature.label}</p>
        <p className="text-gray-400 text-xs mt-1 leading-relaxed flex-1">{feature.subtitle}</p>
        <div className="flex justify-end">
          <ArrowRight size={14} color="#D1D5DB" />
        </div>
      </motion.button>
    </motion.div>
  );
}

function GridCard({ feature, onTap }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative flex flex-col p-4 rounded-2xl text-left w-full bg-white shadow-sm"
        style={{ height: 110, borderLeft: `4px solid ${feature.border}` }}
      >
        {feature.isNew && (
          <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
            NEW
          </span>
        )}
        <feature.Icon size={24} color={feature.border} strokeWidth={1.8} />
        <p className="font-semibold text-sm mt-2 leading-tight text-gray-900">{feature.label}</p>
        <p className="text-gray-400 text-xs mt-0.5 leading-snug">{feature.subtitle}</p>
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

function HeroCard({ feature, onTap }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative w-full flex flex-col p-5 rounded-2xl text-left overflow-hidden"
        style={{ height: 110, background: 'linear-gradient(135deg, #4C1D95, #6D28D9)' }}
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

export default function Explore() {
  const navigate = useNavigate();

  function handleTap(feature) {
    if (feature.active) navigate(feature.route);
  }

  const [bible, churches, confessions, cells, pastors, bibleDictionary, bibleMaps, answered, partners, believers] = features;

  return (
    <div className="min-h-full" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-4 pt-6 pb-1"
      >
        <h2 className="text-3xl font-bold text-gray-900">Explore</h2>
        <p className="text-sm text-gray-400 mt-1">Deepen your faith journey</p>
      </motion.div>

      <div className="pb-32">
        {/* Row 1 — Featured */}
        <SectionLabel>Explore</SectionLabel>
        <motion.div
          className="grid grid-cols-2 gap-3 mx-4"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
        >
          <FeaturedCard feature={bible} onTap={handleTap} />
          <FeaturedCard feature={churches} onTap={handleTap} />
        </motion.div>

        {/* Row 2 — Confession Wall */}
        <div className="mx-4 mt-3">
          <HeroCard feature={confessions} onTap={handleTap} />
        </div>

        {/* Row 3 — Connect 3x2 */}
        <SectionLabel>Connect</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mx-4">
          <GridCard feature={cells} onTap={handleTap} />
          <GridCard feature={pastors} onTap={handleTap} />
          <GridCard feature={bibleDictionary} onTap={handleTap} />
          <GridCard feature={bibleMaps} onTap={handleTap} />
          <GridCard feature={partners} onTap={handleTap} />
        </div>

        {/* Row 4 — Coming Soon */}
        <SectionLabel muted>Coming Soon</SectionLabel>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          <ComingSoonPill feature={answered} />
          <ComingSoonPill feature={believers} />
        </div>
      </div>
    </div>
  );
}
