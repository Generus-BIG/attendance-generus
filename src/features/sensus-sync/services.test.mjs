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
    'getSensusSyncSettings',
    'setSensusSyncAutoApplyNew',
    'configureSensusSyncCron',
  ]) {
    assert.match(source, new RegExp(`export async function ${name}`))
  }

  assert.match(source, /functions\.invoke\('sensus-sync'/)
  assert.match(source, /\.from\('sensus_sync_runs'\)/)
  assert.match(source, /\.from\('sensus_sync_items'\)/)
  assert.match(source, /\.from\('sensus_sync_settings'\)/)
  assert.match(source, /rpc\('sensus_sync_cron_configure'/)
  assert.match(source, /every_3_days/)
  assert.match(source, /every_2_weeks/)
})

test('advanced cron migration preserves admin-only, validated scheduling', async () => {
  const source = await readFile(
    new URL('../../../supabase/migrations/20260929050000_sensus_sync_advanced_cron.sql', import.meta.url),
    'utf8'
  )

  for (const mode of [
    'daily',
    'every_3_days',
    'weekly',
    'every_2_weeks',
    'custom',
  ]) {
    assert.match(source, new RegExp(`'${mode}'`))
  }
  assert.match(source, /v_role not in \('super_admin', 'admin'\)/)
  assert.match(source, /Custom cron must use five cron fields/)
  assert.match(source, /set search_path = public, pg_temp/)
})
