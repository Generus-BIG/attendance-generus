import { createServer } from 'vite'
import { RequestContext } from '@mastra/core/request-context'
import assert from 'node:assert/strict'
import test from 'node:test'

const K = '123e4567-e89b-42d3-a456-426614174001'

test('cohesive tools use caller JWT and GET-only Supabase reads', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    for (const [modulePath, factory, tool, input] of [
      [
        '/src/mastra/tools/absensi.ts',
        'createAbsensiTools',
        'readAbsensiData',
        { operation: 'participants', allGroups: true },
      ],
      [
        '/src/mastra/tools/lupg.ts',
        'createLupgTools',
        'readLupgReports',
        { operation: 'sensus', allGroups: true },
      ],
      [
        '/src/mastra/tools/lupg.ts',
        'createLupgTools',
        'readLupgOperations',
        { operation: 'definitions', definition: 'categories' },
      ],
    ]) {
      const mod = await vite.ssrLoadModule(modulePath)
      const seen = []
      const tools = mod[factory]({
        url: 'https://fixture.supabase.co',
        key: 'public-anon-key',
        fetch: async (url, init) => {
          assert.equal(
            new Headers(init.headers).get('authorization'),
            'Bearer verified-token'
          )
          assert.ok(!init.method || init.method === 'GET')
          seen.push(String(url))
          const table = new URL(url).pathname.split('/').pop()
          return Response.json(
            table === 'lookup_values' ? [{ id: K, value: 'Cakra' }] : []
          )
        },
      })
      const result = await tools[tool].execute(input, {
        requestContext: new RequestContext(
          Object.entries({
            userId: 'verified-user',
            role: 'admin',
            accessToken: 'verified-token',
            workspace: modulePath.includes('lupg') ? 'lupg' : 'absensi',
            modelId: 'gpt-5.6-terra',
          })
        ),
        abortSignal: new AbortController().signal,
      })
      assert.ok(seen.length > 0)
      assert.doesNotMatch(JSON.stringify(result), /verified-token/)
    }
  } finally {
    await vite.close()
  }
})
