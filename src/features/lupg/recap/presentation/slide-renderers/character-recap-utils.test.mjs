import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('character statuses map to fixed percentages and Desa averages assessed groups', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { characterStatusPercent } = await vite.ssrLoadModule(
      '/src/features/lupg/utils/character-monitoring.ts'
    )
    const { buildMonitoringRecapRows } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slide-renderers/character-recap-utils.ts'
    )

    assert.deepEqual(
      [
        'needs_guidance',
        'not_applied',
        'in_progress',
        'consistent',
        'established',
      ].map(characterStatusPercent),
      [0, 30, 70, 85, 100]
    )
    assert.equal(characterStatusPercent(null), null)

    const activity = {
      id: 'activity',
      level_code: 'ACR',
      activity_label: 'Kegiatan',
      sort_order: 1,
    }
    const reports = [
      { id: 'r1', kelompok_id: 'k1' },
      { id: 'r2', kelompok_id: 'k2' },
      { id: 'r3', kelompok_id: 'k3' },
    ]
    const kelompok = reports.map(({ kelompok_id }) => ({
      id: kelompok_id,
      value: kelompok_id,
    }))
    const rows = buildMonitoringRecapRows(
      'ACR',
      [activity],
      [
        {
          monthly_report_id: 'r1',
          activity_id: 'activity',
          status: 'consistent',
        },
        {
          monthly_report_id: 'r2',
          activity_id: 'activity',
          status: 'not_applied',
        },
      ],
      reports,
      kelompok
    )

    assert.deepEqual(rows[0].values, [85, 30, null])
    assert.equal(rows[0].desa, 58)
    assert.equal(
      buildMonitoringRecapRows('ACR', [activity], [], reports, kelompok)[0]
        .desa,
      null
    )
  } finally {
    await vite.close()
  }
})

test('target recap drops empty details and spans consecutive materials', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { buildTargetRecapGroups } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slide-renderers/character-recap-utils.ts'
    )
    const item = (id, material, detail, sort_order) => ({
      id,
      level_code: 'GPN',
      category_label: 'Alim',
      material_label: material,
      detail_label: detail,
      sort_order,
    })
    const groups = buildTargetRecapGroups(
      [
        item('a', 'Makna Quran', 'Al-Lail', 1),
        item('b', 'Makna Quran', 'Ad-Duha', 2),
        item('empty', 'Makna Quran', '  ', 3),
        item('c', 'Hadist', 'Kitabul Ilmi', 4),
        item('d', 'Makna Quran', 'Al-Alaq', 5),
      ],
      [
        {
          monthly_report_id: 'r',
          target_item_id: 'a',
          realization_percent: 100,
        },
        {
          monthly_report_id: 'r',
          target_item_id: 'b',
          realization_percent: 80,
        },
        {
          monthly_report_id: 'r',
          target_item_id: 'empty',
          realization_percent: 0,
        },
      ],
      [{ id: 'r', kelompok_id: 'k' }],
      [{ id: 'k', value: 'Kelompok' }]
    )

    assert.equal(groups.length, 1)
    assert.deepEqual(
      groups[0].rows.map((row) => [row.item.id, row.materialRowSpan]),
      [
        ['a', 2],
        ['b', 0],
        ['c', 1],
        ['d', 1],
      ]
    )
    assert.equal(groups[0].average, 90)
  } finally {
    await vite.close()
  }
})

test('PAUD and all ACR classes keep separate kelompok and Desa values', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { TARGET_LEVELS } = await vite.ssrLoadModule(
      '/src/features/lupg/utils/character-targets.ts'
    )
    const { buildTargetRecapGroups } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/slide-renderers/character-recap-utils.ts'
    )
    const items = TARGET_LEVELS.map((level_code, index) => ({
      id: `item-${index}`,
      level_code,
      category_label: 'Alim',
      material_label: 'Bacaan',
      detail_label: 'Detail',
      sort_order: index,
    }))
    const reports = [
      { id: 'r1', kelompok_id: 'k1' },
      { id: 'r2', kelompok_id: 'k2' },
    ]
    const kelompok = [
      { id: 'k1', value: 'Kel. 1' },
      { id: 'k2', value: 'Kel. 2' },
    ]
    const values = items.flatMap((item, index) => [
      {
        target_item_id: item.id,
        monthly_report_id: 'r1',
        realization_percent: index * 10,
      },
      {
        target_item_id: item.id,
        monthly_report_id: 'r2',
        realization_percent: 100,
      },
    ])
    const desa = buildTargetRecapGroups(items, values, reports, kelompok)
    assert.deepEqual(
      desa.map((group) => group.level),
      [...TARGET_LEVELS]
    )
    assert.deepEqual(
      desa.map((group) => group.average),
      [50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
    )
    const single = buildTargetRecapGroups(
      items,
      values,
      reports,
      kelompok.slice(0, 1)
    )
    assert.deepEqual(
      single.map((group) => group.average),
      [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
    )
  } finally {
    await vite.close()
  }
})
