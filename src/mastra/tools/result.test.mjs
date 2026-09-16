import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('chart results keep all aggregated buckets when table pagination is requested', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { resultView, col } = await vite.ssrLoadModule(
      '/src/mastra/tools/result.ts'
    )
    const rows = Array.from({ length: 4 }, (_, index) => ({
      date: `2026-09-0${index + 1}`,
      present: index + 1,
    }))
    const result = resultView(
      {
        workspace: 'absensi',
        scope: 'All authorized kelompok',
        month: '2026-09',
        route: '/admin/dashboard',
        section: 'Attendance trend',
      },
      'Trend',
      [col('date', 'Date', 'date'), col('present', 'Present', 'number')],
      rows,
      { offset: 1, limit: 2 },
      undefined,
      {
        kind: 'cartesian',
        chartType: 'line',
        xKey: 'date',
        series: [{ key: 'present', label: 'Present', valueType: 'number' }],
      }
    )
    assert.deepEqual(result.rows, rows)
    assert.deepEqual(result.pagination, {
      offset: 0,
      limit: 2,
      totalRows: 4,
      hasMore: false,
    })
  } finally {
    await vite.close()
  }
})
