import { createContext, useContext, useMemo, useState } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
export type Variant = 'inset' | 'sidebar' | 'floating'

// Cookie constants following the pattern from sidebar.tsx
const LAYOUT_COLLAPSIBLE_COOKIE_NAME = 'layout_collapsible'
const LAYOUT_VARIANT_COOKIE_NAME = 'layout_variant'
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Default values
const DEFAULT_VARIANT = 'inset'
const DEFAULT_COLLAPSIBLE = 'icon'

type LayoutContextType = {
  resetLayout: () => void

  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void

  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(() => {
    const saved = getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME)
    return (saved as Collapsible) || DEFAULT_COLLAPSIBLE
  })

  const [variant, _setVariant] = useState<Variant>(() => {
    const saved = getCookie(LAYOUT_VARIANT_COOKIE_NAME)
    return (saved as Variant) || DEFAULT_VARIANT
  })

  const contextValue = useMemo<LayoutContextType>(
    () => ({
      resetLayout: () => {
        _setCollapsible(DEFAULT_COLLAPSIBLE)
        setCookie(
          LAYOUT_COLLAPSIBLE_COOKIE_NAME,
          DEFAULT_COLLAPSIBLE,
          LAYOUT_COOKIE_MAX_AGE
        )
        _setVariant(DEFAULT_VARIANT)
        setCookie(
          LAYOUT_VARIANT_COOKIE_NAME,
          DEFAULT_VARIANT,
          LAYOUT_COOKIE_MAX_AGE
        )
      },
      defaultCollapsible: DEFAULT_COLLAPSIBLE,
      collapsible,
      setCollapsible: (newCollapsible: Collapsible) => {
        _setCollapsible(newCollapsible)
        setCookie(
          LAYOUT_COLLAPSIBLE_COOKIE_NAME,
          newCollapsible,
          LAYOUT_COOKIE_MAX_AGE
        )
      },
      defaultVariant: DEFAULT_VARIANT,
      variant,
      setVariant: (newVariant: Variant) => {
        _setVariant(newVariant)
        setCookie(LAYOUT_VARIANT_COOKIE_NAME, newVariant, LAYOUT_COOKIE_MAX_AGE)
      },
    }),
    [collapsible, variant]
  )

  return <LayoutContext value={contextValue}>{children}</LayoutContext>
}

// Define the hook for the provider

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
