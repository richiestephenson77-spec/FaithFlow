import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, MapPin, Shield, Users, Heart, Handshake, Search } from 'lucide-react';
import { staggerItem } from '../utils/animations';

const gridContainer = { animate: { transition: { staggerChildren: 0.07 } } };

const features = [
  {
    id: 'bible',
    label: 'Bible',
    subtitle: 'Read & search scripture',
    route: '/bible',
    iconBg: '#F59E0B',
    Icon: BookOpen,
    active: true,
  },
  {
    id: 'churches',
    label: 'Find Churches',
    subtitle: 'Join your local church',
    route: '/churches',
    iconBg: '#3B82F6',
    Icon: MapPin,
    active: true,
  },
  {
    id: 'confessions',
    label: 'Confession Wall',
    subtitle: 'Anonymous, no judgment',
    route: '/confessions',
    iconBg: '#8B5CF6',
    Icon: Shield,
    active: true,
  },
  {
    id: 'pastors',
    label: 'Pray w/ Pastor',
    subtitle: 'Connect with verified pastors',
    route: '/pastors',
    iconBg: '#10B981',
    Icon: Users,
    active: true,
  },
  {
    id: 'answered',
    label: 'Answered Prayers',
    subtitle: "Celebrate God's faithfulness",
    iconBg: '#EC4899',
    Icon: Heart,
    active: false,
  },
  {
    id: 'partners',
    label: 'Prayer Partners',
    subtitle: 'Pray together in pairs',
    iconBg: '#F97316',
    Icon: Handshake,
    active: false,
  },
  {
    id: 'believers',
    label: 'Find Believers',
    subtitle: 'Connect by faith & location',
    iconBg: '#06B6D4',
    Icon: Search,
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
    <div className="bg-white min-h-full">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-xs">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl text-center">
            Coming Soon 🙏
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-0.5">Explore</h2>
        <p className="text-sm text-gray-400">Deepen your faith journey</p>
      </div>
      <div className="h-px bg-gray-100 mx-0" />

      {/* Grid */}
      <div className="px-4 pt-5 pb-28">
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={gridContainer}
          initial="initial"
          animate="animate"
        >
          {features.map(f => (
            <motion.button
              key={f.id}
              variants={staggerItem}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTap(f)}
              className="relative flex flex-col items-start p-5 rounded-[20px] text-left"
              style={{
                height: 140,
                background: '#FFFFFF',
                border: '1px solid #F1F5F9',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              {!f.active && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}

              <div
                className="flex items-center justify-center rounded-[14px] mb-3 flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  background: f.active ? f.iconBg : f.iconBg + 'B3',
                }}
              >
                <f.Icon size={24} color="#FFFFFF" strokeWidth={1.8} />
              </div>

              <p className={`font-bold text-sm leading-tight ${f.active ? 'text-gray-900' : 'text-gray-500'}`}>
                {f.label}
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{f.subtitle}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
