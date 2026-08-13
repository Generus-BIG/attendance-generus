import { createContext, useContext, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

export type AnimationPreset = 'simple' | 'sleek' | 'corporate' | 'chill'
export type AnimationTrigger = 'both' | 'enter' | 'exit'

interface AnimationContextProps {
  preset: AnimationPreset
  trigger: AnimationTrigger
  durationScale: number
  reduceMotion: boolean
}

const AnimationContext = createContext<AnimationContextProps | undefined>(
  undefined
)

export function AnimationProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <AnimationContext.Provider
      value={{
        preset: 'sleek',
        trigger: 'both',
        durationScale: 1,
        reduceMotion,
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
