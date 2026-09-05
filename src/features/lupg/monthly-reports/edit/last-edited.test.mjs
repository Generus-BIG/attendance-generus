import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL(
    '../../../../../supabase/migrations/20260905000000_track_lupg_monthly_report_last_editor.sql',
    import.meta.url
  ),
  'utf8'
)
const page = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
const sensus = readFileSync(
  new URL('../sections/sensus-preview-section.tsx', import.meta.url),
  'utf8'
)

test('every report-owned section updates the report edit audit', () => {
  const triggers = migration.match(
    /CREATE TRIGGER lupg_\w+_touch_monthly_report/g
  )

  assert.equal(triggers?.length, 8)
  assert.match(
    migration,
    /last_edited_at = now\(\), last_edited_by = auth\.uid\(\)/
  )
})

test('sensus saves touch the open monthly report', () => {
  assert.match(sensus, /useUpsertSensusCellForReport/)
  assert.match(sensus, /monthlyReportId=\{report\.id\}/)
})

test('sidebar renders the approved two-line English copy', () => {
  assert.match(page, /Last edited by/)
  assert.match(page, /last_edited_at/)
  assert.match(page, /last_editor_display_name/)
})
