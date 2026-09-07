import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('capture charts start with positive dimensions without changing responsive sizing', () => {
  const root = new URL('../', import.meta.url)
  const wrapper = readFileSync(
    new URL('components/presentation-responsive-container.tsx', root),
    'utf8'
  )
  assert.match(wrapper, /useCaptureMode/)
  assert.match(wrapper, /initialDimension=.*width:\s*1,\s*height:\s*1/)
  for (const file of [
    'charts/generus-piket-aggregate-bars.tsx',
    'charts/paired-month-bars.tsx',
    'charts/sarpras-donut.tsx',
    'charts/sarpras-stacked-bar.tsx',
    'charts/sensus-pie.tsx',
    'charts/sensus-stacked-bar.tsx',
    'charts/trend-bar.tsx',
    'slide-renderers/render-shodaqoh.tsx',
  ]) {
    const source = readFileSync(new URL(file, root), 'utf8')
    assert.doesNotMatch(source, /<ResponsiveContainer/)
    assert.match(source, /<PresentationResponsiveContainer/)
  }
})

test('capture expands only toggle views, preserving web slide order', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
  })
  try {
    const { buildSlides } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slides.tsx'
    )
    const data = {
      monthKey: '2026-08',
      kelompokList: [{ id: 'a', value: 'A' }],
      reports: [],
      programs: [{ code: 'GMKM', name: 'GMKM', reporting_style: 'quarterly' }],
      metrics: [],
      sarprasItems: [],
      sensusCells: [],
      programReports: [],
      metricReports: [],
      sarprasReports: [],
      shodaqohRows: [],
      mustinRows: [],
    }
    const web = buildSlides(data)
    const capture = buildSlides(data, { capture: true })
    assert.equal(capture.length, web.length + 2)
    assert.deepEqual(
      capture.filter((s) => s.key.startsWith('sensus')).map((s) => s.key),
      ['sensus-data', 'sensus-analysis']
    )
    assert.deepEqual(
      buildSlides({ ...data, kelompokFilter: 'a' }, { capture: true }).map(
        (s) => s.key
      ),
      buildSlides({ ...data, kelompokFilter: 'a' }).map((s) => s.key)
    )
  } finally {
    await vite.close()
  }
})
