import { createContext, useContext, useState, type ReactNode } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'

export type AnimationPreset = 'simple' | 'sleek' | 'corporate' | 'chill'
export type AnimationTrigger = 'both' | 'enter' | 'exit'

interface AnimationContextProps {
  preset: AnimationPreset
  setPreset: (preset: AnimationPreset) => void
  trigger: AnimationTrigger
  setTrigger: (trigger: AnimationTrigger) => void
  speed: number
  setSpeed: (speed: number) => void
  durationScale: number
}

const AnimationContext = createContext<AnimationContextProps | undefined>(
  undefined
)

const VALID_PRESETS: AnimationPreset[] = [
  'simple',
  'sleek',
  'corporate',
  'chill',
]
const VALID_TRIGGERS: AnimationTrigger[] = ['both', 'enter', 'exit']

function isValidPreset(value: unknown): value is AnimationPreset {
  return (
    typeof value === 'string' &&
    VALID_PRESETS.includes(value as AnimationPreset)
  )
}

function isValidTrigger(value: unknown): value is AnimationTrigger {
  return (
    typeof value === 'string' &&
    VALID_TRIGGERS.includes(value as AnimationTrigger)
  )
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [preset, _setPreset] = useState<AnimationPreset>(() => {
    const stored = getCookie('pres-preset')
    return isValidPreset(stored) ? stored : 'sleek'
  })
  const [trigger, _setTrigger] = useState<AnimationTrigger>(() => {
    const stored = getCookie('pres-trigger')
    return isValidTrigger(stored) ? stored : 'both'
  })
  const [speed, _setSpeed] = useState<number>(() => {
    const stored = getCookie('pres-speed')
    if (stored) {
      const parsed = parseFloat(stored)
      if (Number.isFinite(parsed) && parsed >= 0.25 && parsed <= 3.0) {
        return parsed
      }
    }
    return 1.0
  })

  const setPreset = (next: AnimationPreset) => {
    setCookie('pres-preset', next, COOKIE_MAX_AGE)
    _setPreset(next)
  }

  const setTrigger = (next: AnimationTrigger) => {
    setCookie('pres-trigger', next, COOKIE_MAX_AGE)
    _setTrigger(next)
  }

  const setSpeed = (next: number) => {
    setCookie('pres-speed', String(next), COOKIE_MAX_AGE)
    _setSpeed(next)
  }

  // Derived: higher speed means smaller durationScale (faster transitions)
  const durationScale = 1 / speed

  return (
    <AnimationContext.Provider
      value={{
        preset,
        setPreset,
        trigger,
        setTrigger,
        speed,
        setSpeed,
        durationScale,
      }}
    >
      {children}
    </AnimationContext.Provider>
  )
}

export function usePresentationAnimation() {
  const context = useContext(AnimationContext)
  if (!context) {
    throw new Error(
      'usePresentationAnimation must be used within AnimationProvider'
    )
  }
  return context
}
