import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('agent streams text, tool call and retry metadata through the HTTP seam', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { handleAssistantRequest } = await vite.ssrLoadModule(
      '/src/mastra/http.ts'
    )
    const { createAbsensiTools } = await vite.ssrLoadModule(
      '/src/mastra/tools/absensi.ts'
    )
    const { RequestContext } = await import('@mastra/core/request-context')
    const tools = createAbsensiTools({
      url: 'https://fixture.supabase.co',
      key: 'public-anon-key',
      fetch: async () => Response.json([]),
    })
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer verified-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workspace: 'absensi',
          modelId: 'gpt-5.6-terra',
          messages: [
            {
              id: '1',
              role: 'user',
              parts: [{ type: 'text', text: 'Ringkas bulan ini' }],
            },
          ],
        }),
      }),
      {
        authenticate: async () => ({ id: 'verified-user', role: 'admin' }),
        models: [
          { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', enabled: true },
        ],
        stream: async (_body, caller, signal) => {
          const requestContext = new RequestContext(Object.entries(caller))
          const result = await tools.getAbsensiDashboardSummary.execute(
            { month: '2026-09' },
            { requestContext, abortSignal: signal }
          )
          assert.equal(result.source.route, '/admin/dashboard')
          assert.equal(result.source.month, '2026-09')
          assert.equal(result.presentation.kind, 'table')
          return Response.json({ modelId: caller.modelId, result })
        },
      }
    )
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.modelId, 'gpt-5.6-terra')
    assert.equal(payload.result.source.workspace, 'absensi')
  } finally {
    await vite.close()
  }
})
