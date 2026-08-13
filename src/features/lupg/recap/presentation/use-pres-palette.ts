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

const fontSans = 'Geist, Inter, system-ui, sans-serif'
const fontMono = '"Geist Mono", ui-monospace, monospace'

function fallback(): PresPalette {
  return {
    bg: 'oklch(0.984 0.003 247.858)',
    ink: 'oklch(0.208 0.042 265.755)',
    primary: 'oklch(0.208 0.042 265.755)',
    primaryFg: 'oklch(0.984 0.003 247.858)',
    accent: 'oklch(0.968 0.007 247.896)',
    brandAccent: 'oklch(0.208 0.042 265.755)',
    muted: 'oklch(0.554 0.046 257.417)',
    rule: 'oklch(0.829 0.013 255.508)',
    cream: 'oklch(0.95 0.007 247.896)',
    success: 'oklch(0.55 0.14 150)',
    warning: 'oklch(0.67 0.15 75)',
    chart: ['#315a7d', '#3b8c78', '#c2643d', '#79589f', '#b84d4d'],
    fontSans,
    fontMono,
    fontSerif: fontSans,
  }
}

function readTokens(): PresPalette {
  if (typeof window === 'undefined') return fallback()

  const styles = getComputedStyle(document.documentElement)
  const get = (key: TokenKey) => styles.getPropertyValue(key).trim()
  const defaults = fallback()
  const bg = get('--background') || defaults.bg
  const accent = get('--accent') || defaults.accent

  return {
    bg,
    ink: get('--foreground') || defaults.ink,
    primary: get('--primary') || defaults.primary,
    primaryFg: get('--primary-foreground') || defaults.primaryFg,
    accent,
    brandAccent: get('--brand-accent') || defaults.brandAccent,
    muted: get('--muted-foreground') || defaults.muted,
    rule: get('--border') || defaults.rule,
    cream: `color-mix(in oklch, ${accent} 14%, ${bg})`,
    success: get('--success') || defaults.success,
    warning: get('--warning') || defaults.warning,
    chart: [
      get('--chart-1') || defaults.chart[0],
      get('--chart-2') || defaults.chart[1],
      get('--chart-3') || defaults.chart[2],
      get('--chart-4') || defaults.chart[3],
      get('--chart-5') || defaults.chart[4],
    ],
    fontSans,
    fontMono,
    fontSerif: fontSans,
  }
}

export function usePresPalette(): PresPalette {
  const [palette, setPalette] = useState(readTokens)

  useEffect(() => {
    const update = () => setPalette(readTokens())
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-palette', 'class'],
    })
    return () => observer.disconnect()
  }, [])

  return palette
}
