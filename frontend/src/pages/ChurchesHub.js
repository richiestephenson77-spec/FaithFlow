import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import FindChurches from './FindChurches';
import Churches from './Churches';

const TABS = [
  { id: 'near', label: '🌍 Near Me' },
  { id: 'community', label: '⛪ Community' },
];

export default function ChurchesHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('near');

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={22} color="#111827" strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Churches</h2>
            <p className="text-xs text-gray-400">Find local · Join community</p>
          </div>
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-full p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 text-sm font-semibold py-2 rounded-full transition-colors"
              style={{
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#111827' : '#9ca3af',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'near' ? <FindChurches embedded /> : <Churches embedded />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
