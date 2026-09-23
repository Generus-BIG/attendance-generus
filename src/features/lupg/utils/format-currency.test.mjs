import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('short rupiah formatting uses Indonesian decimals and separated units', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { formatRupiahShort } = await vite.ssrLoadModule(
      '/src/features/lupg/utils/format-currency.ts'
    )
    assert.equal(formatRupiahShort(1_100_000), 'Rp 1,1 jt')
    assert.equal(formatRupiahShort(847_000), 'Rp 847 rb')
    assert.equal(formatRupiahShort(15_000_000), 'Rp 15 jt')
    assert.equal(formatRupiahShort(500, false), '500')
  } finally {
    await vite.close()
  }
})
