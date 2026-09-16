import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import {
  dataViewSchema,
  monthSchema,
  type AssistantDataResult,
} from '../../features/assistant/data-view'
import {
  callerDatabase,
  callerSchema,
  currentReportingMonth,
  monthRange,
  readRows,
  resolveScope,
  scopeFields,
  type DataConfig,
} from './data'
import { col, resultView, scopeResult } from './result'

const id = z.string()
const nullable = z.string().nullable().optional()
const inputSchema = z
  .object({
    ...scopeFields,
    operation: z.enum([
      'participants',
      'forms',
      'approvals',
      'attendance',
      'dashboard',
    ]),
    detail: z
      .enum([
        'totals',
        'groups',
        'categories',
        'genders',
        'reasons',
        'trend',
        'followUp',
      ])
      .default('totals'),
    formIds: z.array(z.string().uuid()).max(50).optional(),
    month: monthSchema.optional(),
    search: z.string().trim().max(100).optional(),
    active: z.enum(['active', 'inactive', 'all']).default('active'),
    approvalStatus: z
      .enum(['pending', 'approved', 'rejected', 'all'])
      .default('pending'),
    attendanceState: z.enum(['approved', 'pending', 'all']).default('all'),
    attendanceStatus: z.enum(['HADIR', 'IZIN']).optional(),
    includeNames: z.boolean().default(false),
  })
  .strict()

const jakartaDay = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))

function ageOn(birthDate: string, date = jakartaDay(new Date().toISOString())) {
  const [year, month, day] = date.split('-').map(Number)
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  return Math.max(
    0,
    year -
      birthYear -
      (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  )
}

export function createAbsensiReaderTools(config: DataConfig) {
  return {
    readAbsensiData: createTool({
      id: 'readAbsensiData',
      description:
        'Read participants, forms with attendance summaries, approval registrations, raw attendance logs, or dashboard aggregates with finite filters. Dashboard supports selected forms, totals, daily attendance trends, group/category/gender breakdowns, izin reasons, census-based rates, and follow-up. Kelompok means participant membership except forms use organizer scope. Raw attendance counts event records, not unique people; dashboard rate divides approved records by eligible census × meeting days. Approvals are pending registrations, never active participants. Trends are chart-ready line data; category/gender/reason breakdowns become pie charts when bounded.',
      inputSchema,
      outputSchema: dataViewSchema,
      requestContextSchema: callerSchema,
      execute: async (raw, context) => {
        const input = inputSchema.parse(raw)
        const caller = callerSchema.parse(context?.requestContext.all)
        const { client, signal } = callerDatabase(
          config,
          caller.accessToken,
          context?.abortSignal
        )
        const month = input.month ?? currentReportingMonth()
        try {
          const scope = await resolveScope(client, signal, input)
          if (scope.unresolved) return scopeResult(scope, 'absensi')
          const source = {
            workspace: 'absensi' as const,
            scope: scope.label,
            month,
            route:
              input.operation === 'dashboard'
                ? '/admin/dashboard'
                : input.operation === 'participants'
                  ? '/admin/participants'
                  : input.operation === 'forms'
                    ? '/admin/forms'
                    : input.operation === 'approvals'
                      ? '/admin/approvals'
                      : '/admin/attendance',
            section: input.operation,
          }
          const view = (
            summary: string,
            columns: Parameters<typeof resultView>[2],
            rows: Parameters<typeof resultView>[3],
            presentation?: AssistantDataResult['presentation']
          ) =>
            resultView(
              source,
              summary,
              columns,
              rows,
              input,
              undefined,
              presentation
            )

          if (input.operation === 'dashboard') {
            const range = monthRange(month)
            const forms = await readRows(
              z.object({ id, title: id, date: id, kelompok_id: nullable }),
              signal,
              (from, to) => {
                let query = client
                  .from('attendance_forms')
                  .select('id,title,date,kelompok_id')
                  .gte('date', range.start)
                  .lt('date', range.end)
                  .order('date')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (input.formIds?.length) query = query.in('id', input.formIds)
                return query
              }
            )
            const formIds = input.formIds ?? forms.map((form) => form.id)
            const participants = await readRows(
              z.object({
                id,
                name: id,
                gender: nullable,
                group_id: nullable,
                category: z.object({ value: id }).nullable().optional(),
                group: z.object({ value: id }).nullable().optional(),
              }),
              signal,
              (from, to) => {
                let query = client
                  .from('participants')
                  .select(
                    'id,name,gender,group_id,category:lookup_values!participants_category_id_fkey(value),group:lookup_values!participants_group_id_fkey(value)'
                  )
                  .eq('status_active', true)
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) query = query.eq('group_id', scope.id)
                return query
              }
            )
            const census = participants.filter((participant) =>
              ['GPN A', 'GPN B', 'AR', 'APR'].includes(
                participant.category?.value ?? ''
              )
            )
            const attendance = formIds.length
              ? await readRows(
                  z.object({
                    id,
                    status: z.enum(['HADIR', 'IZIN']),
                    timestamp: id,
                    participant_id: nullable,
                    temp_name: nullable,
                    temp_group: nullable,
                    temp_category: nullable,
                    temp_gender: nullable,
                    permission_reason: nullable,
                    form_id: nullable,
                    participant: z
                      .object({
                        name: id,
                        gender: nullable,
                        group_id: nullable,
                        category: z.object({ value: id }).nullable().optional(),
                        group: z.object({ value: id }).nullable().optional(),
                      })
                      .nullable()
                      .optional(),
                  }),
                  signal,
                  (from, to) =>
                    client
                      .from('attendance')
                      .select(
                        'id,status,timestamp,participant_id,temp_name,temp_group,temp_category,temp_gender,permission_reason,form_id,participant:participants!attendance_participant_id_fkey(name,gender,group_id,category:lookup_values!participants_category_id_fkey(value),group:lookup_values!participants_group_id_fkey(value))'
                      )
                      .in('form_id', formIds)
                      .eq('is_pending', false)
                      .gte('timestamp', range.start)
                      .lt('timestamp', range.end)
                      .order('timestamp')
                      .order('id')
                      .range(from, to)
                      .abortSignal(signal)
                )
              : []
            const rows = attendance.filter(
              (row) =>
                !scope.id ||
                row.participant?.group_id === scope.id ||
                (!row.participant_id && row.temp_group === scope.label)
            )
            const meetings = new Set(
              rows.map((row) => jakartaDay(row.timestamp))
            ).size
            const hadir = rows.filter((row) => row.status === 'HADIR').length
            const izin = rows.length - hadir
            const denominator = census.length * meetings
            const percent = (value: number) =>
              denominator ? (value / denominator) * 100 : 0
            if (input.detail === 'totals')
              return view(
                `Dashboard Absensi ${month}; penyebut ${census.length} peserta sensus × ${meetings} tanggal pertemuan dari formulir terpilih.`,
                [
                  col('meetings', 'Pertemuan', 'number'),
                  col('census', 'Sensus', 'number'),
                  col('hadir', 'Hadir', 'number'),
                  col('izin', 'Izin', 'number'),
                  col('submissions', 'Catatan', 'number'),
                  col('attendanceRate', 'Tingkat hadir', 'percent'),
                  col('izinRate', 'Tingkat izin', 'percent'),
                ],
                [
                  {
                    meetings,
                    census: census.length,
                    hadir,
                    izin,
                    submissions: rows.length,
                    attendanceRate: percent(hadir),
                    izinRate: percent(izin),
                  },
                ]
              )
            if (input.detail === 'trend') {
              const byDate = new Map<string, { hadir: number; izin: number }>()
              for (const row of rows) {
                const date = jakartaDay(row.timestamp)
                const day = byDate.get(date) ?? { hadir: 0, izin: 0 }
                if (row.status === 'HADIR') day.hadir++
                else day.izin++
                byDate.set(date, day)
              }
              return view(
                `Tren kehadiran harian ${month}; hanya tanggal dengan catatan approved yang ditampilkan.`,
                [
                  col('date', 'Tanggal', 'date'),
                  col('hadir', 'Hadir', 'number'),
                  col('izin', 'Izin', 'number'),
                ],
                [...byDate]
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([date, value]) => ({ date, ...value })),
                {
                  kind: 'cartesian',
                  chartType: 'line',
                  xKey: 'date',
                  series: [
                    { key: 'hadir', label: 'Hadir', valueType: 'number' },
                    { key: 'izin', label: 'Izin', valueType: 'number' },
                  ],
                }
              )
            }
            if (input.detail === 'followUp') {
              const byPerson = new Map<
                string,
                {
                  participant: string
                  group: string | null
                  category: string | null
                  hadir: number
                  izin: number
                }
              >()
              for (const row of rows) {
                const key =
                  row.participant_id ?? `temp:${row.temp_name ?? row.id}`
                const person = byPerson.get(key) ?? {
                  participant:
                    row.participant?.name ?? row.temp_name ?? 'Unknown',
                  group:
                    row.participant?.group?.value ?? row.temp_group ?? null,
                  category:
                    row.participant?.category?.value ??
                    row.temp_category ??
                    null,
                  hadir: 0,
                  izin: 0,
                }
                if (row.status === 'HADIR') person.hadir++
                else person.izin++
                byPerson.set(key, person)
              }
              const followUp = [...byPerson.values()]
                .map((person) => ({
                  ...(input.includeNames
                    ? { participant: person.participant }
                    : {}),
                  group: person.group,
                  category: person.category,
                  hadir: person.hadir,
                  izin: person.izin,
                  attendanceRate: meetings
                    ? (person.hadir / meetings) * 100
                    : 0,
                }))
                .sort((a, b) => a.attendanceRate - b.attendanceRate)
              return view(
                `Tindak lanjut peserta berdasarkan ${meetings} tanggal pertemuan; nama hanya ditampilkan bila diminta.`,
                [
                  ...(input.includeNames
                    ? [col('participant', 'Peserta')]
                    : []),
                  col('group', 'Kelompok'),
                  col('category', 'Kategori'),
                  col('hadir', 'Hadir', 'number'),
                  col('izin', 'Izin', 'number'),
                  col('attendanceRate', 'Tingkat hadir', 'percent'),
                ],
                followUp
              )
            }
            const buckets = new Map<string, { count: number; census: number }>()
            const keyFor = (row: (typeof rows)[number]) =>
              input.detail === 'groups'
                ? (row.participant?.group?.value ?? row.temp_group ?? 'Unknown')
                : input.detail === 'categories'
                  ? (row.participant?.category?.value ??
                    row.temp_category ??
                    'Unknown')
                  : input.detail === 'genders'
                    ? (row.participant?.gender ?? row.temp_gender ?? 'Unknown')
                    : row.status === 'HADIR'
                      ? 'Hadir'
                      : (row.permission_reason ?? 'Lainnya')
            for (const row of rows) {
              if (input.detail !== 'reasons' && row.status !== 'HADIR') continue
              const key = keyFor(row)
              const bucket = buckets.get(key) ?? { count: 0, census: 0 }
              bucket.count++
              buckets.set(key, bucket)
            }
            if (input.detail !== 'reasons')
              for (const participant of census) {
                const key =
                  input.detail === 'groups'
                    ? (participant.group?.value ?? 'Unknown')
                    : input.detail === 'categories'
                      ? (participant.category?.value ?? 'Unknown')
                      : (participant.gender ?? 'Unknown')
                const bucket = buckets.get(key) ?? { count: 0, census: 0 }
                bucket.census++
                buckets.set(key, bucket)
              }
            else {
              const alpa = Math.max(0, denominator - rows.length)
              buckets.set('Alpa', { count: alpa, census: 0 })
            }
            const labelKey = input.detail === 'reasons' ? 'reason' : 'label'
            const breakdown = [...buckets].map(([label, value]) => ({
              [labelKey]: label,
              count: value.count,
              ...(input.detail === 'reasons' ? {} : { census: value.census }),
            }))
            const pie =
              ['categories', 'genders', 'reasons'].includes(input.detail) &&
              breakdown.length <= 5 &&
              breakdown.some((row) => row.count > 0)
            return view(
              `Perincian dashboard Absensi ${month} menurut ${input.detail}.`,
              [
                col(
                  labelKey,
                  input.detail === 'reasons'
                    ? 'Status/alasan'
                    : input.detail === 'categories'
                      ? 'Kategori'
                      : input.detail === 'genders'
                        ? 'Gender'
                        : 'Kelompok'
                ),
                col('count', 'Catatan', 'number'),
                ...(input.detail === 'reasons'
                  ? []
                  : [col('census', 'Sensus', 'number')]),
              ],
              breakdown,
              pie
                ? { kind: 'pie', categoryKey: labelKey, valueKey: 'count' }
                : {
                    kind: 'cartesian',
                    chartType: 'bar',
                    xKey: labelKey,
                    series: [
                      {
                        key: 'count',
                        label: input.detail === 'reasons' ? 'Catatan' : 'Hadir',
                        valueType: 'number',
                      },
                    ],
                  }
            )
          }

          if (input.operation === 'participants') {
            const rows = await readRows(
              z.object({
                id,
                name: id,
                gender: nullable,
                group_id: nullable,
                category_id: nullable,
                status_active: z.boolean().nullable(),
                birth_date: nullable,
                groups: z.object({ value: id }).nullable().optional(),
                categories: z.object({ value: id }).nullable().optional(),
              }),
              signal,
              (from, to) => {
                let query = client
                  .from('participants')
                  .select(
                    'id,name,gender,group_id,category_id,status_active,birth_date,groups:lookup_values!participants_group_id_fkey(value),categories:lookup_values!participants_category_id_fkey(value)'
                  )
                  .order('name')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) query = query.eq('group_id', scope.id)
                if (input.active !== 'all')
                  query = query.eq('status_active', input.active === 'active')
                if (input.search)
                  query = query.ilike('name', `%${input.search}%`)
                return query
              }
            )
            const visible = rows.map((row) => ({
              ...(input.includeNames ? { name: row.name } : {}),
              kelompok: row.groups?.value ?? null,
              category: row.categories?.value ?? null,
              gender: row.gender ?? null,
              active: row.status_active ? 'Ya' : 'Tidak',
              birthDate: row.birth_date ?? null,
              age: row.birth_date ? ageOn(row.birth_date) : null,
            }))
            return view(
              `${rows.length} peserta ${input.active === 'all' ? 'aktif/nonaktif' : input.active}; nama hanya ditampilkan bila diminta. Tanggal lahir kosong berarti usia tidak diketahui.`,
              [
                ...(input.includeNames ? [col('name', 'Nama')] : []),
                col('kelompok', 'Kelompok'),
                col('category', 'Kategori'),
                col('gender', 'Gender'),
                col('active', 'Aktif'),
                col('birthDate', 'Tanggal lahir', 'date'),
                col('age', 'Usia', 'number'),
              ],
              visible
            )
          }

          if (input.operation === 'forms') {
            const range = monthRange(month)
            const rows = await readRows(
              z.object({
                id,
                title: id,
                date: id,
                form_type: id,
                kelompok_id: nullable,
                is_active: z.boolean(),
                kelompok: z.object({ value: id }).nullable().optional(),
              }),
              signal,
              (from, to) => {
                let query = client
                  .from('attendance_forms')
                  .select(
                    'id,title,date,form_type,kelompok_id,is_active,kelompok:lookup_values!attendance_forms_kelompok_id_fkey(value)'
                  )
                  .gte('date', range.start)
                  .lt('date', range.end)
                  .order('date')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) query = query.eq('kelompok_id', scope.id)
                if (input.active !== 'all')
                  query = query.eq('is_active', input.active === 'active')
                if (input.search)
                  query = query.ilike('title', `%${input.search}%`)
                return query
              }
            )
            const attendance = rows.length
              ? await readRows(
                  z.object({ status: z.enum(['HADIR', 'IZIN']), form_id: id }),
                  signal,
                  (from, to) =>
                    client
                      .from('attendance')
                      .select('status,form_id')
                      .in(
                        'form_id',
                        rows.map((row) => row.id)
                      )
                      .eq('is_pending', false)
                      .order('form_id')
                      .range(from, to)
                      .abortSignal(signal)
                )
              : []
            const counts = new Map<string, { hadir: number; izin: number }>()
            for (const record of attendance) {
              const count = counts.get(record.form_id) ?? { hadir: 0, izin: 0 }
              if (record.status === 'HADIR') count.hadir++
              else count.izin++
              counts.set(record.form_id, count)
            }
            const formRows = rows.map((row) => {
              const count = counts.get(row.id) ?? { hadir: 0, izin: 0 }
              return {
                title: row.title,
                date: row.date.slice(0, 10),
                type: row.form_type,
                organizer: row.kelompok?.value ?? null,
                active: row.is_active ? 'Ya' : 'Tidak',
                hadir: count.hadir,
                izin: count.izin,
                total: count.hadir + count.izin,
              }
            })
            return view(
              `${rows.length} formulir berdasarkan tanggal formulir; kelompok adalah penyelenggara, bukan keanggotaan peserta. Ringkasan hanya mencakup attendance approved yang terkait.`,
              [
                col('title', 'Formulir'),
                col('date', 'Tanggal', 'date'),
                col('type', 'Jenis'),
                col('organizer', 'Penyelenggara'),
                col('active', 'Aktif'),
                col('hadir', 'Hadir', 'number'),
                col('izin', 'Izin', 'number'),
                col('total', 'Total', 'number'),
              ],
              formRows,
              formRows.length > 0 && formRows.length <= 12
                ? {
                    kind: 'cartesian',
                    chartType: 'stacked-bar',
                    xKey: 'title',
                    series: [
                      { key: 'hadir', label: 'Hadir', valueType: 'number' },
                      { key: 'izin', label: 'Izin', valueType: 'number' },
                    ],
                  }
                : undefined
            )
          }

          if (input.operation === 'approvals') {
            const rows = await readRows(
              z.object({
                id,
                name: id,
                suggested_group: nullable,
                suggested_gender: nullable,
                suggested_category: nullable,
                status: nullable,
                created_at: nullable,
                updated_at: nullable,
              }),
              signal,
              (from, to) => {
                let query = client
                  .from('pending_participants')
                  .select(
                    'id,name,suggested_group,suggested_gender,suggested_category,status,created_at,updated_at'
                  )
                  .order('updated_at', { ascending: false })
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (input.approvalStatus !== 'all')
                  query = query.eq('status', input.approvalStatus)
                if (scope.id) query = query.eq('suggested_group', scope.label)
                if (input.search)
                  query = query.ilike('name', `%${input.search}%`)
                return query
              }
            )
            return view(
              `${rows.length} pendaftaran berstatus ${input.approvalStatus}; pendaftar pending tidak dihitung sebagai peserta aktif.`,
              [
                col('name', 'Nama'),
                col('group', 'Kelompok usulan'),
                col('category', 'Kategori usulan'),
                col('gender', 'Gender usulan'),
                col('status', 'Status'),
                col('recordedAt', 'Tercatat'),
              ],
              rows.map((row) => ({
                name: row.name,
                group: row.suggested_group ?? null,
                category: row.suggested_category ?? null,
                gender: row.suggested_gender ?? null,
                status: row.status ?? 'pending',
                recordedAt:
                  (row.updated_at ?? row.created_at)?.slice(0, 10) ?? null,
              }))
            )
          }

          const range = monthRange(month)
          const rows = await readRows(
            z.object({
              id,
              status: id,
              timestamp: id,
              is_pending: z.boolean().nullable(),
              participant_id: nullable,
              temp_name: nullable,
              temp_group: nullable,
              permission_reason: nullable,
              permission_description: nullable,
              form_id: nullable,
              participant: z
                .object({
                  name: id,
                  group_id: nullable,
                  group: z.object({ value: id }).nullable().optional(),
                })
                .nullable()
                .optional(),
              form: z.object({ title: id }).nullable().optional(),
            }),
            signal,
            (from, to) => {
              let query = client
                .from('attendance')
                .select(
                  'id,status,timestamp,is_pending,participant_id,temp_name,temp_group,permission_reason,permission_description,form_id,participant:participants!attendance_participant_id_fkey(name,group_id,group:lookup_values!participants_group_id_fkey(value)),form:attendance_forms!attendance_form_id_fkey(title)'
                )
                .gte('timestamp', range.start)
                .lt('timestamp', range.end)
                .order('timestamp', { ascending: false })
                .order('id')
                .range(from, to)
                .abortSignal(signal)
              if (input.attendanceState !== 'all')
                query = query.eq(
                  'is_pending',
                  input.attendanceState === 'pending'
                )
              if (input.attendanceStatus)
                query = query.eq('status', input.attendanceStatus)
              return query
            }
          )
          const scopedRows = scope.id
            ? rows.filter(
                (row) =>
                  row.participant?.group_id === scope.id ||
                  (!row.participant_id && row.temp_group === scope.label)
              )
            : rows
          const people = new Set(
            scopedRows.map(
              (row) =>
                row.participant_id ?? `pending:${row.temp_name ?? row.id}`
            )
          )
          return view(
            `${scopedRows.length} catatan kehadiran mentah untuk ${people.size} orang unik; pending dan approved tetap dibedakan.`,
            [
              col('date', 'Tanggal', 'date'),
              ...(input.includeNames ? [col('participant', 'Peserta')] : []),
              col('group', 'Kelompok peserta'),
              col('form', 'Formulir'),
              col('status', 'Status'),
              col('pending', 'Pending'),
              col('reason', 'Alasan izin'),
              col('notes', 'Catatan izin'),
            ],
            scopedRows.map((row) => ({
              date: jakartaDay(row.timestamp),
              ...(input.includeNames
                ? {
                    participant: row.participant?.name ?? row.temp_name ?? null,
                  }
                : {}),
              group: row.participant?.group?.value ?? row.temp_group ?? null,
              form: row.form?.title ?? null,
              status: row.status,
              pending: row.is_pending ? 'Ya' : 'Tidak',
              reason: row.permission_reason ?? null,
              notes: row.permission_description ?? null,
            }))
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'QUERY_LIMIT')
            return resultView(
              {
                workspace: 'absensi',
                scope: input.kelompok ?? input.kelompokId ?? 'Seluruh kelompok',
                month,
                route: '/admin/dashboard',
                section: input.operation,
              },
              'Cakupan melebihi batas operasional; persempit periode atau kelompok.',
              [col('status', 'Status')],
              [],
              input,
              'Agregat tidak dihitung karena batas 10.000 baris tercapai.'
            )
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
  }
}
