import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('stored conversations retain only text and validated cards; exchange deletion preserves later messages', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { sanitizeMessages, deletionIds, rebuildWorkingMemory } =
      await vite.ssrLoadModule('/src/mastra/conversation-content.ts')
    const msg = (id, role, parts) => ({
      id,
      role,
      threadId: 'thread',
      resourceId: 'owner',
      createdAt: new Date(),
      content: { format: 2, parts, metadata: { accessToken: 'secret' } },
    })
    const messages = [
      msg('u1', 'user', [{ type: 'text', text: 'Cakra' }]),
      msg('a1', 'assistant', [
        { type: 'text', text: 'Answer' },
        { type: 'reasoning', text: 'private' },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'bad',
            toolName: 'fake',
            state: 'result',
            args: {},
            result: { invented: 42 },
          },
        },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolCallId: 'chart',
            toolName: 'readAbsensiData',
            state: 'result',
            args: {},
            result: {
              summary: 'Trend',
              source: {
                workspace: 'absensi',
                scope: 'Cakra',
                month: '2026-09',
                route: '/admin/dashboard',
                section: 'dashboard',
              },
              columns: [
                { key: 'date', label: 'Tanggal', format: 'date' },
                { key: 'hadir', label: 'Hadir', format: 'number' },
              ],
              rows: [
                { date: '2026-09-13', hadir: 10 },
                { date: '2026-09-14', hadir: 12 },
              ],
              presentation: {
                kind: 'cartesian',
                chartType: 'line',
                xKey: 'date',
                series: [{ key: 'hadir', label: 'Hadir', valueType: 'number' }],
              },
            },
          },
        },
      ]),
      msg('u2', 'user', [{ type: 'text', text: 'All groups' }]),
      msg('a2', 'assistant', [{ type: 'text', text: 'Later' }]),
    ]
    const clean = sanitizeMessages(messages, { modelId: 'model', runId: 'run' })
    assert.doesNotMatch(JSON.stringify(clean), /secret|private|invented/)
    assert.equal(clean[1].content.parts.length, 2)
    assert.equal(clean[1].content.parts[0].text, 'Answer')
    assert.deepEqual(
      clean[1].content.parts[1].toolInvocation.result.presentation,
      {
        kind: 'cartesian',
        chartType: 'line',
        xKey: 'date',
        series: [{ key: 'hadir', label: 'Hadir', valueType: 'number' }],
      }
    )
    assert.equal(clean[1].content.metadata.modelId, 'model')
    assert.deepEqual(deletionIds(clean, 'u1'), ['u1', 'a1'])
    assert.deepEqual(deletionIds(clean, 'a1'), ['a1'])
    assert.throws(() => deletionIds(clean, 'foreign'), /NOT_FOUND/)
    const rebuilt = rebuildWorkingMemory(clean.slice(2))
    assert.doesNotMatch(rebuilt, /Cakra|Answer/)
    assert.match(rebuilt, /All groups/)
  } finally {
    await vite.close()
  }
})
