import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Users, Hand } from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    bg: '#1a1a2e',
    icon: null,
    emoji: '✝️',
    title: 'Welcome to FaithString',
    subtitle: 'Your faith community awaits',
  },
  {
    id: 'prayer',
    bg: '#1E2D3D',
    Icon: Hand,
    title: 'Pray For Others',
    subtitle: 'Join thousands of believers praying for each other daily',
    card: true,
  },
  {
    id: 'community',
    bg: '#2e1065',
    Icon: Users,
    title: 'Find Your Community',
    subtitle: 'Connect with believers, join churches, share your faith journey',
  },
  {
    id: 'bible',
    bg: '#052e16',
    Icon: BookOpen,
    title: "Explore God's Word",
    subtitle: 'Bible reader, dictionary, maps and more — everything you need',
  },
  {
    id: 'getstarted',
    bg: '#0f172a',
    icon: null,
    emoji: null,
    title: "You're Ready!",
    subtitle: "Let's begin your faith journey",
    final: true,
  },
];

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const transition = { type: 'spring', stiffness: 300, damping: 30 };

export default function Onboarding() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  function goNext() {
    if (current === SLIDES.length - 1) {
      complete();
      return;
    }
    setDirection(1);
    setCurrent(c => c + 1);
  }

  function goPrev() {
    if (current === 0) return;
    setDirection(-1);
    setCurrent(c => c - 1);
  }

  function complete() {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/');
  }

  const slide = SLIDES[current];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: slide.bg, transition: 'background 0.5s ease' }}>
      {/* Glow orb behind content */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.04)',
          filter: 'blur(80px)',
        }}
      />

      {/* Slide content */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) goNext();
            else if (info.offset.x > 50) goPrev();
          }}
          className="absolute inset-0 flex flex-col items-center justify-center px-8 select-none"
        >
          {/* Icon / emoji */}
          <div className="mb-8 flex flex-col items-center">
            {slide.emoji && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                style={{ fontSize: slide.id === 'welcome' ? 72 : 56 }}
              >
                {slide.emoji}
              </motion.div>
            )}
            {slide.Icon && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <slide.Icon size={38} color="white" strokeWidth={1.5} />
              </motion.div>
            )}
            {slide.id === 'getstarted' && (
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
                className="relative flex items-center justify-center"
                style={{ width: 100, height: 100 }}
              >
                {/* Glow rings */}
                <div className="absolute rounded-full" style={{ width: 100, height: 100, background: 'rgba(44,64,85,0.12)', filter: 'blur(12px)' }} />
                <div className="absolute rounded-full" style={{ width: 70, height: 70, background: 'rgba(44,64,85,0.18)', filter: 'blur(6px)' }} />
                <span style={{ fontSize: 52 }}>✝️</span>
              </motion.div>
            )}
          </div>

          {/* Text */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="font-bold text-white text-center"
            style={{ fontSize: slide.final ? 36 : 30 }}
          >
            {slide.title}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="text-base text-center mt-3 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 280 }}
          >
            {slide.subtitle}
          </motion.p>

          {/* Mock prayer card for prayer slide */}
          {slide.card && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-8 w-full rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.12)', maxWidth: 300 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                <div>
                  <div className="h-2.5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                  <div className="h-2 w-16 rounded-full mt-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                <div className="h-2 rounded-full w-5/6" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <div className="h-2 rounded-full w-4/6" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="w-16 h-7 rounded-full" style={{ background: 'rgba(44,64,85,0.6)' }} />
              </div>
            </motion.div>
          )}

          {/* Final CTA */}
          {slide.final && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.35 }}
              whileTap={{ scale: 0.96 }}
              onClick={complete}
              className="mt-10 font-bold text-base rounded-full px-10 py-4"
              style={{ background: '#2C4055', color: '#FFFFFF' }}
            >
              Get Started
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav — all slides except last */}
      {!slide.final && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 pb-10"
          style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))' }}
        >
          {/* Skip */}
          <button
            onClick={complete}
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.4)', minWidth: 48 }}
          >
            Skip
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === current ? 8 : 6,
                  height: i === current ? 8 : 6,
                  background: i === current ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.3)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-full"
              />
            ))}
          </div>

          {/* Next */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goNext}
            className="text-sm font-medium rounded-full px-5 py-2"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', minWidth: 72 }}
          >
            Next →
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
