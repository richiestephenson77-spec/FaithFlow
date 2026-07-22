import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Reusable in-app full-screen image viewer (Instagram/WhatsApp-style).
// Renders a fixed dark backdrop with the image centered. Tap the backdrop or
// the X to close. Never opens a new tab or exposes the raw URL.
//   const [lightbox, setLightbox] = useState(null);
//   <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
export default function ImageLightbox({ src, alt = '', onClose }) {
  // Close on hardware/keyboard back (Esc) and lock body scroll while open.
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute z-10 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ top: 'calc(env(safe-area-inset-top) + 8px)', right: 12, background: 'rgba(255,255,255,0.12)' }}
          >
            <X size={22} color="#fff" strokeWidth={2} />
          </button>

          <motion.img
            key={src}
            src={src}
            alt={alt}
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="select-none"
            style={{ maxWidth: '96vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
