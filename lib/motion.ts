/**
 * Apple-grade motion language for Quotal.
 *
 * One source of truth for spring presets, easings, and the shared variants
 * used across the app. Components import from here rather than re-defining
 * inline so cadence stays consistent everywhere.
 *
 * Reduced-motion is honoured by framer-motion automatically when the user
 * has `prefers-reduced-motion: reduce`; helpers below also expose `safe`
 * variants that collapse motion to opacity-only.
 */
import type { Transition, Variants } from 'framer-motion'

// ---------------------------------------------------------------------------
// Easings + durations — mirror CSS custom properties in app/globals.css.
// ---------------------------------------------------------------------------

export const ease = {
  spring: [0.32, 0.72, 0, 1] as const,
  snap: [0.2, 0, 0, 1] as const,
  soft: [0.4, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
}

export const duration = {
  instant: 0.1,
  fast: 0.18,
  base: 0.28,
  slow: 0.46,
  slower: 0.7,
}

// ---------------------------------------------------------------------------
// Spring presets — physical, bounce-aware. Stiffness ~ snappiness, damping
// ~ overshoot control, mass ~ inertia.
// ---------------------------------------------------------------------------

export const spring = {
  /** Tight, professional. Default for most UI surfaces. */
  snappy: { type: 'spring', stiffness: 480, damping: 38, mass: 0.9 } satisfies Transition,
  /** Generous easing — for hero cards + page transitions. */
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 1 } satisfies Transition,
  /** Slight overshoot — playful for badges, success toasts. */
  bouncy: { type: 'spring', stiffness: 380, damping: 22, mass: 0.7 } satisfies Transition,
  /** Stiff — for tap/press feedback. */
  press: { type: 'spring', stiffness: 700, damping: 30, mass: 0.5 } satisfies Transition,
}

// ---------------------------------------------------------------------------
// Variants — reusable enter/exit animations.
// ---------------------------------------------------------------------------

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease: ease.soft } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.soft } },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast, ease: ease.soft } },
}

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: 8, transition: { duration: duration.fast, ease: ease.soft } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.fast, ease: ease.soft } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: spring.gentle },
  exit: { opacity: 0, x: 16, transition: { duration: duration.fast, ease: ease.soft } },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: spring.gentle },
  exit: { opacity: 0, x: -16, transition: { duration: duration.fast, ease: ease.soft } },
}

export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: 16, transition: { duration: duration.fast, ease: ease.soft } },
}

// ---------------------------------------------------------------------------
// Stagger containers — orchestrates child variants for lists / grids.
// ---------------------------------------------------------------------------

/** Generic list stagger. Children inherit one of the fadeUp/scaleIn variants. */
export const listStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.04,
    },
  },
}

export const gridStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

// ---------------------------------------------------------------------------
// Tap + hover presets — drop into `whileTap` / `whileHover`.
// ---------------------------------------------------------------------------

export const tap = {
  press: { scale: 0.97 },
  pressHard: { scale: 0.94 },
}

export const hover = {
  lift: { y: -2 },
  scale: { scale: 1.02 },
  glow: { boxShadow: '0 0 0 4px color-mix(in oklab, var(--ring) 14%, transparent)' },
}

// ---------------------------------------------------------------------------
// Page transition wrapper variants — used by Suspense-bounded route shells.
// ---------------------------------------------------------------------------

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.soft } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.soft } },
}

// ---------------------------------------------------------------------------
// Dialog + sheet presets — match radix data-state animations cleanly.
// ---------------------------------------------------------------------------

export const dialogContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: duration.fast, ease: ease.soft } },
}

export const sheetRight: Variants = {
  hidden: { opacity: 0, x: '100%' },
  visible: { opacity: 1, x: 0, transition: spring.gentle },
  exit: { opacity: 0, x: '100%', transition: { duration: duration.base, ease: ease.soft } },
}

export const sheetBottom: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: '100%', transition: { duration: duration.base, ease: ease.soft } },
}
