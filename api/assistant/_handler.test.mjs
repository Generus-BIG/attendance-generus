import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createServer } from 'vite'

test('Vercel adapter rejects oversized streamed bodies while reading', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { readBody } = await vite.ssrLoadModule('/api/assistant/_handler.ts')
    const request = Readable.from([
      Buffer.alloc(200 * 1024),
      Buffer.alloc(100 * 1024),
    ])
    await assert.rejects(readBody(request), /PAYLOAD_TOO_LARGE/)
  } finally {
    await vite.close()
  }
})
