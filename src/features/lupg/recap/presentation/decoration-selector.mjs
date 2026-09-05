export const CONTENT_DECORATION_KINDS = [
  'table',
  'split',
  'chart',
  'cards',
  'editorial',
  'photo',
  'minimal',
]

export const DECORATION_BASES = [
  'top-right-a',
  'top-right-b',
  'top-right-c',
  'top-right-d',
]

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function bubble(size, secondary, shape) {
  const width = 140 + ((size + shape * 29) % 121)
  const height = 140 + ((size * (secondary ? 7 : 11) + shape * 53) % 121)
  const ry = height * 2
  const atTop = Math.sqrt(0.75)
  const atContent = Math.sqrt(1 - ((height + 116) / ry) ** 2)
  const rx = (1225 - (1280 - width)) / (atTop - atContent)
  const cx = 1280 - width + atTop * rx
  return {
    shape: 'bubble',
    cx,
    cy: -height,
    rx,
    ry,
    opacity: 0.7 + (size % 5) * 0.02,
    bounds: { x: 1280 - width, y: 0, width, height },
  }
}

export function getDecorationSignature(slideKey, slideNumber, decorationKind) {
  const kind = slideKey ? decorationKind : 'minimal'
  const safeNumber = Number.isFinite(slideNumber)
    ? Math.max(0, Math.floor(slideNumber))
    : 0
  const base = DECORATION_BASES[safeNumber % DECORATION_BASES.length]
  const variant = Math.floor(safeNumber / DECORATION_BASES.length)
  const hash = hashString(`${slideKey}|${kind}`)
  const accent = hash % 3
  const shape = safeNumber % DECORATION_BASES.length
  const primitives = [
    bubble(variant % 121, false, shape),
    bubble(Math.floor(variant / 121) % 121, true, shape),
  ]

  return {
    kind,
    base,
    mirror: true,
    accent,
    transform: 'translate(0 0)',
    bounds: primitives.map(({ bounds }) => bounds),
    primitives,
  }
}
