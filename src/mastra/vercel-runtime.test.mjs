import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

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
