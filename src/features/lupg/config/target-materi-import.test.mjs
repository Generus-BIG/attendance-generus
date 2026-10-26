import { createServer } from 'vite'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('target levels are separate from collective character assessment', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const target = await vite.ssrLoadModule(
      '/src/features/lupg/utils/character-targets.ts'
    )
    const monitoring = await vite.ssrLoadModule(
      '/src/features/lupg/utils/character-monitoring.ts'
    )
    assert.deepEqual(target.TARGET_LEVELS, [
      'PAUD',
      'ACR_1',
      'ACR_2',
      'ACR_3',
      'ACR_4',
      'ACR_5',
      'ACR_6',
      'APR',
      'AR',
      'GPN',
    ])
    assert.deepEqual(monitoring.CHARACTER_LEVELS, ['ACR', 'APR', 'AR', 'GPN'])
    assert.equal(target.TARGET_LEVEL_LABELS.ACR_3, 'ACR Kelas 3')
  } finally {
    await vite.close()
  }
})

test('all supplied XLSX files preserve each material detail and its source month', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { readWorkbookPreview, deterministicParse, detectTargetLevel } =
      await vite.ssrLoadModule(
        '/src/features/lupg/utils/character-target-import.ts'
      )
    const expected = JSON.parse(
      await readFile(
        new URL('./fixtures/target-materi/expected.json', import.meta.url),
        'utf8'
      )
    )
    for (const [filename, rows] of Object.entries(expected)) {
      const bytes = await readFile(
        new URL(`./fixtures/target-materi/${filename}`, import.meta.url)
      )
      const file = new File([bytes], filename)
      const level = filename.startsWith('PAUD') ? 'PAUD' : `ACR_${filename[4]}`
      assert.equal(detectTargetLevel(filename), level)
      const sheets = await readWorkbookPreview(file)
      const parsed = deterministicParse({
        year: 2026,
        defaultLevel: level,
        sheets,
        filename,
      })
      assert.deepEqual(
        parsed.items.map((item) => [
          item.source_row,
          item.month_index,
          item.category_label,
          item.material_label,
          item.detail_label,
        ]),
        rows,
        filename
      )
      assert.ok(
        parsed.items.every((item) => item.level_code === level),
        filename
      )
      assert.equal(
        new Set(parsed.items.map((item) => item.month_index)).size,
        12,
        filename
      )
      assert.equal(
        new Set(
          parsed.items.map((item) => `${item.source_sheet}:${item.source_row}`)
        ).size,
        rows.length,
        filename
      )
      assert.equal(
        parsed.issues.some((issue) => issue.severity === 'warning'),
        false,
        filename
      )
      assert.equal(
        parsed.issues.some((issue) => issue.severity === 'info'),
        filename === 'ACR-3.xlsx',
        filename
      )
    }
  } finally {
    await vite.close()
  }
})

test('only the month column changes scope and the API accepts the target vocabulary', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { deterministicParse } = await vite.ssrLoadModule(
      '/src/features/lupg/utils/character-target-import.ts'
    )
    const { isParseRequest } = await vite.ssrLoadModule(
      '/api/lupg/character-targets/parse.ts'
    )
    const request = {
      year: 2026,
      defaultLevel: 'ACR_4',
      sheets: [
        {
          name: 'Kelas 4',
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
            { rowNumber: 2, cells: ['', '', '', '', 'Dari', 'Sampai'] },
            {
              rowNumber: 3,
              cells: [
                'JANUARI',
                'Alim',
                'Makna Quran',
                'Kegiatan bulan Maret',
                '1',
                '5',
              ],
            },
            { rowNumber: 4, cells: ['', '', '', 'Sambungan', '6', '10'] },
            {
              rowNumber: 5,
              cells: ['FEBRUARI', '', '', 'Jangan diwarisi', '1', '5'],
            },
          ],
        },
      ],
    }
    assert.equal(isParseRequest(request), true)
    assert.equal(isParseRequest(null), false)
    assert.equal(isParseRequest({ ...request, defaultLevel: 'ACR' }), false)
    assert.equal(isParseRequest({ ...request, defaultLevel: 'ACR_7' }), false)
    assert.equal(
      isParseRequest({ ...request, sheets: [{ rows: [null] }] }),
      false
    )
    for (const defaultLevel of [
      'PAUD',
      'ACR_1',
      'ACR_2',
      'ACR_3',
      'ACR_4',
      'ACR_5',
      'ACR_6',
      'APR',
      'AR',
      'GPN',
    ]) {
      assert.equal(isParseRequest({ ...request, defaultLevel }), true)
    }
    const parsed = deterministicParse(request)
    assert.deepEqual(
      parsed.items.map((item) => [
        item.month_index,
        item.reference_from,
        item.reference_to,
      ]),
      [
        [1, '1', '5'],
        [1, '6', '10'],
      ]
    )
  } finally {
    await vite.close()
  }
})
