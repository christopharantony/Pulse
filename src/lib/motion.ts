import type { Variants } from 'framer-motion';

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const durations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.35,
} as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.base, ease: easeOutExpo } },
  exit: { opacity: 0, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easeOutExpo },
  },
  exit: { opacity: 0, y: 8, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.fast, ease: easeOutExpo },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const slideInFromLeft: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { duration: durations.slow, ease: easeOutExpo } },
  exit: { x: '-100%', transition: { duration: durations.base, ease: easeOutExpo } },
};

export const slideInFromRight: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: durations.slow, ease: easeOutExpo } },
  exit: { x: '100%', transition: { duration: durations.base, ease: easeOutExpo } },
};

export const dropdownMotion: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.fast, ease: easeOutExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: durations.fast, ease: easeOutExpo },
  },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.base, ease: easeOutExpo } },
  exit: { opacity: 0, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const sidebarWidth: Variants = {
  expanded: { width: 260, transition: { duration: durations.slow, ease: easeOutExpo } },
  collapsed: { width: 76, transition: { duration: durations.slow, ease: easeOutExpo } },
};

export const cardHover = {
  rest: { y: 0 },
  hover: { y: -2, transition: { duration: durations.fast, ease: easeOutExpo } },
};

export const buttonTap = {
  scale: 0.98,
};
