import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const loaderPath = new URL('./private-presentation-data.ts', import.meta.url)
const fixture = {
  monthKey: '2026-07',
  kelompokList: [
    { id: 'a', value: 'Kel. A' },
    { id: 'b', value: 'Kel. B' },
  ],
  reports: [],
  programs: ['PHQ', 'TURBA_GPN', 'NIKAH_JM', 'GOMA', 'GMKM', 'SHOLAT_ACR'].map(
    (code) => ({ code, name: code, active: false })
  ),
  metrics: [{ code: 'ACR', name: 'ACR' }],
  sarprasItems: [],
  sensusCells: [],
  programReports: [],
  metricReports: [],
  sarprasReports: [],
  shodaqohRows: [],
  mustinRows: [],
  activityPhotos: [1, 2, 3].map((id) => ({
    id: String(id),
    caption: null,
    signedUrl: '',
  })),
}
// Captured by running the unmodified web buildSlides before loader extraction.
const desaKeys = [
  'cover',
  'status',
  'sensus',
  'metrics-table',
  'metrics-compare-ACR-APR-AR',
  'metrics-compare-GPN_A-GPN_B',
  'metrics-aggregate',
  'sarpras',
  'shodaqoh',
  'program-PHQ',
  'program-TURBA_GPN',
  'program-NIKAH_JM',
  'program-GOMA',
  'program-GMKM',
  'program-SHOLAT_ACR',
  'character-monitoring-recap',
  'character-target-recap-ACR',
  'character-target-recap-APR',
  'character-target-recap-AR',
  'character-target-recap-GPN',
  'mustin-a',
  'mustin-b',
  'dokumentasi-0',
  'dokumentasi-1',
  'closing',
]

test('web Desa and kelompok keys retain pre-extraction ordering and photo expansion', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { buildSlides } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slides.tsx'
    )
    assert.deepEqual(
      buildSlides(fixture).map((s) => s.key),
      desaKeys
    )
    assert.deepEqual(
      buildSlides({ ...fixture, kelompokFilter: 'a' }).map((s) => s.key),
      desaKeys.filter((k) => !['status', 'mustin-b'].includes(k))
    )
    assert.deepEqual(
      buildSlides({
        ...fixture,
        programs: [],
        metrics: [],
        activityPhotos: [],
      }).map((s) => s.key),
      desaKeys.filter((k) => !/^(program-|metrics-|dokumentasi-)/.test(k))
    )
  } finally {
    await vite.close()
  }
})

test('private loader preserves enrichment, query scope, ordering and error propagation', async (t) => {
  assert.ok(existsSync(loaderPath), 'shared private loader must exist')
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')
    const { loadPrivatePresentationData } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/private-presentation-data.ts'
    )
    const report = {
      id: 'r',
      kelompok_id: 'a',
      month: '2026-07-01',
      submitted_by: 'user',
      last_edited_at: '2026-07-09',
    }
    const tables = {
      lookup_values: fixture.kelompokList.map((k) => ({ ...k, type: 'GROUP' })),
      lupg_monthly_reports: [
        report,
        { id: 'old', kelompok_id: 'a', month: '2026-06-01' },
        { id: 'other', kelompok_id: 'b', month: '2026-07-01' },
      ],
      lupg_program_definitions: fixture.programs,
      lupg_metric_definitions: [{ code: 'ACR', active: true }],
      lupg_sarpras_items: [{ id: 's', active: true }],
      lupg_mustin_templates: [{ id: 'm', active: true }],
      lupg_character_target_templates: [
        { id: 't', year: 2026, status: 'active' },
      ],
      lupg_character_target_items: [
        { id: 'i', template_id: 't', month_index: 7, active: true },
      ],
      lupg_character_monitoring_activities: [{ id: 'act', active: true }],
      lupg_sensus: [
        { kelompok_id: 'a', category_code: 'PAUD', count: 7 },
        { kelompok_id: 'a', category_code: 'APR', count: 99 },
      ],
      lupg_sensus_participant_derived: [
        { kelompok_id: 'a', category_code: 'APR', count: 3 },
      ],
      lupg_activity_photos: [
        {
          id: 'p2',
          report_id: 'r',
          sort_order: 2,
          storage_path: 'two',
          caption: 'Second',
        },
        {
          id: 'p1',
          report_id: 'r',
          sort_order: 1,
          storage_path: 'one',
          caption: 'First',
        },
      ],
    }
    for (const name of [
      'program_reports',
      'metric_reports',
      'sarpras_reports',
      'shodaqoh',
      'mustin_notes',
      'character_monitoring_reports',
      'character_target_reports',
    ]) {
      tables[`lupg_${name}`] = [
        { id: name, monthly_report_id: 'r', sort_order: 1 },
        { id: `old-${name}`, monthly_report_id: 'old' },
      ]
    }
    const calls = []
    let failure
    t.mock.method(supabase, 'from', (table) => {
      const call = { table, filters: [], order: [] }
      calls.push(call)
      const query = {
        select() {
          return query
        },
        eq(key, value) {
          call.filters.push(['eq', key, value])
          return query
        },
        in(key, value) {
          call.filters.push(['in', key, value])
          return query
        },
        gte(key, value) {
          call.filters.push(['gte', key, value])
          return query
        },
        lte(key, value) {
          call.filters.push(['lte', key, value])
          return query
        },
        order(key, options) {
          call.order.push([key, options])
          return query
        },
        then(resolve, reject) {
          let rows = [...(tables[table] ?? [])].filter((row) =>
            call.filters.every(([op, k, v]) =>
              op === 'eq'
                ? row[k] === v
                : op === 'in'
                  ? v.includes(row[k])
                  : op === 'gte'
                    ? row[k] >= v
                    : row[k] <= v
            )
          )
          rows.sort((a, b) => {
            for (const [key, options] of call.order) {
              const cmp = String(a[key] ?? '').localeCompare(
                String(b[key] ?? '')
              )
              if (cmp) return options?.ascending === false ? -cmp : cmp
            }
            return 0
          })
          return Promise.resolve({
            data: rows,
            error: failure === table ? new Error(`failed ${table}`) : null,
          }).then(resolve, reject)
        },
      }
      return query
    })
    t.mock.method(supabase, 'rpc', async (name, args) => {
      calls.push({ rpc: name, args })
      return {
        data: name.includes('last_editor') ? 'Editor' : 'Submitter',
        error: failure === name ? new Error(`failed ${name}`) : null,
      }
    })
    t.mock.method(supabase.storage, 'from', (bucket) => ({
      createSignedUrls: async (paths, seconds) => {
        calls.push({ bucket, paths, seconds })
        return {
          data:
            failure === 'signing'
              ? null
              : [{ path: 'one', signedUrl: 'signed-one' }],
          error: failure === 'signing' ? new Error('unavailable') : null,
        }
      },
    }))
    const data = await loadPrivatePresentationData({
      monthKey: '2026-07',
      kelompokId: 'a',
    })
    assert.equal(data.kelompokFilter, 'a')
    assert.deepEqual(data.reports, [
      {
        ...report,
        last_editor_display_name: 'Editor',
        submitter_display_name: 'Submitter',
      },
    ])
    assert.deepEqual(data.programs, fixture.programs)
    assert.deepEqual(
      data.sensusCells.map((r) => [r.category_code, r.count]),
      [
        ['PAUD', 7],
        ['APR', 3],
      ]
    )
    assert.equal(data.monitoringMasterSensus.length, 2)
    assert.equal(data.monitoringDerivedSensus.length, 1)
    for (const key of [
      'metrics',
      'sarprasItems',
      'mustinTemplates',
      'characterTargetItems',
      'characterTargetReports',
      'characterActivities',
      'characterReports',
      'programReports',
      'metricReports',
      'sarprasReports',
      'shodaqohRows',
      'mustinRows',
    ])
      assert.equal(data[key].length, 1, key)
    for (const key of [
      'yearlyMonthlyReports',
      'yearlyProgramReports',
      'yearlyMetricMonthlyReports',
      'yearlyMetricReports',
      'yearlyShodaqohRows',
    ])
      assert.equal(data[key].length, 2, key)
    assert.deepEqual(data.activityPhotos, [
      {
        id: 'p1',
        caption: 'First',
        signedUrl: 'signed-one',
        kelompokName: undefined,
      },
      { id: 'p2', caption: 'Second', signedUrl: '', kelompokName: undefined },
    ])
    assert.ok(
      calls
        .filter((c) => c.table === 'lupg_monthly_reports')
        .every((c) =>
          c.filters.some(
            ([op, k, v]) => op === 'eq' && k === 'kelompok_id' && v === 'a'
          )
        ),
      'no unused Desa annual query for kelompok'
    )
    assert.ok(
      calls
        .filter((c) => /sensus/.test(c.table))
        .every((c) =>
          c.filters.some(
            ([op, k, v]) =>
              op === 'in' && k === 'kelompok_id' && v.join() === 'a'
          )
        )
    )
    assert.deepEqual(
      calls.find((c) => c.bucket),
      { bucket: 'lupg-activity-photos', paths: ['one', 'two'], seconds: 3600 }
    )
    const desa = await loadPrivatePresentationData({ monthKey: '2026-07' })
    assert.equal(desa.reports.length, 2)
    assert.equal(desa.yearlyMonthlyReports.length, 3)
    assert.deepEqual(desa.yearlyShodaqohRows, [])
    assert.equal(desa.activityPhotos[0].kelompokName, 'Kel. A')
    for (const target of [
      'lupg_monthly_reports',
      'lupg_metric_definitions',
      'lupg_character_target_items',
      'lupg_sensus_participant_derived',
      'lupg_activity_photos',
      'lupg_get_last_editor_display',
      'lupg_get_submitter_display',
    ]) {
      failure = target
      await assert.rejects(
        loadPrivatePresentationData({ monthKey: '2026-07', kelompokId: 'a' }),
        new RegExp(`failed ${target}`)
      )
    }
    failure = 'signing'
    assert.ok(
      (
        await loadPrivatePresentationData({
          monthKey: '2026-07',
          kelompokId: 'a',
        })
      ).activityPhotos.every((p) => p.signedUrl === '')
    )
    failure = undefined
    tables.lupg_monthly_reports = []
    calls.length = 0
    const empty = await loadPrivatePresentationData({
      monthKey: '2026-07',
      kelompokId: 'a',
    })
    assert.deepEqual(empty.reports, [])
    assert.deepEqual(empty.activityPhotos, [])
    assert.ok(
      !calls.some((c) =>
        c.filters?.some(([op, , v]) => op === 'in' && v.length === 0)
      ),
      'no empty report queries'
    )
  } finally {
    await vite.close()
  }
})

test('private surfaces and public player share export capability', () => {
  const control = new URL('./pptx-export-control.tsx', import.meta.url)
  assert.ok(existsSync(control), 'reusable export control must exist')
  const player = readFileSync(new URL('./player.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
  const picker = readFileSync(
    new URL('../../presentation/picker.tsx', import.meta.url),
    'utf8'
  )
  const publicPage = readFileSync(
    new URL('../../presentation/public-presentation-page.tsx', import.meta.url),
    'utf8'
  )
  assert.match(player, /onExport\?/)
  assert.match(player, /onExport &&/)
  assert.match(player, /<PptxExportControl/)
  assert.match(picker, /<PptxExportControl/)
  assert.match(picker, /loadPrivatePresentationData/)
  assert.match(route, /loadPrivatePresentationData/)
  assert.match(route, /onExport=.*data/s)
  assert.match(publicPage, /onExport=/)
  assert.match(publicPage, /exportPresentationPptx/)
})
