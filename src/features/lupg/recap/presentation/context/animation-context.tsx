import { createContext, useContext, useState, type ReactNode } from 'react'

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

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<AnimationPreset>('sleek')
  const [trigger, setTrigger] = useState<AnimationTrigger>('both')
  const [speed, setSpeed] = useState<number>(1.0)

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
