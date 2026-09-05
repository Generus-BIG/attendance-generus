import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mustinRenderer = readFileSync(
  new URL('./slide-renderers/render-mustin.tsx', import.meta.url),
  'utf8'
)
const player = readFileSync(new URL('./player.tsx', import.meta.url), 'utf8')

test('auto-scroll accumulates fractional movement at 15 px/s', () => {
  assert.match(mustinRenderer, /scrollTopRef\.current \+=/)
  assert.doesNotMatch(
    mustinRenderer,
    /container\.scrollTop \+ \(AUTO_SCROLL_SPEED/
  )
})

test('auto-scroll exposes speed controls and follows manual scroll position', () => {
  assert.match(mustinRenderer, /min='5'/)
  assert.match(mustinRenderer, /max='60'/)
  assert.match(mustinRenderer, /onScroll=\{\(event\) => \{/)
  assert.match(mustinRenderer, /scrollTopRef\.current = scrollTop/)
  assert.match(mustinRenderer, /lastAutoScrollTopRef\.current/)
  assert.match(mustinRenderer, /group\/controls/)
  assert.match(mustinRenderer, /focus-within:opacity-100/)
  assert.match(mustinRenderer, /flex h-full min-h-0 items-center gap-3/)
  assert.match(player, /isMustinSlide/)
  assert.match(player, /lupg:mustin-toggle-autoscroll/)
})

test('Resume Mustin creates one slide for every selected kelompok', async () => {
  const vite = await createServer({
    appType: 'custom',
    server: { middlewareMode: true },
  })

  try {
    const { buildSlides } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slides.tsx'
    )
    const slides = buildSlides({
      monthKey: '2026-09',
      kelompokList: [
        { id: 'kelompok-a', value: 'Kelompok A' },
        { id: 'kelompok-b', value: 'Kelompok B' },
      ],
      reports: [],
      programs: [],
      metrics: [],
      sarprasItems: [],
      sensusCells: [],
      programReports: [],
      metricReports: [],
      sarprasReports: [],
      shodaqohRows: [],
      mustinRows: [],
      mustinTemplates: [],
    })

    assert.deepEqual(
      slides
        .filter((slide) => slide.key.startsWith('mustin-'))
        .map((slide) => slide.key),
      ['mustin-kelompok-a', 'mustin-kelompok-b']
    )
  } finally {
    await vite.close()
  }
})
