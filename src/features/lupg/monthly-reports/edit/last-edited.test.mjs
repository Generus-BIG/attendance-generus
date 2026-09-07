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
const submitCard = readFileSync(
  new URL('../components/submit-card.tsx', import.meta.url),
  'utf8'
)
const submissionMigration = readFileSync(
  new URL(
    '../../../../../supabase/migrations/20260906000000_lupg_submission_editor_label.sql',
    import.meta.url
  ),
  'utf8'
)
const historyMigration = readFileSync(
  new URL(
    '../../../../../supabase/migrations/20260906010000_lupg_monthly_report_edit_history.sql',
    import.meta.url
  ),
  'utf8'
)
const sensus = readFileSync(
  new URL('../sections/sensus-preview-section.tsx', import.meta.url),
  'utf8'
)
const sensusPrivilegeFixMigration = readFileSync(
  new URL(
    '../../../../../supabase/migrations/20260906010300_fix_lupg_sensus_rpc_definer.sql',
    import.meta.url
  ),
  'utf8'
)
const activityPanel = readFileSync(
  new URL('../../dashboard/report-activity-panel.tsx', import.meta.url),
  'utf8'
)
const batchHistoryMigration = readFileSync(
  new URL(
    '../../../../../supabase/migrations/20260906010500_complete_lupg_monthly_audit_history.sql',
    import.meta.url
  ),
  'utf8'
)
const dashboardRoute = readFileSync(
  new URL('../../../../routes/admin/lupg/dashboard.tsx', import.meta.url),
  'utf8'
)
const sarprasSection = readFileSync(
  new URL('../sections/sarpras-section.tsx', import.meta.url),
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

test('confirmer visibility is independent from editor resolution', () => {
  assert.match(page, /report\.submitted_by_label/)
  assert.match(page, /report\.last_editor_display_name \?\? 'unknown'/)
})

test('submission stores the typed editor label', () => {
  assert.match(submissionMigration, /submitted_by_label text/)
  assert.match(submissionMigration, /Submission editor label is required/)
  assert.match(submitCard, /submittedByLabel/)
})

test('history is append-only and parent scoped', () => {
  assert.match(
    historyMigration,
    /CREATE TABLE public\.lupg_monthly_report_edit_history/
  )
  assert.match(historyMigration, /CREATE TRIGGER lupg_program_reports_history/)
  assert.match(historyMigration, /CREATE TRIGGER lupg_activity_photos_history/)
  assert.match(historyMigration, /lupg_upsert_sensus_for_report/)
  assert.match(historyMigration, /lupg_mr_readable\(monthly_report_id\)/)
  assert.doesNotMatch(historyMigration, /CREATE POLICY .* FOR INSERT/)
  assert.doesNotMatch(historyMigration, /CREATE POLICY .* FOR UPDATE/)
  assert.doesNotMatch(historyMigration, /CREATE POLICY .* FOR DELETE/)
})

test('monthly audit dashboard has one batch read service and query', () => {
  const service = readFileSync(
    new URL('../../services/monthly-report.service.ts', import.meta.url),
    'utf8'
  )
  const hooks = readFileSync(
    new URL('../../hooks/use-lupg-queries.ts', import.meta.url),
    'utf8'
  )
  assert.match(service, /listMonthlyAuditDashboard/)
  assert.match(service, /lupg_get_monthly_audit_dashboard/)
  assert.match(hooks, /useMonthlyAuditDashboard/)
  assert.match(hooks, /monthlyAuditDashboard: \(month: string\)/)
})

test('history RPC limits server-side', () => {
  assert.match(historyMigration, /p_limit integer DEFAULT 50/)
  assert.match(historyMigration, /LIMIT LEAST\(GREATEST\(p_limit, 1\), 100\)/)
})

test('sensus history uses a definer helper without browser writes', () => {
  assert.match(historyMigration, /fn_lupg_record_monthly_report_edit/)
  assert.match(
    historyMigration,
    /SECURITY DEFINER[\s\S]*INSERT INTO public\.lupg_monthly_report_edit_history/
  )
  assert.match(
    historyMigration,
    /PERFORM public\.fn_lupg_record_monthly_report_edit\(p_report_id, 'sensus', 'UPDATE'\)/
  )
  assert.match(
    historyMigration,
    /REVOKE ALL ON public\.lupg_monthly_report_edit_history FROM anon, authenticated/
  )
  assert.doesNotMatch(
    historyMigration,
    /GRANT INSERT ON public\.lupg_monthly_report_edit_history/
  )
})

test('sensus RPC runs as a locked-down definer while preserving the writable check', () => {
  assert.match(
    sensusPrivilegeFixMigration,
    /RETURNS public\.lupg_sensus[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/
  )
  assert.match(
    sensusPrivilegeFixMigration,
    /AND public\.lupg_mr_writable\(id\)/
  )
  assert.match(
    sensusPrivilegeFixMigration,
    /PERFORM public\.fn_lupg_record_monthly_report_edit\(p_report_id, 'sensus', 'UPDATE'\)/
  )
  assert.match(
    sensusPrivilegeFixMigration,
    /REVOKE ALL ON FUNCTION public\.fn_lupg_record_monthly_report_edit\(uuid, text, text\)\s+FROM PUBLIC, anon, authenticated/
  )
  assert.match(
    sensusPrivilegeFixMigration,
    /REVOKE ALL ON FUNCTION public\.lupg_upsert_sensus_for_report\(uuid, text, text, integer\)\s+FROM PUBLIC, anon/
  )
  assert.match(
    sensusPrivilegeFixMigration,
    /GRANT EXECUTE ON FUNCTION public\.lupg_upsert_sensus_for_report\(uuid, text, text, integer\)\s+TO authenticated/
  )
})

test('dashboard renders the inline English all-group audit', () => {
  const dashboard = readFileSync(
    new URL('../../dashboard/index.tsx', import.meta.url),
    'utf8'
  )
  const picker = readFileSync(
    new URL('../../presentation/picker.tsx', import.meta.url),
    'utf8'
  )
  assert.match(activityPanel, /All-group audit history/)
  assert.match(activityPanel, /Latest editor/)
  assert.match(activityPanel, /Confirmed by/)
  assert.match(activityPanel, /Show all \(\$\{report\.history\.length\}\)/)
  assert.match(activityPanel, /Show less/)
  assert.doesNotMatch(activityPanel, /Dialog/)
  assert.match(dashboard, /useMonthlyAuditDashboard/)
  assert.match(dashboard, /role === 'super_admin' \|\| role === 'admin'/)
  assert.doesNotMatch(picker, /useMonthlyAuditDashboard|ReportActivityPanel/)
  assert.ok(
    dashboard.indexOf("className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'") <
      dashboard.indexOf('<ReportActivityPanel')
  )
  assert.match(activityPanel, /aria-expanded=\{expanded\}/)
  assert.match(activityPanel, /aria-controls=\{historyId\}/)
  assert.match(activityPanel, /id=\{historyId\}/)
})

test('dashboard accepts only real calendar month keys', () => {
  assert.match(dashboardRoute, /isCalendarMonthKey/)
  assert.doesNotMatch(dashboardRoute, /\\d\{4\}-\\d\{2\}/)
})

test('direct sarpras bulk saves invalidate report and audit caches', () => {
  assert.match(sarprasSection, /LUPG_QUERY_KEYS\.monthlyReport\(report\.id\)/)
  assert.match(sarprasSection, /\['lupg', 'monthly-audit-dashboard'\]/)
})

test('batch audit RPC returns complete parent-scoped history', () => {
  assert.match(batchHistoryMigration, /p_month date/)
  assert.match(
    batchHistoryMigration,
    /public\.user_role\(\) NOT IN \('super_admin', 'admin'\)/
  )
  assert.match(batchHistoryMigration, /public\.lupg_mr_readable\(r\.id\)/)
  assert.match(batchHistoryMigration, /jsonb_agg\(/)
  assert.match(batchHistoryMigration, /SET search_path = ''/)
  assert.doesNotMatch(batchHistoryMigration, /500|LIMIT |HAVING count/)
})

test('report lifecycle changes are append-only audit events', () => {
  assert.match(
    batchHistoryMigration,
    /action IN \('INSERT', 'UPDATE', 'DELETE', 'SUBMIT', 'REOPEN'\)/
  )
  assert.match(
    batchHistoryMigration,
    /CREATE TRIGGER lupg_monthly_reports_history/
  )
  assert.match(batchHistoryMigration, /'report', 'SUBMIT'/)
  assert.match(batchHistoryMigration, /'report', 'REOPEN'/)
  assert.match(activityPanel, /report: 'Report'/)
  assert.match(activityPanel, /SUBMIT: 'Confirmed'/)
  assert.match(activityPanel, /REOPEN: 'Reopened'/)
})
