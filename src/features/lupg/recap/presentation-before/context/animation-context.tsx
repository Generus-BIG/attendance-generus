import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'framer-motion'
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
  reduceMotion: boolean
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
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

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

export function AnimationProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false
  const [preset, setPresetState] = useState<AnimationPreset>(() => {
    const stored = getCookie('pres-preset')
    return isValidPreset(stored) ? stored : 'sleek'
  })
  const [trigger, setTriggerState] = useState<AnimationTrigger>(() => {
    const stored = getCookie('pres-trigger')
    return isValidTrigger(stored) ? stored : 'both'
  })
  const [speed, setSpeedState] = useState(() => {
    const parsed = Number(getCookie('pres-speed'))
    return Number.isFinite(parsed) && parsed >= 0.25 && parsed <= 3 ? parsed : 1
  })

  const value = useMemo(
    () => ({
      preset,
      setPreset: (next: AnimationPreset) => {
        setCookie('pres-preset', next, COOKIE_MAX_AGE)
        setPresetState(next)
      },
      trigger,
      setTrigger: (next: AnimationTrigger) => {
        setCookie('pres-trigger', next, COOKIE_MAX_AGE)
        setTriggerState(next)
      },
      speed,
      setSpeed: (next: number) => {
        setCookie('pres-speed', String(next), COOKIE_MAX_AGE)
        setSpeedState(next)
      },
      durationScale: 1 / speed,
      reduceMotion,
    }),
    [preset, trigger, speed, reduceMotion]
  )

  return (
    <AnimationContext.Provider value={value}>
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
