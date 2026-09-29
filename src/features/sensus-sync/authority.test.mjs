import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('khusus attendance migration guards every public and Intensif authority path', async () => {
  const sql = await source(
    'supabase/migrations/20260929030000_khusus_attendance_guards.sql'
  )

  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.search_form_participants/
  )
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.submit_attendance_guarded/
  )
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.get_public_dashboard_payload/
  )
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.fn_lupg_intensif_validate_attendance/
  )
  assert.ok((sql.match(/p\.is_khusus = false/g) ?? []).length >= 3)
  assert.match(sql, /'GPN A', 'GPN B', 'AR', 'APR', 'Paud', 'ACR'/)
  assert.match(sql, /SET search_path = public, pg_temp/g)
})

test('khusus participants can attend forms but never affect rates', async () => {
  const participation = await readFile(
    'supabase/migrations/20260929100000_khusus_attendance_participation.sql',
    { encoding: 'utf8' }
  )

  // Public form search and submission include khusus participants.
  assert.match(
    participation,
    /CREATE OR REPLACE FUNCTION public\.search_form_participants/
  )
  assert.match(
    participation,
    /CREATE OR REPLACE FUNCTION public\.submit_attendance_guarded/
  )
  assert.ok(!participation.includes('is_khusus'))
})

test('apply preserves the existing participant name on similar resolve', async () => {
  const migration = await readFile(
    'supabase/migrations/20260929110000_sensus_sync_preserve_name_on_resolve.sql',
    { encoding: 'utf8' }
  )

  // The UPDATE branch rewrites every desabig field except name — the local
  // name stays so approvals history and attendance records remain readable.
  assert.match(migration, /update public\.participants/)
  assert.match(migration, /birth_date = v_item\.source_birth_date/)
  assert.match(migration, /category_id = v_category_id/)
  assert.match(migration, /is_khusus = v_item\.source_khusus/)
  assert.ok(!migration.includes('name ='))
})

test('similar staging and review require an explicit participant choice', async () => {
  const edge = await source('supabase/functions/sensus-sync/index.ts')
  const ui = await source(
    'src/features/approvals/components/sensus-sync-tab.tsx'
  )

  assert.match(edge, /matched\.confidence === 'similar' \? null/)
  assert.match(edge, /kelompok: candidate\.kelompok/)
  assert.match(edge, /gender: candidate\.gender/)
  assert.match(ui, /candidates\.filter\(isPending\)/)
  assert.match(ui, /candidates\.filter\(isAppliable\)/)
  assert.match(ui, /Synchronization failed:/)
  assert.match(ui, /replaced by desabig/)
  assert.match(ui, /} selected/)
})
