import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  CONTENT_DECORATION_KINDS,
  DECORATION_BASES,
  getDecorationSignature,
} from './decoration-selector.mjs'

const overlap = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y
const state = ({ accent, transform, primitives }) =>
  `${accent}:${transform}:${JSON.stringify(primitives)}`
const overlapsEllipse = (bubble, rect) => {
  const x = Math.min(Math.max(bubble.cx, rect.x), rect.x + rect.width)
  const y = Math.min(Math.max(bubble.cy, rect.y), rect.y + rect.height)
  return (
    ((x - bubble.cx) / bubble.rx) ** 2 + ((y - bubble.cy) / bubble.ry) ** 2 < 1
  )
}
const assertSafe = (decoration) => {
  assert.ok(decoration.primitives.length <= 2, 'uses at most two bubbles')
  assert.ok(decoration.primitives.every(({ shape }) => shape === 'bubble'))
  assert.ok(
    decoration.primitives.every(
      ({ opacity }) => opacity >= 0.68 && opacity <= 0.82
    ),
    'bubbles stay visible without becoming solid'
  )
  assert.ok(
    decoration.bounds.every(
      ({ x, y, width, height }) =>
        x + width === 1280 &&
        y === 0 &&
        width >= 140 &&
        height >= 140 &&
        width <= 260 &&
        height <= 260
    ),
    `${decoration.base} must crop at a large safe corner`
  )
  for (const [name, rect] of [
    ['header title', { x: 56, y: 0, width: 844, height: 116 }],
    ['core content', { x: 56, y: 116, width: 1168, height: 534 }],
    ['footer', { x: 56, y: 650, width: 1168, height: 70 }],
  ]) {
    assert.ok(
      decoration.primitives.every((bubble) => !overlapsEllipse(bubble, rect)),
      `${decoration.base} overlaps ${name}`
    )
  }
}

test('selection is deterministic, Swiss-minimal, and safe', () => {
  const deck = Array.from({ length: 340 }, (_, index) =>
    getDecorationSignature(
      `slide-${index}`,
      index + 2,
      CONTENT_DECORATION_KINDS[index % 7]
    )
  )
  assert.deepEqual(
    getDecorationSignature('sensus', 3, 'table'),
    getDecorationSignature('sensus', 3, 'table')
  )
  assert.ok(
    deck.slice(1).every((value, index) => state(value) !== state(deck[index]))
  )
  assert.equal(new Set(deck.map(state)).size, deck.length)
  assert.equal(getDecorationSignature('', 4, 'table').kind, 'minimal')
  deck.forEach(assertSafe)
})

test('catalog contains only distinct corner bubble compositions', () => {
  assert.equal(new Set(CONTENT_DECORATION_KINDS).size, 7)
  assert.deepEqual(DECORATION_BASES, [
    'top-right-a',
    'top-right-b',
    'top-right-c',
    'top-right-d',
  ])
  for (const kind of CONTENT_DECORATION_KINDS) {
    for (let slideNumber = 0; slideNumber < 32; slideNumber++) {
      assertSafe(
        getDecorationSignature(`${kind}-${slideNumber}`, slideNumber, kind)
      )
    }
  }
})

test('large Mustin and photo families have unique rendered corner states', () => {
  for (const [family, kind] of [
    ['mustin', 'editorial'],
    ['dokumentasi', 'photo'],
  ]) {
    const decorations = Array.from({ length: 1000 }, (_, index) =>
      getDecorationSignature(`${family}-${index}`, index + 2, kind)
    )
    assert.equal(new Set(decorations.map(state)).size, decorations.length)
    decorations.forEach(assertSafe)
  }
})

test('surface renders soft, visible bubbles without forbidden motifs', async () => {
  const surface = await readFile(
    new URL('./components/slide-surface.tsx', import.meta.url),
    'utf8'
  )
  assert.match(surface, /<ellipse/)
  assert.match(surface, /color-mix\(in oklch,.* 40%, \$\{p\.bg\}\)/)
  assert.doesNotMatch(
    surface,
    /<path|<line|<circle|Botanical|Dots|shape === 'dots'/
  )
})

test('cover preserves HEAD exactly outside abstract decoration', async () => {
  const cover = await readFile(
    new URL('./components/cover.tsx', import.meta.url),
    'utf8'
  )
  const head = execFileSync(
    'git',
    ['show', 'HEAD:src/features/lupg/recap/presentation/components/cover.tsx'],
    { encoding: 'utf8' }
  )
  const normalized = cover.replace(
    /\s*\{\/\* cover decoration start \*\/\}[\s\S]*?\{\/\* cover decoration end \*\/\}\s*/,
    '\n        '
  )
  assert.equal(normalized.trim(), head.trim())
  assert.match(cover, /rounded-full/)
  assert.match(cover, /grid-cols-6/)
  assert.doesNotMatch(
    cover,
    /leaf|flower|botanical|<path|<line|border-[trblxy]?\b/i
  )
})

test('closing stays byte-for-byte frozen and outside adaptive metadata', async () => {
  const closing = await readFile(
    new URL('./components/closing.tsx', import.meta.url)
  )
  assert.equal(
    createHash('sha256').update(closing).digest('hex'),
    '7c5efaf9b6f64af1c1ef2591806f60ac8927a78d700432e5a03069ed950f8c05'
  )
})
