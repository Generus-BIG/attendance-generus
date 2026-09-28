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
  assert.ok((sql.match(/p\.is_khusus = false/g) ?? []).length >= 5)
  assert.match(sql, /'GPN A', 'GPN B', 'AR', 'APR', 'Paud', 'ACR'/)
  assert.match(sql, /SET search_path = public, pg_temp/g)
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
  assert.match(ui, /Sinkronisasi gagal:/)
})
