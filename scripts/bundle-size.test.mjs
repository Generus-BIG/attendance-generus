import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'vite'

test('production chunks stay bounded and heavy features remain lazy', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } })
  const chunks = result.output.filter((file) => file.type === 'chunk')
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
  const visited = new Set()
  const visit = (chunk) => {
    if (visited.has(chunk.fileName)) return
    visited.add(chunk.fileName)
    for (const name of chunk.imports) {
      const dependency = byName.get(name)
      if (dependency) visit(dependency)
    }
  }
  chunks.filter((chunk) => chunk.isEntry).forEach(visit)
  for (const chunk of chunks) {
    const modules = Object.keys(chunk.modules)
    const excel = modules.some((id) => id.endsWith('/exceljs/dist/exceljs.min.js'))
    // ponytail: ExcelJS ships one prebuilt browser module (~939 kB); splitting
    // it requires replacing its browser build/library, not a manualChunks rule.
    assert.ok(
      Buffer.byteLength(chunk.code) <= (excel ? 1_000_000 : 500_000),
      chunk.fileName
    )
    if (
      excel ||
      modules.some((id) => /\/node_modules\/@assistant-ui\//.test(id))
    )
      assert.ok(!visited.has(chunk.fileName), `${chunk.fileName} loaded eagerly`)
  }
})
