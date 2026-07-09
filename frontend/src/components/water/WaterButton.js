import { motion } from 'framer-motion';
import { WATER_GOLD, WATER_NEUTRAL } from '../../styles/waterTokens';

const SPRING = { type: 'spring', stiffness: 400, damping: 20 };

export default function WaterButton({
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  style = {},
  children,
}) {
  const token = variant === 'primary' ? WATER_GOLD : WATER_NEUTRAL;

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={SPRING}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        border: token.border,
        background: token.background,
        boxShadow: token.boxShadow,
        color: variant === 'primary' ? '#6B2A16' : '#163449',
        fontWeight: 600,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '-25%', left: '-15%',
          width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
}
