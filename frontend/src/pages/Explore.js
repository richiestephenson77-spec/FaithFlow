import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Church, Shield, Users, Heart, Handshake, Search, ArrowRight, Radio, BookMarked, Map } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

const heroVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const features = [
  {
    id: 'bible',
    label: 'Bible',
    subtitle: 'Read & search scripture',
    route: '/bible',
    gradient: 'linear-gradient(135deg, #1a2a3a, #0d1a26)',
    accent: '#F59E0B',
    Icon: BookOpen,
    active: true,
  },
  {
    id: 'churches',
    label: 'Churches',
    subtitle: 'Find local · Join community',
    route: '/churches-hub',
    gradient: 'linear-gradient(135deg, #1a2e1a, #0d1a0d)',
    accent: '#34D399',
    Icon: Church,
    active: true,
  },
  {
    id: 'confessions',
    label: 'Confession Wall',
    subtitle: 'Share your heart without fear. Completely anonymous.',
    route: '/confessions',
    gradient: 'linear-gradient(135deg, #2D1B4E, #1A0F2E)',
    accent: '#A78BFA',
    Icon: Shield,
    active: true,
    fullWidth: true,
  },
  {
    id: 'cells',
    label: 'Prayer Cells',
    subtitle: 'Join a live audio prayer session',
    route: '/prayer-cells',
    gradient: 'linear-gradient(135deg, #2a1a0d, #1a0d05)',
    accent: '#F97316',
    Icon: Radio,
    active: true,
  },
  {
    id: 'pastors',
    label: 'Pray w/ Pastor',
    subtitle: 'Connect with verified pastors',
    route: '/pastors',
    gradient: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)',
    accent: '#60A5FA',
    Icon: Users,
    active: true,
  },
  {
    id: 'bibleDictionary',
    label: 'Bible Dictionary',
    subtitle: 'Search any word, name or topic',
    route: '/bible-dictionary',
    gradient: 'linear-gradient(135deg, #1a2a1a, #0d1a0d)',
    accent: '#4ADE80',
    Icon: BookMarked,
    active: true,
  },
  {
    id: 'bibleMaps',
    label: 'Bible Maps',
    subtitle: 'Explore the Biblical world through time',
    route: '/bible-maps',
    gradient: 'linear-gradient(135deg, #2a1a0a, #1a0f05)',
    accent: '#F5C842',
    Icon: Map,
    active: true,
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    subtitle: "Celebrate God's faithfulness",
    Icon: Heart,
    active: false,
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray together in pairs',
    Icon: Handshake,
    active: false,
  },
  {
    id: 'believers',
    label: 'Find Believers',
    subtitle: 'Connect by faith & location',
    Icon: Search,
    active: false,
  },
];

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] mx-4 mb-3 mt-6">
      {children}
    </p>
  );
}

function FeaturedCard({ feature, onTap }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative flex flex-col p-5 rounded-3xl text-left overflow-hidden w-full"
        style={{ height: 150, background: feature.gradient }}
      >
        <div
          className="flex items-center justify-center rounded-[12px] flex-shrink-0"
          style={{ width: 40, height: 40, background: feature.accent + '33' }}
        >
          <feature.Icon size={18} color={feature.accent} strokeWidth={1.8} />
        </div>
        <p className="font-semibold text-base mt-3 leading-tight text-white">{feature.label}</p>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed flex-1">{feature.subtitle}</p>
        <div className="flex justify-end">
          <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
        </div>
      </motion.button>
    </motion.div>
  );
}

function GridCard({ feature, onTap }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative flex flex-col p-4 rounded-3xl text-left overflow-hidden w-full"
        style={{ height: 130, background: feature.gradient }}
      >
        <div
          className="flex items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ width: 36, height: 36, background: feature.accent + '33' }}
        >
          <feature.Icon size={16} color={feature.accent} strokeWidth={1.8} />
        </div>
        <p className="font-semibold text-sm mt-2.5 leading-tight text-white">{feature.label}</p>
        <p className="text-slate-400 text-[11px] mt-0.5 leading-snug flex-1">{feature.subtitle}</p>
      </motion.button>
    </motion.div>
  );
}

function ComingSoonCard({ feature }) {
  return (
    <div
      className="relative flex flex-col p-3 rounded-2xl flex-shrink-0"
      style={{ width: 120, height: 90, background: '#111', opacity: 0.4 }}
    >
      <span
        className="absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
      >
        Soon
      </span>
      <feature.Icon size={16} color="rgba(255,255,255,0.2)" strokeWidth={1.8} />
      <p className="font-medium text-xs mt-2 leading-tight text-white/30">{feature.label}</p>
      <p className="text-white/20 text-xs mt-0.5 leading-snug">{feature.subtitle}</p>
    </div>
  );
}

function HeroCard({ feature, onTap }) {
  return (
    <motion.div variants={heroVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative w-full flex flex-col p-6 rounded-3xl text-left overflow-hidden"
        style={{ height: 140, background: feature.gradient }}
      >
        <div
          className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
        />

        <div className="flex items-start justify-between">
          <div
            className="flex items-center justify-center rounded-[12px] flex-shrink-0"
            style={{ width: 44, height: 44, background: feature.accent + '33' }}
          >
            <feature.Icon size={20} color={feature.accent} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-semibold text-purple-300/60 tracking-widest uppercase mt-1">
            Anonymous Space
          </span>
        </div>

        <p className="text-white font-semibold text-base mt-4 leading-tight">{feature.label}</p>
        <p className="text-slate-400 text-xs mt-1">{feature.subtitle}</p>

        <div className="mt-auto pt-3 flex justify-end">
          <span
            className="text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ background: 'rgba(167,139,250,0.2)', color: '#C4B5FD' }}
          >
            Enter <ArrowRight size={12} />
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}

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

  const [bible, churches, confessions, cells, pastors, bibleDictionary, bibleMaps, answered, partners, believers] = features;

  return (
    <div className="min-h-full" style={{ background: '#0d0d0d' }}>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-xs">
          <div className="bg-white/10 backdrop-blur-md text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center border border-white/10">
            Coming Soon 🙏
          </div>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-4 pt-6 pb-1"
      >
        <h2 className="text-3xl font-bold text-white">Explore</h2>
        <p className="text-sm text-slate-400 mt-1">Deepen your faith journey</p>
      </motion.div>

      <div className="pb-32">
        {/* Section 1 — Featured */}
        <SectionLabel>Explore</SectionLabel>
        <motion.div
          className="grid grid-cols-2 gap-3 mx-4"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
        >
          <FeaturedCard feature={bible} onTap={handleTap} />
          <FeaturedCard feature={churches} onTap={handleTap} />
        </motion.div>

        {/* Section 2 — Hero */}
        <div className="mx-4 mt-3">
          <HeroCard feature={confessions} onTap={handleTap} />
        </div>

        {/* Section 3 — Connect */}
        <SectionLabel>Connect</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mx-4">
          <GridCard feature={cells} onTap={handleTap} />
          <GridCard feature={pastors} onTap={handleTap} />
        </div>

        {/* Section 3b — Learn */}
        <SectionLabel>Learn</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mx-4">
          <GridCard feature={bibleDictionary} onTap={handleTap} />
          <GridCard feature={bibleMaps} onTap={handleTap} />
        </div>

        {/* Section 4 — Coming Soon */}
        <SectionLabel>Coming Soon</SectionLabel>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
          <ComingSoonCard feature={answered} />
          <ComingSoonCard feature={partners} />
          <ComingSoonCard feature={believers} />
        </div>
      </div>
    </div>
  );
}
