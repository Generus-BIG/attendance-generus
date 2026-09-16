import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

async function load() {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  return { vite, module: await vite.ssrLoadModule('/src/mastra/adapters.ts') }
}

test('auth transport retry succeeds once Supabase DNS recovers', async () => {
  const { vite, module } = await load()
  try {
    let attempts = 0
    const result = await module.retryAuthRequest(
      async () => {
        attempts++
        if (attempts === 1)
          throw Object.assign(new TypeError('request failed'), {
            cause: Object.assign(
              new Error(
                'getaddrinfo ENOTFOUND obvvznynkrkgxuckgncz.supabase.co'
              ),
              { code: 'ENOTFOUND' }
            ),
          })
        return 'verified'
      },
      { delayMs: 0 }
    )
    assert.equal(result, 'verified')
    assert.equal(attempts, 2)
  } finally {
    await vite.close()
  }
})

test('auth transport retry recognizes Supabase retryable fetch errors', async () => {
  const { vite, module } = await load()
  try {
    let attempts = 0
    const result = await module.retryAuthRequest(
      async () => {
        attempts++
        if (attempts === 1)
          throw Object.assign(new Error('Network request failed'), {
            name: 'AuthRetryableFetchError',
            status: 0,
          })
        return 'verified'
      },
      { delayMs: 0 }
    )
    assert.equal(result, 'verified')
    assert.equal(attempts, 2)
  } finally {
    await vite.close()
  }
})

test('auth transport retry preserves final network failure', async () => {
  const { vite, module } = await load()
  try {
    let attempts = 0
    await assert.rejects(
      module.retryAuthRequest(
        async () => {
          attempts++
          throw Object.assign(new Error('fetch failed'), { code: 'EAI_AGAIN' })
        },
        { delayMs: 0 }
      ),
      /fetch failed/
    )
    assert.equal(attempts, 3)
  } finally {
    await vite.close()
  }
})
