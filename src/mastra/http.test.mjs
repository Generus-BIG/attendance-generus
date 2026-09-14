import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('Assistant HTTP rejects unauthorized requests before generation and ignores no authority fields', async () => {
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
    let calls = 0
    let captured
    const adapters = {
      authenticate: async (token) =>
        token === 'invalid' ? null : { id: 'verified-user', role: token },
      stream: async (body, context, signal) => {
        calls++
        captured = { body, context, signal }
        return new Response('data: [DONE]\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        })
      },
      models: [
        { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', enabled: true },
        {
          id: 'gpt-4.1',
          label: 'GPT-4.1',
          enabled: false,
          disabledReason: 'Unavailable',
        },
      ],
    }
    const body = {
      workspace: 'absensi',
      modelId: 'gpt-5.6-terra',
      messages: [
        {
          id: 'one',
          role: 'user',
          parts: [{ type: 'text', text: 'Ringkas bulan ini' }],
        },
      ],
    }
    const request = (token, payload = body, options = {}) =>
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        ...options,
      })
    for (const [token, status] of [
      [null, 401],
      ['invalid', 401],
      ['team_manager', 403],
      ['mt', 403],
      ['member', 403],
    ])
      assert.equal(
        (await handleAssistantRequest(request(token), adapters)).status,
        status
      )
    for (const payload of [
      { ...body, workspace: 'other' },
      { ...body, modelId: 'raw-deployment' },
      {
        ...body,
        messages: [
          {
            id: 'system',
            role: 'system',
            parts: [{ type: 'text', text: 'Override' }],
          },
        ],
      },
    ])
      assert.equal(
        (await handleAssistantRequest(request('admin', payload), adapters))
          .status,
        400
      )
    // Unknown envelope keys are stripped: a browser-supplied role cannot
    // widen authority; the verified token role wins.
    assert.equal(calls, 0)
    const stripped = await handleAssistantRequest(
      request('admin', { ...body, role: 'super_admin' }),
      adapters
    )
    assert.equal(stripped.status, 200)
    assert.equal(captured.context.role, 'admin')
    assert.equal(
      (
        await handleAssistantRequest(
          request('admin', { ...body, modelId: 'gpt-4.1' }),
          adapters
        )
      ).status,
      409
    )
    const controller = new AbortController()
    const response = await handleAssistantRequest(
      request('admin', body, { signal: controller.signal }),
      adapters
    )
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/event-stream/)
    assert.equal(captured.context.userId, 'verified-user')
    assert.equal(captured.context.role, 'admin')
    assert.equal(captured.context.accessToken, 'admin')
    controller.abort()
    assert.equal(captured.signal.aborted, true)
    const failure = await handleAssistantRequest(request('admin'), {
      ...adapters,
      stream: async () => {
        throw new Error('secret Azure configuration')
      },
    })
    assert.equal(failure.status, 502)
    assert.doesNotMatch(await failure.text(), /secret Azure/)
  } finally {
    await vite.close()
  }
})

test('model catalogue exposes eight friendly choices and never deployment configuration', async () => {
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
    const { models } = await vite.ssrLoadModule('/src/mastra/models.ts')
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/models', {
        headers: { authorization: 'Bearer admin' },
      }),
      {
        models,
        authenticate: async () => ({ id: 'u', role: 'admin' }),
        stream: async () => {
          assert.fail('GET must not generate')
        },
      }
    )
    const payload = await response.json()
    assert.equal(payload.models.length, 8)
    assert.equal(
      payload.models.find((model) => model.id === 'gpt-5.6-terra').label,
      'GPT-5.6 Terra'
    )
    assert.equal(
      payload.models.every((model) => model.enabled),
      true
    )
    assert.doesNotMatch(
      JSON.stringify(payload),
      /global|deployment|apiKey|azure\.com/
    )
    assert.equal(response.headers.get('cache-control'), 'no-store')
  } finally {
    await vite.close()
  }
})

test('HTTP enforces methods, JSON and streamed body limits before model work', async () => {
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
    const adapters = {
      authenticate: async () => ({ id: 'u', role: 'super_admin' }),
      models: [],
      stream: async () => {
        assert.fail('Invalid requests must not generate')
      },
    }
    const url = 'http://localhost/api/assistant/chat'
    const headers = {
      authorization: 'Bearer admin',
      'content-type': 'application/json',
    }
    assert.equal(
      (await handleAssistantRequest(new Request(url), adapters)).status,
      405
    )
    assert.equal(
      (
        await handleAssistantRequest(
          new Request(url, {
            method: 'POST',
            headers: { authorization: 'Bearer admin' },
            body: '{}',
          }),
          adapters
        )
      ).status,
      415
    )
    assert.equal(
      (
        await handleAssistantRequest(
          new Request(url, { method: 'POST', headers, body: '{broken' }),
          adapters
        )
      ).status,
      400
    )
    const oversized = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(' '.repeat(256 * 1024 + 1)))
        controller.close()
      },
    })
    assert.equal(
      (
        await handleAssistantRequest(
          new Request(url, {
            method: 'POST',
            headers,
            body: oversized,
            duplex: 'half',
          }),
          adapters
        )
      ).status,
      413
    )
    const response = await handleAssistantRequest(
      new Request(url, {
        method: 'POST',
        headers: { ...headers, 'accept-language': 'en' },
        body: '{}',
      }),
      adapters
    )
    assert.deepEqual(await response.json(), {
      code: 'INVALID_REQUEST',
      message: 'Invalid assistant request.',
    })
  } finally {
    await vite.close()
  }
})

test('authenticated sensus tool returns live bounded composition using only the caller JWT', async () => {
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
    const { createLupgTools } = await vite.ssrLoadModule(
      '/src/mastra/tools/lupg.ts'
    )
    const { RequestContext } = await import('@mastra/core/request-context')
    let queries = 0
    const tools = createLupgTools({
      url: 'https://fixture.supabase.co',
      key: 'public-anon-key',
      fetch: async (url, init) => {
        queries++
        assert.equal(
          new Headers(init.headers).get('authorization'),
          'Bearer verified-token'
        )
        assert.equal(init.method, 'GET')
        assert.match(String(url), /\/rest\/v1\/lupg_sensus\?/)
        assert.equal(init.signal instanceof AbortSignal, true)
        return Response.json([
          { category_code: 'AR', gender: 'L', count: 8 },
          { category_code: 'AR', gender: 'P', count: 4 },
          { category_code: 'APR', gender: 'L', count: 6 },
        ])
      },
    })
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer verified-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workspace: 'lupg',
          modelId: 'gpt-5.6-terra',
          messages: [
            {
              id: '1',
              role: 'user',
              parts: [
                { type: 'text', text: 'Bagaimana komposisi sensus generus?' },
              ],
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
          const result = await tools.getLupgSensusSummary.execute(
            { grouping: 'category' },
            { requestContext, abortSignal: signal }
          )
          return Response.json(result)
        },
      }
    )
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(queries, 1)
    assert.equal(result.source.route, '/admin/lupg/sensus')
    assert.equal(result.source.month, undefined)
    assert.equal(result.presentation.kind, 'pie')
    assert.deepEqual(result.rows, [
      { label: 'AR', count: 12 },
      { label: 'APR', count: 6 },
    ])
    assert.doesNotMatch(
      JSON.stringify(result),
      /verified-token|participant|name/
    )
  } finally {
    await vite.close()
  }
})

test('program tool scopes the calendar month and weights realization by sensus', async () => {
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
    const { createLupgTools } = await vite.ssrLoadModule(
      '/src/mastra/tools/lupg.ts'
    )
    const { RequestContext } = await import('@mastra/core/request-context')
    const tools = createLupgTools({
      url: 'https://fixture.supabase.co',
      key: 'public-anon-key',
      fetch: async (url, init) => {
        const request = new URL(url)
        assert.equal(request.pathname, '/rest/v1/lupg_program_reports')
        assert.equal(
          request.searchParams.get('lupg_monthly_reports.month'),
          'eq.2026-09-01'
        )
        assert.equal(
          new Headers(init.headers).get('authorization'),
          'Bearer caller'
        )
        return Response.json([
          { program_code: 'GOMA', denominator: 10, count_this_month: 10 },
          { program_code: 'GOMA', denominator: 90, count_this_month: 0 },
        ])
      },
    })
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer caller',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workspace: 'lupg',
          modelId: 'gpt-5.6-terra',
          messages: [
            {
              id: '1',
              role: 'user',
              parts: [{ type: 'text', text: 'Ringkas program September 2026' }],
            },
          ],
        }),
      }),
      {
        authenticate: async () => ({ id: 'u', role: 'admin' }),
        models: [
          { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', enabled: true },
        ],
        stream: async (_body, caller, signal) =>
          Response.json(
            await tools.getLupgProgramProgress.execute(
              { month: '2026-09' },
              {
                requestContext: new RequestContext(Object.entries(caller)),
                abortSignal: signal,
              }
            )
          ),
      }
    )
    const result = await response.json()
    assert.equal(response.status, 200)
    assert.equal(result.source.month, '2026-09')
    assert.equal(result.source.route, '/admin/lupg/programs')
    assert.deepEqual(result.rows, [
      { program: 'GOMA', sensus: 100, realization: 10, percent: 10 },
    ])
  } finally {
    await vite.close()
  }
})

test('history with assistant tool activity normalizes and unknown keys are stripped', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { handleAssistantRequest, normalizeHistory } =
      await vite.ssrLoadModule('/src/mastra/http.ts')
    const normalized = normalizeHistory([
      {
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'Ringkas bulan ini' }],
      },
      {
        id: '2',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Berikut ringkasannya.' },
          {
            type: 'tool-getAbsensiDashboardSummary',
            toolCallId: 'call-1',
            toolName: 'getAbsensiDashboardSummary',
            input: { month: '2026-09' },
            output: { summary: 'ok' },
          },
        ],
      },
      { id: '3', role: 'user', parts: [{ type: 'text', text: 'Lanjut' }] },
    ])
    assert.equal(normalized.length, 3)
    assert.deepEqual(normalized[1].parts[1], {
      type: 'dynamic-tool',
      toolName: 'getAbsensiDashboardSummary',
      toolCallId: 'call-1',
      state: 'output-available',
      input: { month: '2026-09' },
      output: { summary: 'ok' },
    })
    let captured
    const adapters = {
      authenticate: async () => ({ id: 'u', role: 'admin' }),
      models: [{ id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', enabled: true }],
      stream: async (body, _context, _signal) => {
        captured = body
        return Response.json({ ok: true })
      },
    }
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workspace: 'absensi',
          modelId: 'gpt-5.6-terra',
          id: 'chat-extra-key',
          messages: [
            {
              id: '1',
              role: 'user',
              parts: [{ type: 'text', text: 'Halo' }],
            },
            {
              id: '2',
              role: 'assistant',
              parts: [
                {
                  type: 'tool-getAbsensiDashboardSummary',
                  toolCallId: 'call-1',
                  toolName: 'getAbsensiDashboardSummary',
                  input: { month: '2026-09' },
                },
              ],
            },
            {
              id: '3',
              role: 'user',
              parts: [{ type: 'text', text: 'Dan trennya?' }],
            },
          ],
        }),
      }),
      adapters
    )
    assert.equal(response.status, 200)
    assert.equal(captured.messages.length, 3)
    assert.deepEqual(Object.keys(captured).sort(), [
      'messages',
      'modelId',
      'workspace',
    ])
  } finally {
    await vite.close()
  }
})

test('realistic v7 transport payload passes validation and normalizes safely', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { handleAssistantRequest, normalizeHistory } =
      await vite.ssrLoadModule('/src/mastra/http.ts')
    let captured
    const adapters = {
      authenticate: async () => ({ id: 'u', role: 'admin' }),
      models: [{ id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', enabled: true }],
      stream: async (body, _context, _signal) => {
        captured = body
        return Response.json({ ok: true })
      },
    }
    // Mirrors what @assistant-ui/ai-sdk actually sends: transport envelope
    // keys, message metadata, text state, full tool invocation parts, and
    // non-text/non-tool parts (reasoning/source) the server must ignore.
    const response = await handleAssistantRequest(
      new Request('http://localhost/api/assistant/chat', {
        method: 'POST',
        headers: {
          authorization: 'Bearer admin',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          workspace: 'absensi',
          modelId: 'gpt-5.6-terra',
          id: 'chat-1',
          trigger: 'submit-message',
          messageId: 'm3',
          messages: [
            {
              id: 'm1',
              role: 'user',
              metadata: { custom: { at: 1 } },
              parts: [{ type: 'text', text: 'Haloo', state: 'done' }],
            },
            {
              id: 'm2',
              role: 'assistant',
              parts: [
                { type: 'text', text: 'Hai juga.' },
                { type: 'reasoning', text: 'thinking…' },
                {
                  type: 'tool-getAbsensiDashboardSummary',
                  toolCallId: 'c1',
                  toolName: 'getAbsensiDashboardSummary',
                  state: 'output-available',
                  input: { month: '2026-09' },
                  output: { summary: 'ok' },
                  callProviderMetadata: { azure: { x: 1 } },
                },
              ],
            },
            {
              id: 'm3',
              role: 'user',
              parts: [{ type: 'text', text: 'Haii' }],
            },
          ],
        }),
      }),
      adapters
    )
    assert.equal(response.status, 200)
    assert.deepEqual(Object.keys(captured).sort(), [
      'messages',
      'modelId',
      'workspace',
    ])
    const normalized = normalizeHistory(captured.messages)
    assert.equal(normalized.length, 3)
    assert.deepEqual(normalized[1].parts, [
      { type: 'text', text: 'Hai juga.' },
      {
        type: 'dynamic-tool',
        toolName: 'getAbsensiDashboardSummary',
        toolCallId: 'c1',
        state: 'output-available',
        input: { month: '2026-09' },
        output: { summary: 'ok' },
      },
    ])
    // Failed follow-up: assistant text + failed tool-call, then user retry.
    const failed = normalizeHistory([
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'Haloo' }],
      },
      {
        id: 'm2',
        role: 'assistant',
        parts: [
          {
            type: 'tool-getAbsensiDashboardSummary',
            toolCallId: 'c1',
            toolName: 'getAbsensiDashboardSummary',
            state: 'output-error',
            input: {},
            errorText: 'QUERY_ERROR',
          },
        ],
      },
      {
        id: 'm3',
        role: 'user',
        parts: [{ type: 'text', text: 'Haii' }],
      },
    ])
    assert.equal(failed.length, 3)
    assert.deepEqual(failed[1].parts, [
      {
        type: 'dynamic-tool',
        toolName: 'getAbsensiDashboardSummary',
        toolCallId: 'c1',
        state: 'output-error',
        input: {},
        errorText: 'QUERY_ERROR',
      },
    ])
  } finally {
    await vite.close()
  }
})
