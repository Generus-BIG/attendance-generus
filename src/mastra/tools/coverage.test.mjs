import { createServer } from 'vite'
import { RequestContext } from '@mastra/core/request-context'
import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'

let vite
before(async () => {
  vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
})
after(async () => {
  await vite?.close()
})
const K = '123e4567-e89b-42d3-a456-426614174001'
const R = '123e4567-e89b-42d3-a456-426614174002'
export const fixtures = {
  lookup_values: [{ id: K, value: 'Cakra' }],
  lupg_monthly_reports: [
    {
      id: R,
      kelompok_id: K,
      month: '2026-08-01',
      status: 'submitted',
      locked: false,
      last_edited_at: null,
      submitted_at: null,
    },
  ],
  lupg_shodaqoh: [
    { id: R, monthly_report_id: R, nominal: 120000, jumlah_kk: 3, notes: null },
  ],
  lupg_mustin_notes: [
    {
      id: R,
      monthly_report_id: R,
      pokok_masalah: 'Jadwal',
      keputusan_rencana: 'Koordinasi',
      pic: 'Tim',
      deadline: null,
      status: 'done',
    },
  ],
  lupg_metric_reports: [
    {
      id: R,
      monthly_report_id: R,
      metric_code: 'ATT_PCT_APR',
      current_value: 0,
      denominator: null,
      notes: 'Tercatat nol',
    },
  ],
  lupg_program_reports: [
    {
      id: R,
      monthly_report_id: R,
      program_code: 'SHOLAT_ACR',
      denominator: 0,
      count_this_month: 0,
      notes: null,
    },
  ],
  lupg_sarpras_items: [{ id: R, name: 'Papan', active: true }],
  lupg_sarpras_reports: [],
  lupg_character_target_templates: [
    { id: R, year: 2026, level_code: 'APR', status: 'active' },
  ],
  lupg_character_target_items: [
    {
      id: R,
      template_id: R,
      month_index: 8,
      active: true,
      level_code: 'APR',
      category_label: 'Quran',
      material_label: 'Materi',
      detail_label: 'Detail',
      reference_from: '1',
      reference_to: '5',
    },
  ],
  lupg_character_target_reports: [
    {
      id: R,
      monthly_report_id: R,
      target_item_id: R,
      realization_percent: 0,
      notes: null,
      reference_from_actual: null,
      reference_to_actual: null,
    },
  ],
  lupg_character_monitoring_activities: [
    {
      id: R,
      activity_code: 'RUMAH',
      activity_label: 'Di rumah',
      level_code: 'APR',
      active: true,
    },
  ],
  lupg_character_monitoring_reports: [
    {
      id: R,
      monthly_report_id: R,
      activity_id: R,
      status: 'needs_guidance',
      notes: 'Perlu pendampingan',
    },
  ],
  lupg_activity_photos: [{ id: R, report_id: R, caption: 'Kegiatan' }],
  lupg_sensus: [
    { id: R, kelompok_id: K, category_code: 'PAUD', gender: 'P', count: 7 },
  ],
  lupg_sensus_snapshots: [
    {
      id: R,
      monthly_report_id: R,
      category_code: 'PAUD',
      gender: 'P',
      count: 2,
    },
  ],
}
async function run(tool, input = {}, tables = fixtures, seen = []) {
  const m = await vite.ssrLoadModule('/src/mastra/tools/lupg.ts')
  const tools = m.createLupgTools({
    url: 'https://fixture.supabase.co',
    key: 'anon',
    fetch: async (url, init) => {
      assert.equal(
        new Headers(init.headers).get('authorization'),
        'Bearer caller'
      )
      assert.ok(
        !init.method || init.method === 'GET',
        'Domain data must be GET-only'
      )
      const u = new URL(url)
      seen.push(u)
      return Response.json(tables[u.pathname.split('/').pop()] ?? [])
    },
  })
  assert.ok(tools[tool], `Missing ${tool}`)
  return tools[tool].execute(input, {
    requestContext: new RequestContext(
      Object.entries({
        userId: 'user',
        role: 'admin',
        accessToken: 'caller',
        workspace: 'lupg',
        modelId: 'gpt-5.6-terra',
      })
    ),
    abortSignal: new AbortController().signal,
  })
}
test('Jakarta report month changes on day 8, not UTC day', async () => {
  const d = await vite.ssrLoadModule('/src/mastra/tools/data.ts')
  assert.equal(typeof d.defaultReportMonth, 'function')
  assert.equal(
    d.defaultReportMonth(new Date('2026-09-07T16:59:59Z')),
    '2026-08'
  )
  assert.equal(
    d.defaultReportMonth(new Date('2026-09-07T17:00:00Z')),
    '2026-09'
  )
})
test('explicit unresolved and partial scopes return candidates and never read domain data', async () => {
  for (const kelompok of ['Missing', 'cak']) {
    const seen = []
    const result = await run(
      'readLupgReports',
      { operation: 'shodaqoh', month: '2026-08', kelompok },
      fixtures,
      seen
    )
    assert.ok(seen.every((u) => u.pathname.endsWith('/lookup_values')))
    assert.equal(result.coverage.complete, false)
  }
})
test('dashboard denominator includes unstarted groups and all nine sections, submission is not lock', async () => {
  const result = await run(
    'readLupgReports',
    { operation: 'status', month: '2026-08' },
    {
      ...fixtures,
      lookup_values: [
        ...fixtures.lookup_values,
        { id: '123e4567-e89b-42d3-a456-426614174003', value: 'Meruyung' },
      ],
    }
  )
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].locked, 'Tidak')
  assert.equal(result.rows[1].status, 'not_started')
  assert.match(result.rows[0].sections, /\/9/)
})
for (const operation of [
  'mustin',
  'shodaqoh',
  'metrics',
  'programs',
  'sarpras',
  'materials',
  'character',
  'documentation',
  'sensus',
]) {
  test(`${operation}: source-backed positive, empty and exact scoped read`, async () => {
    const seen = []
    const result = await run(
      'readLupgReports',
      { operation, month: '2026-08', kelompok: '  CAKRA  ' },
      fixtures,
      seen
    )
    assert.ok(result.rows.length > 0)
    assert.equal(result.source.scope, 'Cakra')
    assert.equal(result.coverage.complete, true)
    assert.ok(result.retrievedAt)
    assert.ok(result.pagination.totalRows >= result.rows.length)
    const reportQueries = seen.filter((u) =>
      u.pathname.endsWith('/lupg_monthly_reports')
    )
    assert.ok(
      reportQueries.every(
        (u) => u.searchParams.get('kelompok_id') === `eq.${K}`
      )
    )
    const empty = await run(
      'readLupgReports',
      { operation, month: '2026-08' },
      {}
    )
    assert.equal(empty.rows.length, 0)
  })
}
test('current sensus is not report-scoped and compares kelompok/category/gender', async () => {
  const K2 = '123e4567-e89b-42d3-a456-426614174003'
  const result = await run(
    'readLupgReports',
    { operation: 'sensus', month: '2026-08', surface: 'presentation' },
    {
      ...fixtures,
      lookup_values: [...fixtures.lookup_values, { id: K2, value: 'Meruyung' }],
      lupg_sensus: [
        ...fixtures.lupg_sensus,
        {
          id: K2,
          kelompok_id: K2,
          category_code: 'APR',
          gender: 'L',
          count: 4,
        },
      ],
    }
  )
  assert.ok(
    result.rows.some(
      (row) =>
        row.kelompok === 'Meruyung' &&
        row.category === 'APR' &&
        row.gender === 'L' &&
        row.count === 4
    )
  )
})

test('LUPG sensus can return a bounded composition chart without exposing raw group rows', async () => {
  const result = await run('readLupgReports', {
    operation: 'sensus',
    grouping: 'category',
  })
  assert.deepEqual(result.rows, [{ label: 'PAUD', count: 7 }])
  assert.deepEqual(result.presentation, {
    kind: 'pie',
    categoryKey: 'label',
    valueKey: 'count',
  })
})

test('yearly shodaqoh preserves each report row and uses KK-month aggregate semantics', async () => {
  const R2 = '123e4567-e89b-42d3-a456-426614174003'
  const result = await run(
    'readLupgReports',
    { operation: 'shodaqoh', year: 2026, kelompok: 'Cakra' },
    {
      ...fixtures,
      lupg_monthly_reports: [
        ...fixtures.lupg_monthly_reports,
        { ...fixtures.lupg_monthly_reports[0], id: R2, month: '2026-09-01' },
      ],
      lupg_shodaqoh: [
        ...fixtures.lupg_shodaqoh,
        {
          id: R2,
          monthly_report_id: R2,
          nominal: 80000,
          jumlah_kk: 1,
          notes: null,
        },
      ],
    }
  )
  assert.deepEqual(
    result.rows.map((row) => [row.month, row.nominal, row.kk, row.perKk]),
    [
      ['2026-08', 120000, 3, 40000],
      ['2026-09', 80000, 1, 80000],
    ]
  )
  assert.match(result.summary, /KK-bulan.*4/)
  assert.deepEqual(result.presentation, {
    kind: 'cartesian',
    chartType: 'area',
    xKey: 'month',
    series: [{ key: 'nominal', label: 'Nominal', valueType: 'number' }],
  })
})

test('source arithmetic and missing-vs-zero survive cards', async () => {
  const input = { month: '2026-08', kelompok: 'Cakra' }
  const sh = await run('readLupgReports', { ...input, operation: 'shodaqoh' })
  assert.match(sh.summary, /40000/)
  const sa = await run('readLupgReports', { ...input, operation: 'sarpras' })
  assert.equal(sa.rows[0].status, 'Belum tercatat')
  const sn = await run('readLupgReports', { ...input, operation: 'sensus' })
  assert.equal(sn.rows[0].count, 7)
  assert.equal('basis' in sn.rows[0], false)
  const pr = await run('readLupgReports', { ...input, operation: 'programs' })
  assert.equal(pr.rows[0].percent, null)
  const mu = await run('readLupgReports', { ...input, operation: 'mustin' })
  assert.equal(mu.rows[0].status, 'done')
  assert.equal(mu.rows[0].overdue, null)
})
