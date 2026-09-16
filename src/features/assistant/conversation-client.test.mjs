import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('conversation API errors retain HTTP status for retry decisions', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { listAssistantThreads } = await vite.ssrLoadModule(
      '/src/features/assistant/conversation-client.ts'
    )
    globalThis.fetch = async () =>
      new Response('unavailable', { status: 503, statusText: 'Unavailable' })
    await assert.rejects(listAssistantThreads('token', 'lupg'), (error) => {
      assert.equal(error.status, 503)
      assert.equal(error.message, 'unavailable')
      return true
    })
  } finally {
    await vite.close()
  }
})

test('conversation API paths stay in one client seam', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const {
      ASSISTANT_THREAD_TITLE_MAX,
      assistantApiPath,
      mergeAssistantHistory,
      prepareAssistantChatRequest,
      renameAssistantThread,
      deleteAssistantMessage,
    } = await vite.ssrLoadModule(
      '/src/features/assistant/conversation-client.ts'
    )
    assert.equal(assistantApiPath('threads'), '/api/assistant/threads')
    assert.equal(
      assistantApiPath('threads', 'thread/with spaces', 'messages'),
      '/api/assistant/threads/thread%2Fwith%20spaces/messages'
    )
    assert.equal(ASSISTANT_THREAD_TITLE_MAX, 80)
    let requested
    globalThis.fetch = async (path, init) => {
      requested = { path, init }
      return Response.json({ thread: {} })
    }
    await renameAssistantThread('token', 'thread', 'lupg', 'Title')
    assert.equal(requested.path, '/api/assistant/threads/thread?workspace=lupg')
    assert.equal(JSON.parse(requested.init.body).title.length, 5)
    globalThis.fetch = async (path, init) => {
      requested = { path, init }
      return Response.json({})
    }
    await deleteAssistantMessage('token', 'thread', 'message', 'lupg')
    assert.equal(
      requested.path,
      '/api/assistant/threads/thread/messages/message?workspace=lupg'
    )
    assert.deepEqual(
      prepareAssistantChatRequest(
        JSON.stringify({
          messages: [
            { id: 'old', role: 'user' },
            { id: 'new', role: 'user' },
          ],
        }),
        {
          threadId: 'stable-thread',
          runId: 'fresh-run',
          workspace: 'lupg',
          modelId: 'model',
        }
      ),
      {
        messages: [{ id: 'new', role: 'user' }],
        threadId: 'stable-thread',
        runId: 'fresh-run',
        workspace: 'lupg',
        model: 'model',
        modelId: 'model',
      }
    )
    assert.deepEqual(
      mergeAssistantHistory(
        [
          { id: 'm1', role: 'user', parts: [] },
          { id: 'm2', role: 'assistant', parts: [] },
        ],
        [
          { id: 'm2', role: 'assistant', parts: [] },
          { id: 'm3', role: 'user', parts: [] },
        ]
      ).map((message) => message.id),
      ['m1', 'm2', 'm3']
    )
  } finally {
    await vite.close()
  }
})
