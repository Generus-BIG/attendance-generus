import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'

let vite
let theme
let assets
before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
  })
  theme = await vite.ssrLoadModule(
    '/src/features/lupg/recap/presentation/pptx/pptx-theme.ts'
  )
  assets = await vite.ssrLoadModule(
    '/src/features/lupg/recap/presentation/pptx/pptx-assets.ts'
  )
})
after(async () => {
  await vite?.close()
})

test('filenames retain Indonesian month, selected label and safe punctuation', () => {
  assert.equal(
    theme.presentationFilename({ monthKey: '2026-07', kelompokList: [] }),
    'Laporan Pembinaan Generus BIG Juli 2026.pptx'
  )
  assert.equal(
    theme.presentationFilename({
      monthKey: '2026-07',
      kelompokFilter: 'a',
      kelompokList: [{ id: 'a', value: 'Kel. A/B:*?"<>|' }],
    }),
    'Lap. Mustin LUPG-Kel. A-B- Juli 2026.pptx'
  )
  assert.throws(
    () => theme.presentationFilename({ monthKey: '2026-13', kelompokList: [] }),
    /bulan/i
  )
  assert.throws(
    () =>
      theme.presentationFilename({
        monthKey: '2026-07',
        kelompokFilter: 'missing',
        kelompokList: [],
      }),
    /kelompok/i
  )
})

test('photo failures return bounded placeholders without URLs in warnings', async () => {
  const photos = [
    {
      id: 'a',
      signedUrl: 'https://example.test/private?token=secret',
      caption: 'A',
    },
  ]
  const result = await assets.loadPptxPhotos(
    photos,
    async () => new Response('no', { status: 403 })
  )
  assert.equal(result.images.get('a'), null)
  assert.equal(result.warnings.length, 1)
  assert.ok(!JSON.stringify(result.warnings).includes('secret'))
})
