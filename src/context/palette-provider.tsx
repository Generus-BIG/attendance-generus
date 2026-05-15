import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { getDefaultPalette } from '@/lib/app-settings.service'

export type Palette = 'modern-natural' | 'anthropic-claude' | 'sage-green'

const DEFAULT_PALETTE: Palette = 'modern-natural'
const PALETTE_COOKIE_NAME = 'ui-palette'
const PALETTE_SYNC_COOKIE_NAME = 'ui-palette-sync'
const PALETTE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const VALID_PALETTES: readonly Palette[] = [
  'modern-natural',
  'anthropic-claude',
  'sage-green',
] as const

function isValidPalette(value: string | undefined): value is Palette {
  return !!value && (VALID_PALETTES as readonly string[]).includes(value)
}

type PaletteProviderProps = {
  children: React.ReactNode
  defaultPalette?: Palette
  storageKey?: string
}

type PaletteProviderState = {
  defaultPalette: Palette
  palette: Palette
  setPalette: (palette: Palette) => void
  resetPalette: () => void
}

const initialState: PaletteProviderState = {
  defaultPalette: DEFAULT_PALETTE,
  palette: DEFAULT_PALETTE,
  setPalette: () => null,
  resetPalette: () => null,
}

const PaletteContext = createContext<PaletteProviderState>(initialState)

export function PaletteProvider({
  children,
  defaultPalette = DEFAULT_PALETTE,
  storageKey = PALETTE_COOKIE_NAME,
  ...props
}: PaletteProviderProps) {
  const [palette, _setPalette] = useState<Palette>(() => {
    const stored = getCookie(storageKey)
    return isValidPalette(stored) ? stored : defaultPalette
  })

  // Apply the palette to <html> whenever it changes.
  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-palette', palette)
  }, [palette])

  // Sync with server-side default on mount.
  // If the server's default_palette updated_at is newer than the local "last synced" cookie,
  // force-adopt the server's palette (and update the sync marker so we don't re-apply on refresh).
  useEffect(() => {
    let cancelled = false

    const syncWithServer = async () => {
      try {
        const serverDefault = await getDefaultPalette()
        if (cancelled || !serverDefault) return

        const lastSynced = getCookie(PALETTE_SYNC_COOKIE_NAME)
        if (lastSynced === serverDefault.updated_at) return

        _setPalette(serverDefault.palette)
        setCookie(storageKey, serverDefault.palette, PALETTE_COOKIE_MAX_AGE)
        setCookie(
          PALETTE_SYNC_COOKIE_NAME,
          serverDefault.updated_at,
          PALETTE_COOKIE_MAX_AGE
        )
      } catch {
        // Silent — unauthenticated users (e.g. public /absensi form) will
        // hit an RLS / network error. Fall back to the local cookie or default.
      }
    }

    void syncWithServer()
    return () => {
      cancelled = true
    }
  }, [storageKey])

  const setPalette = (next: Palette) => {
    setCookie(storageKey, next, PALETTE_COOKIE_MAX_AGE)
    _setPalette(next)
  }

  const resetPalette = () => {
    removeCookie(storageKey)
    _setPalette(defaultPalette)
  }

  return (
    <PaletteContext
      value={{ defaultPalette, palette, setPalette, resetPalette }}
      {...props}
    >
      {children}
    </PaletteContext>
  )
}

 
export const usePalette = () => {
  const context = useContext(PaletteContext)
  if (!context)
    throw new Error('usePalette must be used within a PaletteProvider')
  return context
}
