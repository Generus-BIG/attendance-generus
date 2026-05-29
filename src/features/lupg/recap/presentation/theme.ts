// Static content-encoding tokens for LUPG Presentation Mode.
//
// Chrome colors, font families, and the generic chart palette live in the
// `usePresPalette()` hook (see ./use-pres-palette.ts) — they're palette-aware
// and resolved at runtime from CSS custom properties.
//
// Only canonical category content-colors stay here as fixed hex literals:
// the kategori → color mapping is content (the eye learns it across slides),
// not chrome.

// Canonical Sensus kategori palette — fixed across all 3 product palettes
// because the mapping IS the data. Same colors used in pie + stacked bar.
export const SENSUS_CATEGORY_COLORS = {
  GPN_A: '#fbcf3a', // yellow
  GPN_B: '#a3d977', // light green
  AR: '#5cb85c', // medium green
  APR: '#3a9943', // dark green
  ACR: '#1f7a30', // darkest green
} as const

// Stack order for the desa stacked bar (bottom-to-top: youngest → oldest, ACR → GPN B)
export const SENSUS_STACK_ORDER = ['ACR', 'APR', 'AR', 'GPN_A', 'GPN_B'] as const
