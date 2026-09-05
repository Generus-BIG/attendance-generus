export declare const CONTENT_DECORATION_KINDS: readonly [
  'table',
  'split',
  'chart',
  'cards',
  'editorial',
  'photo',
  'minimal',
]
export type DecorationKind = (typeof CONTENT_DECORATION_KINDS)[number]
export declare const DECORATION_BASES: readonly [
  'top-right-a',
  'top-right-b',
  'top-right-c',
  'top-right-d',
]
export type DecorationBase = (typeof DECORATION_BASES)[number]
type Rect = { x: number; y: number; width: number; height: number }
export type DecorationPrimitive = {
  shape: 'bubble'
  cx: number
  cy: number
  rx: number
  ry: number
  opacity: number
  bounds: Rect
}
export interface DecorationSignature {
  kind: DecorationKind
  base: DecorationBase
  mirror: boolean
  accent: number
  transform: string
  bounds: Rect[]
  primitives: readonly DecorationPrimitive[]
}
export declare function getDecorationSignature(
  slideKey: string,
  slideNumber: number,
  decorationKind: DecorationKind
): DecorationSignature
