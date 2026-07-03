import { type ReactNode } from 'react'
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion'
import {
  usePresentationAnimation,
  type AnimationPreset,
  type AnimationTrigger,
} from '../context/animation-context'

interface WrapperProps {
  children?: ReactNode
  className?: string
  style?: React.CSSProperties
}

// Staggered Container
export function AnimateContainer({ children, className, style }: WrapperProps) {
  const { preset, trigger, durationScale } = usePresentationAnimation()

  const transition = getStaggerTransition(preset)

  const variants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: transition.staggerEnter * durationScale,
      },
    },
    exit: {
      transition: {
        staggerChildren: transition.staggerExit * durationScale,
        staggerDirection: -1 as const,
      },
    },
  }

  return (
    <motion.div
      initial={trigger === 'exit' ? 'visible' : 'hidden'}
      animate='visible'
      exit={trigger === 'enter' ? 'visible' : 'exit'}
      variants={variants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

// Individual Animated Item
export function AnimateItem({ children, className, style }: WrapperProps) {
  const { preset, trigger, durationScale } = usePresentationAnimation()

  const config = getAnimationConfig(preset, trigger, durationScale)

  return (
    <motion.div
      variants={config.variants}
      transition={config.transition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

// Animated Table Row Component
export function AnimateTableRow({ children, className, style, ...props }: HTMLMotionProps<'tr'>) {
  const { preset, trigger, durationScale } = usePresentationAnimation()

  const config = getAnimationConfig(preset, trigger, durationScale)

  return (
    <motion.tr
      variants={config.variants}
      transition={config.transition}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.tr>
  )
}


// Preset-specific timing/stagger parameters
/**
 * Resolves the stagger timings (in seconds) for entry and exit animations
 * based on the selected transition preset.
 * 
 * @param preset - The active animation configuration preset
 * @returns Object containing stagger timings for enter and exit animations
 */
function getStaggerTransition(preset: AnimationPreset) {
  switch (preset) {
    case 'simple':
      return { staggerEnter: 0.04, staggerExit: 0.02 }
    case 'corporate':
      return { staggerEnter: 0.05, staggerExit: 0.03 }
    case 'chill':
      return { staggerEnter: 0.08, staggerExit: 0.05 }
    case 'sleek':
    default:
      return { staggerEnter: 0.06, staggerExit: 0.04 }
  }
}

/**
 * Builds the Framer Motion variants and transition parameters (duration, easing bezier)
 * based on the active preset, active trigger boundary, and speed duration scale.
 * 
 * @param preset - The active animation configuration preset
 * @param trigger - The trigger boundaries configuration ('both' | 'enter' | 'exit')
 * @param scale - The duration scale factor (1 / speed)
 * @returns Framer Motion configuration details
 */
function getAnimationConfig(
  preset: AnimationPreset,
  trigger: AnimationTrigger,
  scale: number
) {
  const isEnterActive = trigger === 'both' || trigger === 'enter'
  const isExitActive = trigger === 'both' || trigger === 'exit'

  // Variant definitions
  let hidden = {}
  const visible = { opacity: 1, x: 0, y: 0, scale: 1 }
  let exit = {}

  let enterTrans = {}
  let exitTrans = {}

  switch (preset) {
    case 'simple':
      hidden = isEnterActive ? { opacity: 0, y: 15 } : visible
      exit = isExitActive ? { opacity: 0, y: -15 } : visible
      enterTrans = { duration: 0.25 * scale, ease: 'easeOut' }
      exitTrans = { duration: 0.18 * scale, ease: 'easeIn' }
      break

    case 'corporate':
      hidden = isEnterActive ? { opacity: 0, x: -30 } : visible
      exit = isExitActive ? { opacity: 0, x: 30 } : visible
      enterTrans = { duration: 0.28 * scale, ease: [0.2, 0, 0, 1] }
      exitTrans = { duration: 0.2 * scale, ease: [0.2, 0, 0, 1] }
      break

    case 'chill':
      hidden = isEnterActive ? { opacity: 0, y: 35 } : visible
      exit = isExitActive ? { opacity: 0, y: -35 } : visible
      enterTrans = { duration: 0.6 * scale, ease: 'easeInOut' }
      exitTrans = { duration: 0.45 * scale, ease: 'easeInOut' }
      break

    case 'sleek':
    default:
      hidden = isEnterActive ? { opacity: 0, scale: 0.96, y: 25 } : visible
      exit = isExitActive ? { opacity: 0, scale: 0.96, y: -25 } : visible
      enterTrans = { duration: 0.45 * scale, ease: [0.4, 0, 0.2, 1] }
      exitTrans = { duration: 0.35 * scale, ease: [0.4, 0, 0.2, 1] }
      break
  }

  const variants: Variants = {
    hidden,
    visible,
    exit,
  }

  // Combined transition that dispatches based on active variant
  const transition = {
    variants: {
      visible: enterTrans,
      exit: exitTrans,
    },
  }

  return { variants, transition }
}

