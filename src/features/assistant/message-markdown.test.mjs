import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

const view = {
  summary: 'September attendance',
  source: {
    workspace: 'absensi',
    scope: 'All authorized kelompok',
    month: '2026-09',
    route: '/admin/dashboard',
    section: 'Attendance',
  },
  columns: [
    { key: 'month', label: 'Month', format: 'date' },
    { key: 'present', label: 'Present', format: 'number' },
  ],
  rows: [
    { month: '2026-08', present: 12 },
    { month: '2026-09', present: 18 },
  ],
  presentation: {
    kind: 'cartesian',
    chartType: 'line',
    xKey: 'month',
    series: [{ key: 'present', label: 'Present', valueType: 'number' }],
  },
}

test('assistant copy markdown serializes text and data views', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { buildCopyMarkdown, dataViewToMarkdown, hasExportableContent } =
      await vite.ssrLoadModule('/src/features/assistant/message-markdown.ts')
    const markdown = dataViewToMarkdown(view)
    assert.match(markdown, /## Attendance/)
    assert.match(markdown, /\| Month \| Present \|/)
    assert.match(markdown, /\| 2026-08 \| 12 \|/)
    assert.equal(
      buildCopyMarkdown([
        { type: 'text', text: '  Hello  ' },
        { type: 'tool-call', result: view },
        { type: 'tool-call', result: { secret: 'nope' } },
        { type: 'text', text: '   ' },
      ]),
      `Hello\n\n${markdown}`
    )
    assert.equal(
      buildCopyMarkdown([{ type: 'tool-call', result: { secret: 'nope' } }]),
      ''
    )
    assert.equal(hasExportableContent([{ type: 'text', text: 'Hi' }]), true)
    assert.equal(hasExportableContent([{ type: 'text', text: '   ' }]), false)
  } finally {
    await vite.close()
  }
})
