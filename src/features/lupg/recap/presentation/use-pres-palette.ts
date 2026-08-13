// Presentation must remain stable across user-selected app palettes. Charts
// need concrete colors because their SVG props cannot resolve CSS variables.
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

const presentationPalette: PresPalette = {
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
  chart: [
    'oklch(0.398 0.07 227.392)',
    'oklch(0.6 0.118 184.704)',
    'oklch(0.646 0.222 41.116)',
    'oklch(0.58 0.13 300)',
    'oklch(0.577 0.245 27.325)',
  ],
  fontSans: 'Geist, Inter, system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, monospace',
  fontSerif: 'Geist, Inter, system-ui, sans-serif',
}

export function usePresPalette(): PresPalette {
  return presentationPalette
}
