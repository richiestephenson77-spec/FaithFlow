import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, CloudRain, Flame, EyeOff, User, Shield, Sun, Layers, ArrowLeft, BookOpen, X } from 'lucide-react';
import { FEELINGS, VERSES } from '../data/feelingsVerses';

const ICONS = { Wind, CloudRain, Flame, EyeOff, User, Shield, Sun, Layers };

export default function Feelings() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const verses = selected ? VERSES[selected.id] : [];

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} aria-label="Back" className="w-9 h-9 flex items-center justify-center">
          <ArrowLeft size={20} strokeWidth={1.8} color="#262626" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-[17px] text-gray-900">How are you feeling?</h2>
          {selected && (
            <p className="text-[12px] text-[#8E8E8E] leading-tight">{selected.label}</p>
          )}
        </div>
        {selected && (
          <button onClick={() => setSelected(null)} aria-label="Clear selection" className="w-9 h-9 flex items-center justify-center">
            <X size={18} strokeWidth={1.8} color="#8E8E8E" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-[13px] text-[#8E8E8E] px-5 pt-5 pb-3">
              Tap how you're feeling right now — we'll find a verse for you.
            </p>
            <div className="grid grid-cols-2 gap-3 px-4">
              {FEELINGS.map(f => {
                const Icon = ICONS[f.icon];
                return (
                  <motion.button
                    key={f.id}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={() => setSelected(f)}
                    className="bg-white rounded-2xl px-4 py-5 flex items-center gap-3 text-left shadow-sm border border-gray-100"
                  >
                    <Icon size={22} strokeWidth={1.5} color="#262626" />
                    <span className="font-semibold text-[15px] text-[#262626]">{f.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-5 space-y-3"
          >
            {verses.map((v, i) => (
              <VerseCard key={i} verse={v} feeling={selected} navigate={navigate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerseCard({ verse, feeling, navigate }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={13} strokeWidth={1.8} color="#0A0A0A" />
        <span className="text-[12px] font-bold text-[#0A0A0A] uppercase tracking-wide">{verse.ref}</span>
      </div>
      <p className="text-[15px] text-gray-900 font-medium leading-relaxed mb-3">
        "{verse.text}"
      </p>
      <p className="text-[13px] text-[#8E8E8E] leading-relaxed mb-4">
        {verse.reflection}
      </p>
      <button
        onClick={() => navigate('/prayer', { state: { openNewRequest: true, prefillBody: `Feeling ${feeling.label.toLowerCase()}. "${verse.text}" — ${verse.ref}` } })}
        className="w-full py-3 rounded-xl font-semibold text-[14px] text-white"
        style={{ background: '#2C4055' }}
      >
        Pray about this
      </button>
    </div>
  );
}
