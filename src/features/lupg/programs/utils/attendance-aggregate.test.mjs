import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('Desa attendance averages only defined groups and keeps Piket separate', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { aggregateAttendanceCategories, attendanceBand } =
      await vite.ssrLoadModule(
        '/src/features/lupg/programs/utils/attendance-aggregate.ts'
      )
    const rows = [
      ['2026-09', 'a', 'ATT_PCT_ACR', 100],
      ['2026-09', 'b', 'ATT_PCT_ACR', 80],
      ['2026-09', 'c', 'ATT_PCT_ACR', null],
      ['2026-09', 'a', 'ATT_PCT_APR', 70],
      ['2026-09', 'b', 'ATT_PCT_APR', null],
      ['2026-09', 'a', 'ATT_PCT_PIKET_ACR', 40],
      ['2026-09', 'b', 'ATT_PCT_PIKET_ACR', 60],
      ['2026-08', 'a', 'ATT_PCT_ACR', 80],
      ['2026-08', 'a', 'ATT_PCT_APR', 75],
      ['2026-08', 'a', 'ATT_PCT_PIKET_ACR', 50],
    ].map(([monthKey, kelompokId, code, value]) => ({
      monthKey,
      kelompokId,
      code,
      value,
    }))
    const result = aggregateAttendanceCategories(rows, '2026-09', '2026-08')
    assert.deepEqual(
      result.generus.categories.map(({ pct, trend }) => [pct, trend]),
      [
        [90, 'up'],
        [70, 'down'],
        [null, 'none'],
        [null, 'none'],
        [null, 'none'],
      ]
    )
    assert.equal(result.generus.average, 80)
    assert.equal(result.generus.previousAverage, 78)
    assert.equal(result.piket.categories[0].pct, 50)
    assert.equal(result.piket.categories[0].trend, 'flat')
    assert.equal(result.piket.average, 50)
    assert.equal(result.piket.categories[1].pct, null)
    assert.equal(result.generus.categories[1].name, 'APR Intensif')
    assert.equal(result.piket.categories[1].name, 'APR')
    assert.equal(result.piket.categories[3].name, 'GPN A')
    assert.equal(result.piket.categories[4].name, 'GPN B')
    assert.equal(
      aggregateAttendanceCategories(
        [
          {
            monthKey: '2026-09',
            kelompokId: 'a',
            code: 'ATT_PCT_AR',
            value: 62,
          },
        ],
        '2026-09',
        '2026-08'
      ).generus.categories[2].trend,
      'none'
    )
    assert.equal(
      aggregateAttendanceCategories([], '2026-09', '2026-08').generus.average,
      null
    )
    assert.deepEqual([69, 70, 84, 85, null].map(attendanceBand), [
      'crit',
      'warn',
      'warn',
      'ok',
      'none',
    ])
  } finally {
    await vite.close()
  }
})
