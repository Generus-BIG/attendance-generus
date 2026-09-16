import { createServer } from 'vite'
import { RequestContext } from '@mastra/core/request-context'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

let vite
before(async () => {
  vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
})
after(async () => vite?.close())

const K = '123e4567-e89b-42d3-a456-426614174001'
const F = '123e4567-e89b-42d3-a456-426614174002'
const P = '123e4567-e89b-42d3-a456-426614174003'
const A = '123e4567-e89b-42d3-a456-426614174004'
const M = '123e4567-e89b-42d3-a456-426614174005'

async function run(modulePath, factory, tool, input, tables, seen = []) {
  const mod = await vite.ssrLoadModule(modulePath)
  const tools = mod[factory]({
    url: 'https://fixture.supabase.co',
    key: 'anon',
    fetch: async (url, init) => {
      assert.equal(
        new Headers(init.headers).get('authorization'),
        'Bearer caller'
      )
      assert.ok(
        !init.method || init.method === 'GET',
        'Domain reads must be GET-only'
      )
      const request = new URL(url)
      seen.push(request)
      const table = request.pathname.split('/').pop()
      const rows = tables[table] ?? []
      const kelompok =
        request.searchParams.get('kelompok_id') ??
        request.searchParams.get('group_id')
      return Response.json(
        kelompok?.startsWith('eq.')
          ? rows.filter(
              (row) => (row.kelompok_id ?? row.group_id) === kelompok.slice(3)
            )
          : rows
      )
    },
  })
  assert.ok(tools[tool], `Missing ${tool}`)
  return tools[tool].execute(input, {
    requestContext: new RequestContext(
      Object.entries({
        userId: 'user',
        role: 'admin',
        accessToken: 'caller',
        workspace: modulePath.endsWith('lupg.ts') ? 'lupg' : 'absensi',
        modelId: 'gpt-5.6-terra',
      })
    ),
    abortSignal: new AbortController().signal,
  })
}

const lookups = [
  { id: K, value: 'Cakra' },
  { id: '123e4567-e89b-42d3-a456-426614174009', value: 'APR' },
]

test('Absensi readers separate participant membership, organizer forms, pending approvals, and raw event counts', async () => {
  const tables = {
    lookup_values: lookups,
    participants: [
      {
        id: P,
        name: 'Aisyah',
        gender: 'P',
        group_id: K,
        category_id: lookups[1].id,
        status_active: true,
        birth_date: null,
        groups: { value: 'Cakra' },
        categories: { value: 'APR' },
      },
    ],
    attendance_forms: [
      {
        id: F,
        title: 'Form Meruyung',
        date: '2026-09-14T00:00:00+07:00',
        form_type: 'kelompok',
        kelompok_id: '123e4567-e89b-42d3-a456-426614174099',
        is_active: true,
        kelompok: { value: 'Meruyung' },
      },
    ],
    pending_participants: [
      {
        id: A,
        name: 'Calon',
        suggested_group: 'Cakra',
        suggested_gender: 'P',
        suggested_category: 'APR',
        status: 'pending',
        created_at: '2026-09-14T01:00:00Z',
        updated_at: null,
      },
    ],
    attendance: [
      {
        id: A,
        status: 'HADIR',
        timestamp: '2026-09-13T18:30:00Z',
        is_pending: false,
        participant_id: P,
        temp_name: null,
        temp_group: null,
        permission_reason: null,
        permission_description: null,
        form_id: F,
        participant: { name: 'Aisyah', group_id: K, group: { value: 'Cakra' } },
        form: { title: 'Form Meruyung' },
      },
      {
        id: M,
        status: 'HADIR',
        timestamp: '2026-09-14T01:00:00Z',
        is_pending: false,
        participant_id: P,
        temp_name: null,
        temp_group: null,
        permission_reason: null,
        permission_description: null,
        form_id: F,
        participant: { name: 'Aisyah', group_id: K, group: { value: 'Cakra' } },
        form: { title: 'Form Meruyung' },
      },
    ],
  }
  const base = [
    '/src/mastra/tools/absensi.ts',
    'createAbsensiTools',
    'readAbsensiData',
  ]
  const participants = await run(
    ...base,
    { operation: 'participants', kelompok: 'Cakra', includeNames: true },
    tables
  )
  assert.equal(participants.rows[0].name, 'Aisyah')
  assert.equal(participants.rows[0].birthDate, null)
  assert.deepEqual(participants.presentation, { kind: 'table' })
  const forms = await run(
    ...base,
    { operation: 'forms', kelompok: 'Cakra' },
    tables
  )
  assert.equal(
    forms.rows.length,
    0,
    'participant membership must not match organizer scope'
  )
  const approvals = await run(
    ...base,
    { operation: 'approvals', approvalStatus: 'pending' },
    tables
  )
  assert.equal(approvals.rows.length, 1)
  assert.match(approvals.summary, /pending/i)
  const logs = await run(
    ...base,
    { operation: 'attendance', month: '2026-09', kelompok: 'Cakra' },
    tables
  )
  assert.equal(logs.rows.length, 2)
  assert.match(logs.summary, /2 catatan.*1 orang unik/i)
  assert.equal(
    logs.rows[0].date,
    '2026-09-14',
    'UTC timestamp must group by Jakarta day'
  )
})

test('LUPG operational reader exposes full PHQ fields and Intensif snapshots as separate programs', async () => {
  const tables = {
    lookup_values: lookups,
    lupg_phq_participants: [
      {
        id: P,
        kelompok_id: K,
        name: 'Fatimah',
        category_code: 'APR',
        gender: 'P',
        status_active: true,
        highest_juz: 5,
        highest_surat: 'Al-Baqarah',
        highest_ayat_from: 1,
        highest_ayat_to: 5,
        highest_juz_mastery_percent: 80,
      },
    ],
    lupg_phq_meetings: [
      {
        id: M,
        kelompok_id: K,
        activity_date: '2026-09-14',
        month: '2026-09-01',
        notes: 'Pertemuan',
      },
    ],
    lupg_phq_attendance: [
      {
        id: A,
        participant_id: P,
        meeting_id: M,
        status: 'hadir',
        notes: 'Tepat waktu',
      },
    ],
    lupg_phq_progress: [
      {
        id: A,
        participant_id: P,
        meeting_id: M,
        score: 90,
        juz: 5,
        juz_mastery_percent: 75,
        surat: 'Al-Baqarah',
        ayat_from: 1,
        ayat_to: 5,
        notes: 'Baik',
      },
    ],
    lupg_phq_monthly_notes: [
      { id: A, kelompok_id: K, month: '2026-09-01', notes: 'Catatan bulanan' },
    ],
    lupg_intensif_activities: [
      {
        id: A,
        program_code: 'APR_INTENSIF',
        kelompok_id: K,
        activity_date: '2026-09-14',
        notes: 'Latihan',
      },
    ],
    lupg_intensif_attendance: [
      {
        id: A,
        activity_id: A,
        participant_id: P,
        participant_name: 'Snapshot Nama',
        participant_gender: 'P',
        participant_category_code: 'APR',
        status: 'hadir',
        notes: null,
      },
    ],
  }
  const base = [
    '/src/mastra/tools/lupg.ts',
    'createLupgTools',
    'readLupgOperations',
  ]
  const phq = await run(
    ...base,
    {
      operation: 'phq',
      detail: 'progress',
      month: '2026-09',
      kelompok: 'Cakra',
      includeNames: true,
    },
    tables
  )
  assert.deepEqual(phq.rows[0], {
    participant: 'Fatimah',
    date: '2026-09-14',
    score: 90,
    juz: 5,
    mastery: 75,
    surat: 'Al-Baqarah',
    ayat: '1–5',
    notes: 'Baik',
  })
  const intensif = await run(
    ...base,
    {
      operation: 'intensif',
      program: 'APR_INTENSIF',
      month: '2026-09',
      kelompok: 'Cakra',
    },
    tables
  )
  assert.equal(intensif.rows[0].participant, 'Snapshot Nama')
  assert.equal(intensif.rows[0].program, 'APR_INTENSIF')
})

test('cohesive factories register only the three read capabilities', async () => {
  const absensi = await vite.ssrLoadModule('/src/mastra/tools/absensi.ts')
  const lupg = await vite.ssrLoadModule('/src/mastra/tools/lupg.ts')
  assert.deepEqual(
    Object.keys(
      absensi.createAbsensiTools({
        url: 'https://fixture.supabase.co',
        key: 'anon',
      })
    ),
    ['readAbsensiData']
  )
  assert.deepEqual(
    Object.keys(
      lupg.createLupgTools({ url: 'https://fixture.supabase.co', key: 'anon' })
    ).sort(),
    ['readLupgOperations', 'readLupgReports']
  )
})

test('participant age is day-accurate and PHQ names require explicit opt-in', async () => {
  const participant = await run(
    '/src/mastra/tools/absensi.ts',
    'createAbsensiTools',
    'readAbsensiData',
    { operation: 'participants', allGroups: true },
    {
      lookup_values: lookups,
      participants: [
        {
          id: P,
          name: 'Rahasia',
          gender: 'P',
          group_id: K,
          category_id: lookups[1].id,
          status_active: true,
          birth_date: '2000-12-31',
          groups: { value: 'Cakra' },
          categories: { value: 'APR' },
        },
      ],
    }
  )
  assert.equal('name' in participant.rows[0], false)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const expected =
    Number(today.slice(0, 4)) - 2000 - (today.slice(5) < '12-31' ? 1 : 0)
  assert.equal(participant.rows[0].age, expected)

  const phq = await run(
    '/src/mastra/tools/lupg.ts',
    'createLupgTools',
    'readLupgOperations',
    { operation: 'phq', detail: 'participants', kelompok: 'Cakra' },
    {
      lookup_values: lookups,
      lupg_phq_participants: [
        {
          id: P,
          kelompok_id: K,
          name: 'Fatimah',
          category_code: 'APR',
          gender: 'P',
          status_active: true,
          highest_juz: null,
          highest_surat: null,
          highest_ayat_from: null,
          highest_ayat_to: null,
          highest_juz_mastery_percent: null,
        },
      ],
    }
  )
  assert.equal('name' in phq.rows[0], false)
})

test('Absensi dashboard supports selected forms, census rates, reasons, groups, follow-up and form summaries', async () => {
  const tables = {
    lookup_values: lookups,
    attendance_forms: [
      {
        id: F,
        title: 'Pertemuan',
        date: '2026-09-14T00:00:00+07:00',
        form_type: 'kelompok',
        kelompok_id: K,
        is_active: true,
        kelompok: { value: 'Cakra' },
      },
    ],
    participants: [
      {
        id: P,
        name: 'Aisyah',
        gender: 'P',
        group_id: K,
        category_id: lookups[1].id,
        status_active: true,
        birth_date: null,
        group: { value: 'Cakra' },
        category: { value: 'APR' },
      },
    ],
    attendance: [
      {
        id: A,
        status: 'IZIN',
        timestamp: '2026-09-14T01:00:00Z',
        is_pending: false,
        participant_id: P,
        temp_name: null,
        temp_group: null,
        temp_category: null,
        temp_gender: null,
        permission_reason: 'Sakit',
        permission_description: null,
        form_id: F,
        participant: {
          name: 'Aisyah',
          group_id: K,
          group: { value: 'Cakra' },
          gender: 'P',
          category: { value: 'APR' },
        },
        form: { title: 'Pertemuan' },
      },
    ],
  }
  const base = [
    '/src/mastra/tools/absensi.ts',
    'createAbsensiTools',
    'readAbsensiData',
  ]
  const totals = await run(
    ...base,
    {
      operation: 'dashboard',
      detail: 'totals',
      month: '2026-09',
      formIds: [F],
      kelompok: 'Cakra',
    },
    tables
  )
  assert.deepEqual(totals.rows[0], {
    meetings: 1,
    census: 1,
    hadir: 0,
    izin: 1,
    submissions: 1,
    attendanceRate: 0,
    izinRate: 100,
  })
  const reasons = await run(
    ...base,
    {
      operation: 'dashboard',
      detail: 'reasons',
      month: '2026-09',
      formIds: [F],
      kelompok: 'Cakra',
    },
    tables
  )
  assert.equal(reasons.rows.find((row) => row.reason === 'Sakit').count, 1)
  assert.deepEqual(reasons.presentation, {
    kind: 'pie',
    categoryKey: 'reason',
    valueKey: 'count',
  })
  const groups = await run(
    ...base,
    {
      operation: 'dashboard',
      detail: 'groups',
      month: '2026-09',
      formIds: [F],
      kelompok: 'Cakra',
    },
    tables
  )
  assert.equal(groups.rows[0].census, 1)
  assert.deepEqual(groups.presentation, {
    kind: 'cartesian',
    chartType: 'bar',
    xKey: 'label',
    series: [{ key: 'count', label: 'Hadir', valueType: 'number' }],
  })
  const trend = await run(
    ...base,
    {
      operation: 'dashboard',
      detail: 'trend',
      month: '2026-09',
      formIds: [F],
      kelompok: 'Cakra',
    },
    tables
  )
  assert.deepEqual(trend.presentation, {
    kind: 'cartesian',
    chartType: 'line',
    xKey: 'date',
    series: [
      { key: 'hadir', label: 'Hadir', valueType: 'number' },
      { key: 'izin', label: 'Izin', valueType: 'number' },
    ],
  })
  const followUp = await run(
    ...base,
    {
      operation: 'dashboard',
      detail: 'followUp',
      month: '2026-09',
      formIds: [F],
      kelompok: 'Cakra',
      includeNames: true,
    },
    tables
  )
  assert.equal(followUp.rows[0].participant, 'Aisyah')
  const forms = await run(
    ...base,
    {
      operation: 'forms',
      month: '2026-09',
      kelompok: 'Cakra',
      active: 'all',
    },
    tables
  )
  assert.equal(forms.rows[0].izin, 1)
  assert.deepEqual(forms.presentation, {
    kind: 'cartesian',
    chartType: 'stacked-bar',
    xKey: 'title',
    series: [
      { key: 'hadir', label: 'Hadir', valueType: 'number' },
      { key: 'izin', label: 'Izin', valueType: 'number' },
    ],
  })
})

test('group-scoped attendance keeps temporary identities using recorded temp group', async () => {
  const logs = await run(
    '/src/mastra/tools/absensi.ts',
    'createAbsensiTools',
    'readAbsensiData',
    {
      operation: 'attendance',
      month: '2026-09',
      kelompok: 'Cakra',
      includeNames: true,
    },
    {
      lookup_values: lookups,
      attendance: [
        {
          id: A,
          status: 'HADIR',
          timestamp: '2026-09-14T01:00:00Z',
          is_pending: false,
          participant_id: null,
          temp_name: 'Tamu',
          temp_group: 'Cakra',
          permission_reason: null,
          permission_description: null,
          form_id: F,
          participant: null,
          form: { title: 'Pertemuan' },
        },
      ],
    }
  )
  assert.equal(logs.rows[0].participant, 'Tamu')
  assert.equal(logs.rows[0].group, 'Cakra')
})

test('reference definitions are finite reads and include configured labels', async () => {
  const result = await run(
    '/src/mastra/tools/lupg.ts',
    'createLupgTools',
    'readLupgOperations',
    { operation: 'definitions', definition: 'programs' },
    {
      lookup_values: lookups,
      lupg_program_definitions: [
        {
          id: A,
          code: 'GOMA',
          name: 'Gerakan Olahraga',
          description: 'Program',
          active: true,
        },
      ],
    }
  )
  assert.equal(result.source.route, '/admin/lupg/config')
  assert.equal(result.rows[0].code, 'GOMA')
})
