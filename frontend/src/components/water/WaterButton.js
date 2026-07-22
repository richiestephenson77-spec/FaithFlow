import { motion } from 'framer-motion';
import { WATER_GOLD, WATER_NEUTRAL } from '../../styles/waterTokens';

const SPRING = { type: 'spring', stiffness: 400, damping: 20 };

// Flat button: primary = solid terracotta / white text; secondary = white / dark ink.
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
        borderRadius: 14,
        border: token.border,
        background: token.background,
        boxShadow: token.boxShadow,
        color: variant === 'primary' ? '#FFFFFF' : '#0A0A0A',
        fontWeight: 600,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
