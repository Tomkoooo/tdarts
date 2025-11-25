import { Variants, Transition } from "framer-motion";

/**
 * Apple Spring Easing
 * Provides natural, bouncy animations similar to iOS
 */
export const appleSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

/**
 * Smooth Spring (less bouncy)
 */
export const smoothSpring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 1,
};

/**
 * Quick Spring (for micro-interactions)
 */
export const quickSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 0.5,
};

/**
 * Liquid In Animation
 * Smooth fade-in with scale and blur
 */
export const liquidIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
  },
};

/**
 * Live Update Animation
 * For scores, counts, and real-time data changes
 * Optimized for mobile performance
 */
export const liveUpdate: Variants = {
  animate: {
    scale: [1, 1.08, 1], // Reduced from 1.15 for better performance
    transition: {
      duration: 0.3, // Reduced from 0.4 for snappier feel
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/**
 * Hover Lift Animation
 * For cards, buttons, and interactive elements
 */
export const hoverLift: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: appleSpring,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: quickSpring,
  },
};

/**
 * Stagger Container
 * For animating lists with staggered children
 */
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Stagger Child
 * Individual item animation for staggered lists
 */
export const staggerChild: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: appleSpring,
  },
};

/**
 * Match Win Celebration
 * For tournament match completions
 */
export const winCelebration: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/**
 * Bracket Path Animation
 * For SVG bracket visualization
 */
export const bracketPath: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/**
 * Slide In From Right
 * For modals, sheets, and side panels
 */
export const slideInRight: Variants = {
  initial: {
    x: "100%",
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: appleSpring,
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: quickSpring,
  },
};

/**
 * Slide In From Bottom
 * For bottom sheets and toasts
 */
export const slideInBottom: Variants = {
  initial: {
    y: "100%",
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: appleSpring,
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: quickSpring,
  },
};

/**
 * Fade In Scale
 * For tooltips and popovers
 */
export const fadeInScale: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: quickSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: quickSpring,
  },
};

/**
 * Pulse Glow
 * For attention-grabbing elements
 */
export const pulseGlow: Variants = {
  animate: {
    boxShadow: [
      "0 0 0px oklch(51% 0.18 16 / 0.5)",
      "0 0 20px oklch(51% 0.18 16 / 0.8)",
      "0 0 0px oklch(51% 0.18 16 / 0.5)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Shake Animation
 * For error states and invalid inputs
 */
export const shake: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

/**
 * Rotate In
 * For icons and decorative elements
 */
export const rotateIn: Variants = {
  initial: {
    opacity: 0,
    rotate: -180,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: appleSpring,
  },
};

/**
 * Page Transition
 * For route changes
 */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

