import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

const fixture = {
  summary: 'September attendance',
  source: {
    workspace: 'absensi',
    scope: 'All authorized kelompok',
    month: '2026-09',
    route: '/admin/dashboard',
    section: 'Attendance',
  },
  columns: [
    { key: 'month', label: 'Month', format: 'date' },
    { key: 'present', label: 'Present', format: 'number' },
  ],
  rows: [
    { month: '2026-08', present: 12 },
    { month: '2026-09', present: 18 },
  ],
  presentation: {
    kind: 'cartesian',
    chartType: 'line',
    xKey: 'month',
    series: [{ key: 'present', label: 'Present', valueType: 'number' }],
  },
}

test('Data View preserves valid evidence and falls back only for presentation errors', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { parseDataView, dataViewSchema } = await vite.ssrLoadModule(
      '/src/features/assistant/data-view.ts'
    )
    assert.deepEqual(dataViewSchema.parse(fixture), fixture)
    assert.equal(parseDataView(fixture).status, 'complete')
    const brokenChart = {
      ...fixture,
      presentation: { ...fixture.presentation, xKey: 'unknown' },
    }
    assert.equal(dataViewSchema.safeParse(brokenChart).success, false)
    const fallback = parseDataView(brokenChart)
    assert.equal(fallback.status, 'chart-unavailable')
    assert.deepEqual(fallback.data.rows, fixture.rows)
    assert.deepEqual(fallback.data.presentation, { kind: 'table' })
    for (const invalid of [
      { ...fixture, rows: Array(51).fill(fixture.rows[0]) },
      { ...fixture, rows: [{ month: 'x'.repeat(501), present: 1 }] },
      { ...fixture, rows: [{ month: '2026-09', present: 'eighteen' }] },
      {
        ...fixture,
        source: { ...fixture.source, route: 'https://evil.example' },
      },
      { ...fixture, source: { ...fixture.source, workspace: 'lupg' } },
      {
        ...fixture,
        rows: [{ ...fixture.rows[0], secret: 'not a declared column' }],
      },
    ])
      assert.equal(parseDataView(invalid).status, 'validation-error')
    assert.equal(parseDataView({ ...fixture, rows: [] }).status, 'empty')
    assert.equal(
      parseDataView({ ...fixture, rows: [{ month: '2026-02-30', present: 1 }] })
        .status,
      'validation-error'
    )
    assert.equal(
      parseDataView({
        ...fixture,
        rows: [
          { month: '2026-08', present: 1 },
          { month: '2026-09-01', present: 2 },
        ],
      }).status,
      'chart-unavailable'
    )
  } finally {
    await vite.close()
  }
})

test('Data View supports five bounded chart kinds and rejects misleading compositions', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { dataViewSchema, parseDataView } = await vite.ssrLoadModule(
      '/src/features/assistant/data-view.ts'
    )
    for (const chartType of ['bar', 'line', 'area', 'stacked-bar'])
      assert.equal(
        dataViewSchema.safeParse({
          ...fixture,
          presentation: { ...fixture.presentation, chartType },
        }).success,
        true
      )
    const sensus = {
      summary: 'Current sensus',
      source: {
        workspace: 'lupg',
        scope: 'All authorized kelompok',
        route: '/admin/lupg/sensus',
        section: 'Sensus',
      },
      columns: [
        { key: 'category', label: 'Category', format: 'text' },
        { key: 'count', label: 'Count', format: 'number' },
      ],
      rows: [
        { category: 'AR', count: 8 },
        { category: 'APR', count: 12 },
      ],
      presentation: { kind: 'pie', categoryKey: 'category', valueKey: 'count' },
    }
    assert.equal(dataViewSchema.safeParse(sensus).success, true)
    for (const rows of [
      [{ category: 'AR', count: -1 }],
      [{ category: 'AR', count: 0 }],
      Array(6).fill({ category: 'AR', count: 1 }),
    ])
      assert.equal(
        parseDataView({ ...sensus, rows }).status,
        'chart-unavailable'
      )
    assert.equal(
      parseDataView({
        ...fixture,
        rows: [...fixture.rows].reverse(),
        presentation: { ...fixture.presentation, chartType: 'area' },
      }).status,
      'chart-unavailable'
    )
    assert.equal(
      parseDataView({
        ...sensus,
        presentation: {
          kind: 'cartesian',
          chartType: 'area',
          xKey: 'category',
          series: [{ key: 'count', label: 'Count', valueType: 'number' }],
        },
      }).status,
      'chart-unavailable'
    )
    assert.equal(
      parseDataView({ ...fixture, columns: Array(11).fill(fixture.columns[0]) })
        .status,
      'validation-error'
    )
    assert.equal(
      parseDataView({
        ...fixture,
        presentation: {
          ...fixture.presentation,
          series: Array(9).fill(fixture.presentation.series[0]),
        },
      }).status,
      'chart-unavailable'
    )
  } finally {
    await vite.close()
  }
})

test('Data View renders escaped accessible evidence and distinct fallback, empty and error states', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { DataViewCard } = await vite.ssrLoadModule(
      '/src/features/assistant/data-view-card.tsx'
    )
    const render = (props) =>
      renderToStaticMarkup(createElement(DataViewCard, props))
    const html = render({
      result: {
        ...fixture,
        summary: '<script>alert(1)</script>',
        presentation: { kind: 'table' },
      },
    })
    assert.match(html, /<table/)
    assert.match(html, /scope="col"/)
    assert.match(html, /href="\/admin\/dashboard"/)
    assert.match(html, /2026-09/)
    assert.match(html, /All authorized kelompok/)
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<script>/)
    assert.match(
      render({
        result: { ...fixture, presentation: { kind: 'arbitrary-code' } },
        language: 'en',
      }),
      /Chart unavailable/
    )
    assert.match(
      render({ result: { ...fixture, rows: [] }, language: 'en' }),
      /No data/
    )
    assert.match(
      render({ result: { secret: 'do not display' }, language: 'en' }),
      /Invalid result/
    )
    assert.doesNotMatch(
      render({ result: { secret: 'do not display' } }),
      /do not display/
    )
    assert.match(
      render({ state: 'running', language: 'en' }),
      /Retrieving data/
    )
    assert.match(
      render({ state: 'query-error', language: 'en' }),
      /Could not retrieve/
    )
    assert.match(render({ state: 'cancelled', language: 'en' }), /Cancelled/)
  } finally {
    await vite.close()
  }
})

test('Data View mounts each trusted chart card with a visible table fallback', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { DataViewCard } = await vite.ssrLoadModule(
      '/src/features/assistant/data-view-card.tsx'
    )
    const render = (result) =>
      renderToStaticMarkup(createElement(DataViewCard, { result }))
    const cartesian = {
      ...fixture,
      columns: [
        ...fixture.columns,
        { key: 'izin', label: 'Izin', format: 'number' },
      ],
      rows: fixture.rows.map((row, index) => ({ ...row, izin: index + 1 })),
    }
    for (const chartType of ['line', 'area', 'bar', 'stacked-bar']) {
      const html = render({
        ...cartesian,
        presentation: {
          kind: 'cartesian',
          chartType,
          xKey: 'month',
          series: [
            { key: 'present', label: 'Present', valueType: 'number' },
            { key: 'izin', label: 'Izin', valueType: 'number' },
          ],
        },
      })
      assert.match(html, /recharts-wrapper/)
      assert.match(html, />Chart</)
      assert.match(html, />Table</)
    }
    const pie = render({
      summary: 'Sensus',
      source: {
        workspace: 'lupg',
        scope: 'All authorized kelompok',
        route: '/admin/lupg/sensus',
        section: 'Sensus',
      },
      columns: [
        { key: 'category', label: 'Category', format: 'text' },
        { key: 'count', label: 'Count', format: 'number' },
      ],
      rows: [
        { category: 'AR', count: 8 },
        { category: 'APR', count: 12 },
      ],
      presentation: { kind: 'pie', categoryKey: 'category', valueKey: 'count' },
    })
    assert.match(pie, /recharts-wrapper/)
    assert.match(pie, />Chart</)
    assert.match(pie, />Table</)
  } finally {
    await vite.close()
  }
})
