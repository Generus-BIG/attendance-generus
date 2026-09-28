import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sensus sync services expose the stage, apply, and RLS read APIs', async () => {
  const source = await readFile(
    new URL('./services.ts', import.meta.url),
    'utf8'
  )

  for (const name of [
    'stageSensusSync',
    'applySensusSyncItems',
    'listSensusRuns',
    'listSensusItems',
  ]) {
    assert.match(source, new RegExp(`export async function ${name}`))
  }

  assert.match(source, /functions\.invoke\('sensus-sync'/)
  assert.match(source, /\.from\('sensus_sync_runs'\)/)
  assert.match(source, /\.from\('sensus_sync_items'\)/)
})
