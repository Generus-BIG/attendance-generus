import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('provider targets the proxy deployment gateway with api-key auth', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://proxy.example.test/v1/dev'
    process.env.AZURE_OPENAI_API_KEY = 'proxy-secret-key'
    process.env.AZURE_OPENAI_API_VERSION = '2024-12-01-preview'
    const seen = []
    const { createAzure } = await import('@ai-sdk/azure')
    const { models } = await vite.ssrLoadModule('/src/mastra/models.ts')
    const indexSource = await vite.ssrLoadModule('/src/mastra/index.ts')
    assert.ok(indexSource.assistantAgent)
    // Mirror the provider construction in src/mastra/index.ts: deployment
    // gateway URL, api-key header, GPT-5 body transform.
    const baseURL = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '')
    const provider = createAzure({
      baseURL,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      fetch: async (_input, init) => {
        let body = init?.body
        let deployment = ''
        if (typeof body === 'string') {
          const parsed = JSON.parse(body)
          deployment = parsed.model
          delete parsed.model
          body = JSON.stringify(parsed)
        }
        const target =
          `${baseURL}/openai/deployments/${encodeURIComponent(deployment)}` +
          `/chat/completions?api-version=${encodeURIComponent(process.env.AZURE_OPENAI_API_VERSION)}`
        const headers = new Headers(init?.headers)
        seen.push({
          url: target,
          apiKey: headers.get('api-key'),
          body,
        })
        throw new Error('PROBE_STOP')
      },
    })
    const terra = models.find((model) => model.id === 'gpt-5.6-terra')
    assert.equal(terra.deployment, 'gpt-5.6-terra-20260709-global')
    assert.equal(
      models.find((model) => model.id === 'gpt-5.6-sol').deployment,
      'gpt-5.6-sol-20260709-global'
    )
    assert.equal(
      models.find((model) => model.id === 'gpt-5.6-luna').deployment,
      'gpt-5.6-luna-20260709-global'
    )
    const model = provider.chat(terra.deployment)
    await assert.rejects(
      () =>
        model.doGenerate({
          prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        }),
      /PROBE_STOP/
    )
    assert.equal(seen.length, 1)
    assert.equal(
      seen[0].url,
      `${baseURL}/openai/deployments/gpt-5.6-terra-20260709-global/chat/completions?api-version=2024-12-01-preview`
    )
    assert.equal(seen[0].apiKey, 'proxy-secret-key')
    assert.doesNotMatch(seen[0].url, /openai\.azure\.com/)
    assert.doesNotMatch(JSON.stringify(seen[0].headers ?? {}), /Bearer/)
  } finally {
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY
    delete process.env.AZURE_OPENAI_API_VERSION
    await vite.close()
  }
})

test('GPT-5 body transform swaps max_tokens and strips temperature', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { normalizeHistory } = await vite.ssrLoadModule('/src/mastra/http.ts')
    assert.ok(normalizeHistory)
    // Mirror the GPT5_OR_REASONING_MODEL transform in src/mastra/index.ts.
    const pattern = /(?:^|[/_-])(?:gpt-5|o(?:1|3|4))(?:[._-]|$)/i
    assert.ok(pattern.test('gpt-5.6-terra-20260709-global'))
    assert.ok(pattern.test('gpt-5.5-20260424-global'))
    assert.ok(!pattern.test('gpt-4.1-mini-20250414-global'))
    const transform = (deployment, body) => {
      const transformed = { ...body }
      if (!pattern.test(deployment)) return transformed
      if (
        transformed.max_completion_tokens === undefined &&
        transformed.max_tokens !== undefined
      ) {
        transformed.max_completion_tokens = transformed.max_tokens
      }
      delete transformed.max_tokens
      if (
        transformed.temperature !== undefined &&
        transformed.temperature !== 1
      ) {
        delete transformed.temperature
      }
      if (Array.isArray(transformed.tools) && transformed.tools.length > 0) {
        delete transformed.reasoning_effort
      }
      return transformed
    }
    assert.deepEqual(
      transform('gpt-5.6-terra-20260709-global', {
        max_tokens: 100,
        temperature: 0,
        tools: [{ type: 'function' }],
        reasoning_effort: 'low',
      }),
      { max_completion_tokens: 100, tools: [{ type: 'function' }] }
    )
    assert.deepEqual(
      transform('gpt-4.1-mini-20250414-global', { max_tokens: 100 }),
      {
        max_tokens: 100,
      }
    )
  } finally {
    await vite.close()
  }
})

test('provider fails fast with safe errors when proxy config is missing', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const key = process.env.AZURE_OPENAI_API_KEY
  try {
    delete process.env.AZURE_OPENAI_ENDPOINT
    delete process.env.AZURE_OPENAI_API_KEY
    await assert.rejects(
      () => vite.ssrLoadModule('/src/mastra/index.ts?proxy-missing=1'),
      /AZURE_PROXY_(ENDPOINT|CREDENTIAL)_MISSING/
    )
  } finally {
    if (endpoint !== undefined) process.env.AZURE_OPENAI_ENDPOINT = endpoint
    if (key !== undefined) process.env.AZURE_OPENAI_API_KEY = key
    await vite.close()
  }
})
