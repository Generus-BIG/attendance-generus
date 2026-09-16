import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

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
