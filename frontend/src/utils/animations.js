export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const fadeUp = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const fadeIn = prefersReducedMotion ? {} : {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
};

export const slideUp = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 40 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

export const slideInRight = prefersReducedMotion ? {} : {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const scaleIn = prefersReducedMotion ? {} : {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

export const staggerContainer = prefersReducedMotion ? {} : {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const staggerContainerFast = prefersReducedMotion ? {} : {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const springTap = prefersReducedMotion ? {} : {
  whileTap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 20 },
};

export const pageTransition = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const sheetVariants = prefersReducedMotion ? {} : {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
};
