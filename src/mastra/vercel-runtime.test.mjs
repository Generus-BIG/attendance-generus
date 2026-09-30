import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

test('pnpm exposes Supabase parent types to the Vercel compiler', async () => {
  const workspace = await readFile(
    new URL('../../pnpm-workspace.yaml', import.meta.url),
    'utf8'
  )
  // Vercel's language-service host resolves from logical node_modules paths,
  // not pnpm's real paths. The AuthClient parent must be publicly resolvable.
  assert.match(workspace, /publicHoistPattern:\s*\n\s*- ['"]@supabase\/\*['"]/)
})

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(target) : [target]
    })
  )
  return files.flat().filter((file) => file.endsWith('.ts'))
}

test('Vercel routes nested Assistant paths through the catch-all function', async () => {
  const config = JSON.parse(
    await readFile(new URL('../../vercel.json', import.meta.url), 'utf8')
  )
  assert.ok(
    config.rewrites.some(
      (rewrite) =>
        rewrite.source === '/api/assistant/:path*' &&
        rewrite.destination === '/api/assistant/[...path]'
    )
  )
})

test('Vercel Assistant runtime uses resolvable ESM imports', async () => {
  const files = [
    ...(await sourceFiles(new URL('.', import.meta.url).pathname)),
    ...(await sourceFiles(
      new URL('../../api/assistant', import.meta.url).pathname
    )),
  ]
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const extensionless = source.match(
      /(?:from\s+|import\()['"]\.\.?\/[^'"]+(?<!\.js)['"]/g
    )
    assert.equal(extensionless, null, `${file}: ${extensionless?.join(', ')}`)
  }
})
