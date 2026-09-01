// Static content-encoding tokens for LUPG Presentation Mode.
//
// Chrome colors, font families, and the generic chart palette live in the
// `usePresPalette()` hook (see ./use-pres-palette.ts) — they're palette-aware
// and resolved at runtime from CSS custom properties.
//
// Sensus category colors use six tonal steps from the active palette. The
// kategori order stays stable while the treatment belongs to the slide theme.

type SensusCode = 'GPN_A' | 'GPN_B' | 'AR' | 'APR' | 'ACR' | 'PAUD'
type PresentationPalette = 'modern-natural' | 'anthropic-claude' | 'sage-green'

const SENSUS_CATEGORY_COLORS: Record<
  PresentationPalette,
  Record<SensusCode, string>
> = {
  'sage-green': {
    PAUD: '#2f4a2c',
    ACR: '#45643f',
    APR: '#62835b',
    AR: '#81a477',
    GPN_A: '#a8c399',
    GPN_B: '#cadbbf',
  },
  'anthropic-claude': {
    PAUD: '#843d25',
    ACR: '#ad552f',
    APR: '#be6a46',
    AR: '#d18462',
    GPN_A: '#d7d0b4',
    GPN_B: '#e4dfca',
  },
  'modern-natural': {
    PAUD: '#101246',
    ACR: '#1d1e5a',
    APR: '#2f3e8f',
    AR: '#4b6cb7',
    GPN_A: '#7b9cd6',
    GPN_B: '#b9cde5',
  },
} as const

export function getSensusColor(
  code: SensusCode,
  palette: PresentationPalette
): string {
  return SENSUS_CATEGORY_COLORS[palette][code]
}

// Stack order for the desa stacked bar (bottom-to-top: youngest → oldest, PAUD → GPN B)
export const SENSUS_STACK_ORDER = [
  'PAUD',
  'ACR',
  'APR',
  'AR',
  'GPN_A',
  'GPN_B',
] as const
