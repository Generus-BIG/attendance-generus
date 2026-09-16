import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('tool cards wait for an output before they claim to be complete', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { getToolResultState } = await vite.ssrLoadModule(
      '/src/features/assistant/tool-result-state.ts'
    )
    assert.equal(typeof getToolResultState, 'function')
    assert.equal(
      getToolResultState({ type: 'complete' }, undefined, false),
      'running'
    )
    assert.equal(
      getToolResultState({ type: 'running' }, { rows: [] }, false),
      'complete'
    )
    assert.equal(
      getToolResultState(
        { type: 'incomplete', reason: 'cancelled' },
        undefined,
        false
      ),
      'cancelled'
    )
    assert.equal(
      getToolResultState({ type: 'incomplete' }, undefined, false),
      'query-error'
    )
    assert.equal(
      getToolResultState({ type: 'complete' }, undefined, true),
      'query-error'
    )
  } finally {
    await vite.close()
  }
})
