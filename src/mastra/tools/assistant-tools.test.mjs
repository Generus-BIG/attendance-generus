import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

const K1 = '123e4567-e89b-42d3-a456-426614174001'
const K2 = '123e4567-e89b-42d3-a456-426614174002'
const FORM1 = '123e4567-e89b-42d3-a456-426614174011'
const FORM2 = '123e4567-e89b-42d3-a456-426614174012'
const R1 = '123e4567-e89b-42d3-a456-426614174021'
const R2 = '123e4567-e89b-42d3-a456-426614174022'
const M1 = '123e4567-e89b-42d3-a456-426614174031'
const P1 = '123e4567-e89b-42d3-a456-426614174041'
const P2 = '123e4567-e89b-42d3-a456-426614174042'
const P3 = '123e4567-e89b-42d3-a456-426614174043'

function server() {
  return createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
}

async function executeTool(
  vite,
  modulePath,
  factory,
  toolName,
  input,
  fetchImpl,
  caller = {}
) {
  const mod = await vite.ssrLoadModule(modulePath)
  const tools = mod[factory]({
    url: 'https://fixture.supabase.co',
    key: 'public-anon-key',
    fetch: fetchImpl,
  })
  const { RequestContext } = await import('@mastra/core/request-context')
  return tools[toolName].execute(
    { ...input },
    {
      requestContext: new RequestContext(
        Object.entries({
          userId: 'verified-user',
          role: 'admin',
          accessToken: 'verified-token',
          workspace: 'absensi',
          modelId: 'gpt-5.6-terra',
          ...caller,
        })
      ),
      abortSignal: new AbortController().signal,
    }
  )
}

function assertCallerAuth(init) {
  assert.equal(
    new Headers(init.headers).get('authorization'),
    'Bearer verified-token'
  )
  assert.equal(init.signal instanceof AbortSignal, true)
}

test('absensi dashboard tool returns bounded per-form coverage using only the caller JWT', async () => {
  const vite = await server()
  try {
    const seen = []
    const result = await executeTool(
      vite,
      '/src/mastra/tools/absensi.ts',
      'createAbsensiTools',
      'getAbsensiDashboardSummary',
      { month: '2026-09' },
      async (url, init) => {
        assertCallerAuth(init)
        seen.push(String(url))
        const request = new URL(url)
        if (request.pathname === '/rest/v1/attendance_forms') {
          assert.match(String(url), /date=gte\.2026-09-01/)
          assert.match(String(url), /date=lt\.2026-10-01/)
          return Response.json([
            {
              id: FORM1,
              title: 'Desa September',
              date: '2026-09-06T00:00:00+07:00',
              is_active: true,
            },
            {
              id: FORM2,
              title: 'Kelompok A',
              date: '2026-09-13T00:00:00+07:00',
              is_active: false,
            },
          ])
        }
        if (request.pathname === '/rest/v1/attendance') {
          assert.match(String(url), /is_pending=eq\.false/)
          assert.match(String(url), /timestamp=gte\.2026-09-01/)
          assert.match(String(url), /timestamp=lt\.2026-10-01/)
          return Response.json([
            { status: 'HADIR', form_id: FORM1 },
            { status: 'HADIR', form_id: FORM1 },
            { status: 'IZIN', form_id: FORM2 },
          ])
        }
        return Response.json([])
      }
    )
    assert.equal(result.source.workspace, 'absensi')
    assert.equal(result.source.month, '2026-09')
    assert.equal(result.source.route, '/admin/dashboard')
    assert.match(result.summary, /1 dari 2/)
    assert.deepEqual(result.rows, [
      { form: 'Desa September', hadir: 2, izin: 0, total: 2 },
      { form: 'Kelompok A', hadir: 0, izin: 1, total: 1 },
    ])
    assert.equal(result.presentation.kind, 'cartesian')
    assert.doesNotMatch(JSON.stringify(result), /verified-token/)
    assert.ok(seen.length >= 2)
  } finally {
    await vite.close()
  }
})

test('monthly attendance tool aggregates by category and names participants only on demand', async () => {
  const vite = await server()
  try {
    const attendanceFetch = async (url, init) => {
      assertCallerAuth(init)
      assert.match(String(url), /\/rest\/v1\/attendance\?/)
      return Response.json([
        {
          status: 'HADIR',
          timestamp: '2026-09-06T08:00:00+07:00',
          temp_name: null,
          temp_category: null,
          temp_gender: null,
          participant_id: P1,
          form_id: FORM1,
          participants: {
            name: 'Ahmad Rahasia',
            gender: 'L',
            category: { value: 'GPN A' },
          },
        },
        {
          status: 'IZIN',
          timestamp: '2026-09-06T08:00:00+07:00',
          temp_name: null,
          temp_category: null,
          temp_gender: null,
          participant_id: P2,
          form_id: FORM1,
          participants: {
            name: 'Budi Rahasia',
            gender: 'L',
            category: { value: 'Anak Remaja' },
          },
        },
        {
          status: 'HADIR',
          timestamp: '2026-09-13T08:00:00+07:00',
          temp_name: 'Tamu',
          temp_category: 'APR',
          temp_gender: null,
          participant_id: null,
          form_id: FORM1,
          participants: null,
        },
      ])
    }
    const aggregate = await executeTool(
      vite,
      '/src/mastra/tools/absensi.ts',
      'createAbsensiTools',
      'getMonthlyAttendanceSummary',
      { month: '2026-09', breakdown: 'category' },
      attendanceFetch
    )
    assert.equal(aggregate.source.route, '/admin/attendance')
    assert.equal(aggregate.source.month, '2026-09')
    assert.deepEqual(aggregate.rows, [
      { label: 'APR', hadir: 1, izin: 0, total: 1 },
      { label: 'AR', hadir: 0, izin: 1, total: 1 },
      { label: 'GPN A', hadir: 1, izin: 0, total: 1 },
    ])
    assert.doesNotMatch(JSON.stringify(aggregate), /Rahasia/)
    const detailed = await executeTool(
      vite,
      '/src/mastra/tools/absensi.ts',
      'createAbsensiTools',
      'getMonthlyAttendanceSummary',
      { month: '2026-09', includeNames: true },
      attendanceFetch
    )
    assert.deepEqual(detailed.rows, [
      { name: 'Ahmad Rahasia', hadir: 1, izin: 0 },
      { name: 'Budi Rahasia', hadir: 0, izin: 1 },
      { name: 'Tamu', hadir: 1, izin: 0 },
    ])
    assert.deepEqual(detailed.presentation, { kind: 'table' })
    const trend = await executeTool(
      vite,
      '/src/mastra/tools/absensi.ts',
      'createAbsensiTools',
      'getMonthlyAttendanceSummary',
      { month: '2026-09', breakdown: 'trend' },
      attendanceFetch
    )
    assert.deepEqual(trend.rows, [
      { date: '2026-09-06', hadir: 1, izin: 1 },
      { date: '2026-09-13', hadir: 1, izin: 0 },
    ])
    assert.equal(trend.presentation.kind, 'cartesian')
    assert.equal(trend.presentation.chartType, 'line')
  } finally {
    await vite.close()
  }
})

test('absensi tools accept an explicit kelompok filter without widening scope', async () => {
  const vite = await server()
  try {
    const seen = []
    const result = await executeTool(
      vite,
      '/src/mastra/tools/absensi.ts',
      'createAbsensiTools',
      'getMonthlyAttendanceSummary',
      { month: '2026-09', kelompokId: K1 },
      async (url, init) => {
        assertCallerAuth(init)
        seen.push(String(url))
        const decoded = decodeURIComponent(String(url))
        assert.match(decoded, /attendance_forms!inner/)
        assert.match(
          decoded,
          new RegExp(`attendance_forms\\.kelompok_id=eq\\.${K1}`)
        )
        return Response.json([])
      }
    )
    assert.equal(result.source.scope, K1)
    assert.deepEqual(result.rows, [])
    assert.deepEqual(result.presentation, { kind: 'table' })
    assert.ok(seen.length >= 1)
  } finally {
    await vite.close()
  }
})

test('report completeness tool exposes lifecycle and missing sections per kelompok', async () => {
  const vite = await server()
  try {
    const result = await executeTool(
      vite,
      '/src/mastra/tools/lupg.ts',
      'createLupgTools',
      'getLupgReportCompleteness',
      { month: '2026-09' },
      async (url, init) => {
        assertCallerAuth(init)
        const request = new URL(url)
        const table = request.pathname.split('/').pop()
        const fixtures = {
          lupg_monthly_reports: [
            {
              id: R1,
              kelompok_id: K1,
              month: '2026-09-01',
              status: 'submitted',
              locked: true,
            },
            {
              id: R2,
              kelompok_id: K2,
              month: '2026-09-01',
              status: 'draft',
              locked: false,
            },
          ],
          lupg_program_reports: [
            { monthly_report_id: R1, program_code: 'GOMA' },
          ],
          lupg_metric_reports: [{ monthly_report_id: R1, metric_code: 'M1' }],
          lupg_mustin_notes: [{ monthly_report_id: R1 }],
          lupg_sarpras_reports: [],
          lupg_shodaqoh: [{ monthly_report_id: R1 }],
          lupg_sensus: [{ kelompok_id: K1 }],
          lookup_values: [
            { id: K1, value: 'Kelompok 1' },
            { id: K2, value: 'Kelompok 2' },
          ],
        }
        if (table === 'lupg_monthly_reports')
          assert.equal(request.searchParams.get('month'), 'eq.2026-09-01')
        return Response.json(fixtures[table] ?? [])
      },
      { workspace: 'lupg' }
    )
    assert.equal(result.source.workspace, 'lupg')
    assert.equal(result.source.month, '2026-09')
    assert.equal(result.source.route, '/admin/lupg/dashboard')
    assert.deepEqual(result.rows, [
      {
        kelompok: 'Kelompok 1',
        status: 'submitted',
        sections: '5/6',
        missing: 'Sarpras',
      },
      {
        kelompok: 'Kelompok 2',
        status: 'draft',
        sections: '0/6',
        missing: 'Sensus, Program, Metrik, Mustin, Sarpras, Shodaqoh',
      },
    ])
    assert.deepEqual(result.presentation, { kind: 'table' })
  } finally {
    await vite.close()
  }
})

test('PHQ tool summarizes attendance, progress and juz distribution for the month', async () => {
  const vite = await server()
  try {
    const result = await executeTool(
      vite,
      '/src/mastra/tools/lupg.ts',
      'createLupgTools',
      'getPhqSummary',
      { month: '2026-09', kelompokId: K1 },
      async (url, init) => {
        assertCallerAuth(init)
        const request = new URL(url)
        const table = request.pathname.split('/').pop()
        if (table === 'lupg_phq_meetings') {
          assert.equal(request.searchParams.get('month'), 'eq.2026-09-01')
          assert.match(String(url), new RegExp(`kelompok_id=eq\\.${K1}`))
          return Response.json([
            {
              id: M1,
              kelompok_id: K1,
            },
          ])
        }
        if (table === 'lupg_phq_attendance')
          return Response.json([
            { participant_id: P1, meeting_id: M1, status: 'hadir' },
            { participant_id: P2, meeting_id: M1, status: 'hadir' },
            { participant_id: P3, meeting_id: M1, status: 'izin' },
          ])
        if (table === 'lupg_phq_progress')
          return Response.json([
            { participant_id: P1, meeting_id: M1, score: 85, juz: 3 },
            { participant_id: P2, meeting_id: M1, score: 95, juz: 5 },
          ])
        return Response.json([])
      },
      { workspace: 'lupg' }
    )
    assert.equal(result.source.workspace, 'lupg')
    assert.equal(result.source.month, '2026-09')
    assert.equal(result.source.route, '/admin/lupg/phq/summary')
    assert.deepEqual(result.rows, [
      { metric: 'Pertemuan', value: 1 },
      { metric: 'Peserta hadir', value: 2 },
      { metric: 'Absensi tercatat', value: 3 },
      { metric: 'Peserta dinilai', value: 2 },
      { metric: 'Rata-rata nilai', value: 90 },
      { metric: 'Juz 3', value: 1 },
      { metric: 'Juz 5', value: 1 },
    ])
    assert.equal(result.presentation.kind, 'cartesian')
  } finally {
    await vite.close()
  }
})
