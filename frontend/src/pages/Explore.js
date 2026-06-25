import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, MapPin, Shield, Users, Heart, Handshake, Search, ArrowRight, Radio, Navigation } from 'lucide-react';

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
    gradient: 'linear-gradient(135deg, #1E3A5F, #0F2240)',
    accent: '#F59E0B',
    Icon: BookOpen,
    active: true,
  },
  {
    id: 'churches',
    label: 'Find Churches',
    subtitle: 'Join your local church',
    route: '/churches',
    gradient: 'linear-gradient(135deg, #1A3A2A, #0D2018)',
    accent: '#34D399',
    Icon: MapPin,
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
    id: 'pastors',
    label: 'Pray w/ Pastor',
    subtitle: 'Connect with verified pastors',
    route: '/pastors',
    gradient: 'linear-gradient(135deg, #3A1F1F, #220F0F)',
    accent: '#F87171',
    Icon: Users,
    active: true,
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    subtitle: "Celebrate God's faithfulness",
    gradient: 'linear-gradient(135deg, #1F2D3A, #0F1820)',
    accent: '#60A5FA',
    Icon: Heart,
    active: false,
  },
  {
    id: 'cells',
    label: 'Prayer Cells',
    subtitle: 'Join a live audio prayer session',
    route: '/prayer-cells',
    gradient: 'linear-gradient(135deg, #1F3A2A, #0D2018)',
    accent: '#f59e0b',
    Icon: Radio,
    active: true,
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray together in pairs',
    gradient: 'linear-gradient(135deg, #2A1F3A, #180D26)',
    accent: '#C084FC',
    Icon: Handshake,
    active: false,
  },
  {
    id: 'believers',
    label: 'Find Believers',
    subtitle: 'Connect by faith & location',
    gradient: 'linear-gradient(135deg, #1A2E3A, #0D1E26)',
    accent: '#22D3EE',
    Icon: Search,
    active: false,
  },
  {
    id: 'findChurches',
    label: 'Nearby Churches',
    subtitle: 'Discover churches near you',
    route: '/find-churches',
    gradient: 'linear-gradient(135deg, #1A3A2A, #0D2018)',
    accent: '#34D399',
    Icon: Navigation,
    active: true,
  },
];

function SmallCard({ feature, onTap }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.button
        whileTap={{ scale: feature.active ? 0.96 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative flex flex-col p-6 rounded-3xl text-left overflow-hidden w-full"
        style={{ height: 180, background: feature.gradient }}
      >
        {!feature.active && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Coming Soon
          </motion.span>
        )}

        <div
          className="flex items-center justify-center rounded-[12px] flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: feature.active ? feature.accent + '33' : feature.accent + '1A',
          }}
        >
          <feature.Icon
            size={20}
            color={feature.active ? feature.accent : feature.accent + '80'}
            strokeWidth={1.8}
          />
        </div>

        <p className={`font-semibold text-base mt-3 leading-tight ${feature.active ? 'text-white' : 'text-slate-400'}`}>
          {feature.label}
        </p>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed flex-1">{feature.subtitle}</p>

        {feature.active && (
          <div className="flex justify-end mt-2">
            <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
          </div>
        )}
      </motion.button>
    </motion.div>
  );
}

function HeroCard({ feature, onTap }) {
  return (
    <motion.div
      variants={heroVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => onTap(feature)}
        className="relative w-full flex flex-col p-6 rounded-3xl text-left overflow-hidden"
        style={{ height: 160, background: feature.gradient }}
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

  const [bible, churches, confessions, pastors, answered, cells, partners, believers, findChurches] = features;

  return (
    <div className="min-h-full" style={{ background: '#0A0F1E' }}>
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
        className="px-4 pt-6 pb-5"
      >
        <h2 className="text-3xl font-bold text-white">Explore</h2>
        <p className="text-sm text-slate-400 mt-1">Deepen your faith journey</p>
      </motion.div>

      {/* Cards */}
      <div className="px-4 space-y-3 pb-32">
        {/* Row 1 — stagger pair */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
        >
          <SmallCard feature={bible} onTap={handleTap} />
          <SmallCard feature={churches} onTap={handleTap} />
        </motion.div>

        {/* Row 2 — full width hero */}
        <HeroCard feature={confessions} onTap={handleTap} />

        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-3">
          <SmallCard feature={pastors} onTap={handleTap} />
          <SmallCard feature={answered} onTap={handleTap} />
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-2 gap-3">
          <SmallCard feature={cells} onTap={handleTap} />
          <SmallCard feature={partners} onTap={handleTap} />
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-2 gap-3">
          <SmallCard feature={believers} onTap={handleTap} />
          <SmallCard feature={findChurches} onTap={handleTap} />
        </div>
      </div>
    </div>
  );
}
