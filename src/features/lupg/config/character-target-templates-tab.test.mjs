import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('regional material rows inherit merged labels and keep Ayat/Hal ranges', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { deterministicParse } = await vite.ssrLoadModule(
      '/src/features/lupg/config/character-target-templates-tab.tsx'
    )
    const result = deterministicParse({
      year: 2026,
      defaultLevel: 'GPN',
      sheets: [
        {
          name: 'Daerah',
          rows: [
            {
              rowNumber: 1,
              cells: [
                'Bulan',
                'Kategori',
                'Materi',
                'Detail Materi',
                'Ayat/Hal',
                '',
              ],
            },
            {
              rowNumber: 2,
              cells: ['', '', '', '', 'Dari', 'Sampai'],
            },
            {
              rowNumber: 3,
              cells: ['JANUARI', 'Alim', 'Makna Quran', 'Al-Lail', '1', '21'],
            },
            {
              rowNumber: 4,
              cells: ['', '', '', 'Ad-Duha', '1', '11'],
            },
            {
              rowNumber: 5,
              cells: ['', '', 'Hadist', '', '', ''],
            },
            {
              rowNumber: 6,
              cells: ['', '', '', 'Kitabul Ilmi', '2', '4'],
            },
            {
              rowNumber: 7,
              cells: ['FEBRUARI', '', '', 'Tidak boleh bocor', '3', '5'],
            },
          ],
        },
      ],
    })

    assert.deepEqual(
      result.items.map((item) => [
        item.month_index,
        item.material_label,
        item.detail_label,
        item.reference_from,
        item.reference_to,
      ]),
      [
        [1, 'Makna Quran', 'Al-Lail', '1', '21'],
        [1, 'Makna Quran', 'Ad-Duha', '1', '11'],
        [1, 'Hadist', 'Kitabul Ilmi', '2', '4'],
      ]
    )
  } finally {
    await vite.close()
  }
})
