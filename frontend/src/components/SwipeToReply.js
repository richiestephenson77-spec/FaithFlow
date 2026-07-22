import { useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Reply } from 'lucide-react';
import { hapticLight } from '../utils/haptics';

const THRESHOLD = 56; // px drag before a reply is armed

// Wraps a chat bubble so dragging it horizontally (either direction) triggers a
// reply to that message. A reply icon fades in from the side you drag toward;
// crossing the threshold fires a haptic; releasing past it calls onReply().
// drag="x" + dragSnapToOrigin lets vertical list scroll pass through and snaps
// the bubble back. Taps/long-press on the child still work (framer only starts
// dragging after real horizontal movement).
export default function SwipeToReply({ onReply, disabled = false, children }) {
  const x = useMotionValue(0);
  const armed = useRef(false);

  // Icons on both edges; each fades in with drag in its direction.
  const leftOpacity = useTransform(x, [0, THRESHOLD], [0, 1]);   // dragging right
  const rightOpacity = useTransform(x, [-THRESHOLD, 0], [1, 0]); // dragging left

  if (disabled) return children;

  return (
    <div className="relative">
      <motion.div style={{ opacity: leftOpacity }} className="absolute left-1 inset-y-0 flex items-center pointer-events-none">
        <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(44,64,85,0.1)' }}>
          <Reply size={15} strokeWidth={2} color="#2C4055" />
        </span>
      </motion.div>
      <motion.div style={{ opacity: rightOpacity }} className="absolute right-1 inset-y-0 flex items-center pointer-events-none">
        <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(44,64,85,0.1)' }}>
          <Reply size={15} strokeWidth={2} color="#2C4055" />
        </span>
      </motion.div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: 0, right: 0 }}
        dragSnapToOrigin
        dragElastic={0.7}
        dragDirectionLock
        onDrag={(e, info) => {
          const past = Math.abs(info.offset.x) > THRESHOLD;
          if (past && !armed.current) { armed.current = true; hapticLight(); }
          else if (!past && armed.current) { armed.current = false; }
        }}
        onDragEnd={(e, info) => {
          if (Math.abs(info.offset.x) > THRESHOLD) onReply && onReply();
          armed.current = false;
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
