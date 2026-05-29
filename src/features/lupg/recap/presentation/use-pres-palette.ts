// Resolves the active palette + dark-mode tokens at runtime so chart
// components (which can't read CSS vars in Recharts SVG props) get concrete
// color strings. Re-resolves when `data-palette` or `.dark` change.
//
// TYPOGRAPHY EXCEPTION: fontSans/fontMono/fontSerif are pinned to the
// Sage Green palette's font stack across ALL palettes. Rationale: the deck's
// typographic personality should not flip when the active palette changes; the
// Sage Green stack reads best at projector distance. See
// docs/superpowers/specs/2026-05-18-lupg-presentation-final-polish-design.md
// section P0-6.
import { useEffect, useState } from 'react'

export interface PresPalette {
  bg: string
  ink: string
  primary: string
  primaryFg: string
  accent: string
  brandAccent: string
  muted: string
  rule: string
  cream: string
  success: string
  warning: string
  chart: readonly [string, string, string, string, string]
  fontSans: string
  fontMono: string
  fontSerif: string
}

type TokenKey =
  | '--background'
  | '--foreground'
  | '--primary'
  | '--primary-foreground'
  | '--accent'
  | '--brand-accent'
  | '--muted-foreground'
  | '--border'
  | '--success'
  | '--warning'
  | '--chart-1'
  | '--chart-2'
  | '--chart-3'
  | '--chart-4'
  | '--chart-5'

// Pinned across all palettes — see file header.
const PINNED_FONT_SANS =
  '"Plus Jakarta Sans", Geist, system-ui, sans-serif'
const PINNED_FONT_MONO =
  '"IBM Plex Mono", "Geist Mono", ui-monospace, monospace'
const PINNED_FONT_SERIF = 'Lora, Georgia, serif'

function readTokens(): PresPalette {
  if (typeof window === 'undefined') {
    return defaultFallback()
  }
  const styles = getComputedStyle(document.documentElement)
  const get = (k: TokenKey) => styles.getPropertyValue(k).trim()

  const accent = get('--accent') || '#f5b800'
  const bg = get('--background') || '#ffffff'

  return {
    bg,
    ink: get('--foreground') || '#18181b',
    primary: get('--primary') || '#1e2761',
    primaryFg: get('--primary-foreground') || '#ffffff',
    accent,
    brandAccent: get('--brand-accent') || accent,
    muted: get('--muted-foreground') || '#71717a',
    rule: get('--border') || '#e5e7eb',
    cream: `color-mix(in oklch, ${accent} 14%, ${bg})`,
    success: get('--success') || '#16a34a',
    warning: get('--warning') || '#f59e0b',
    chart: [
      get('--chart-1') || '#1e2761',
      get('--chart-2') || '#f5b800',
      get('--chart-3') || '#5cb85c',
      get('--chart-4') || '#a78bfa',
      get('--chart-5') || '#ef4444',
    ] as const,
    fontSans: PINNED_FONT_SANS,
    fontMono: PINNED_FONT_MONO,
    fontSerif: PINNED_FONT_SERIF,
  }
}

function defaultFallback(): PresPalette {
  return {
    bg: '#ffffff',
    ink: '#18181b',
    primary: '#1e2761',
    primaryFg: '#ffffff',
    accent: '#f5b800',
    brandAccent: '#f5b800',
    muted: '#71717a',
    rule: '#e5e7eb',
    cream: '#fef3c7',
    success: '#16a34a',
    warning: '#f59e0b',
    chart: ['#1e2761', '#f5b800', '#5cb85c', '#a78bfa', '#ef4444'] as const,
    fontSans: PINNED_FONT_SANS,
    fontMono: PINNED_FONT_MONO,
    fontSerif: PINNED_FONT_SERIF,
  }
}

export function usePresPalette(): PresPalette {
  const [palette, setPalette] = useState<PresPalette>(() => readTokens())

  useEffect(() => {
    const update = () => setPalette(readTokens())
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-palette', 'class'],
    })
    return () => observer.disconnect()
  }, [])

  return palette
}
