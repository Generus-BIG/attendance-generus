import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import { dataViewSchema, monthSchema } from '../../features/assistant/data-view'
import {
  callerDatabase,
  callerSchema,
  currentReportingMonth,
  monthRange,
  readRows,
  type DataConfig,
} from './data'

const formRow = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: z.string(),
  is_active: z.boolean(),
})
const attendanceRow = z.object({
  status: z.enum(['HADIR', 'IZIN']),
  timestamp: z.string(),
  form_id: z.string().uuid().nullable(),
  participant_id: z.string().nullable(),
  temp_name: z.string().nullable(),
  temp_category: z.string().nullable(),
  temp_gender: z.string().nullable(),
  participants: z
    .object({
      name: z.string(),
      gender: z.string().nullable(),
      category: z.object({ value: z.string() }).nullable(),
    })
    .nullable(),
})

// Normalizes the legacy 'Anak Remaja' database value; other categories
// already match the dashboard vocabulary.
function normalizeCategory(value: string | null): string {
  if (!value) return 'Unknown'
  if (value === 'Anak Remaja') return 'AR'
  return value
}

export function createAbsensiTools(config: DataConfig) {
  return {
    getAbsensiDashboardSummary: createTool({
      id: 'getAbsensiDashboardSummary',
      description:
        'Read headline monthly Absensi dashboard metrics and per-form coverage. Defaults to current Asia/Jakarta calendar month. Returns form aggregates only; no participant identities.',
      inputSchema: z
        .object({
          month: monthSchema.optional(),
          kelompokId: z.string().uuid().optional(),
        })
        .strict(),
      outputSchema: dataViewSchema,
      requestContextSchema: callerSchema,
      execute: async (input, context) => {
        const caller = callerSchema.parse(context?.requestContext.all)
        const { client, signal } = callerDatabase(
          config,
          caller.accessToken,
          context?.abortSignal
        )
        const month = input.month ?? currentReportingMonth()
        const range = monthRange(month)
        try {
          const forms = await readRows(formRow, signal, (from, to) => {
            let query = client
              .from('attendance_forms')
              .select('id,title,date,is_active')
              .gte('date', range.start)
              .lt('date', range.end)
              .order('date')
              .range(from, to)
              .abortSignal(signal)
            if (input.kelompokId)
              query = query.eq('kelompok_id', input.kelompokId)
            return query
          })
          const records = await readRows(
            z.object({
              status: z.enum(['HADIR', 'IZIN']),
              form_id: z.string().uuid().nullable(),
            }),
            signal,
            (from, to) =>
              client
                .from('attendance')
                .select('status,form_id')
                .eq('is_pending', false)
                .gte('timestamp', range.start)
                .lt('timestamp', range.end)
                .order('timestamp')
                .range(from, to)
                .abortSignal(signal)
          )
          const counts = new Map<string, { hadir: number; izin: number }>()
          for (const record of records) {
            if (!record.form_id) continue
            const row = counts.get(record.form_id) ?? { hadir: 0, izin: 0 }
            if (record.status === 'HADIR') row.hadir++
            else row.izin++
            counts.set(record.form_id, row)
          }
          const rows = forms.slice(0, 50).map((form) => {
            const count = counts.get(form.id) ?? { hadir: 0, izin: 0 }
            return {
              form: form.title,
              hadir: count.hadir,
              izin: count.izin,
              total: count.hadir + count.izin,
            }
          })
          const active = forms.filter((form) => form.is_active).length
          const hadir = rows.reduce((sum, row) => sum + row.hadir, 0)
          const izin = rows.reduce((sum, row) => sum + row.izin, 0)
          return dataViewSchema.parse({
            summary: `Ringkasan dashboard Absensi ${month}${input.month ? '' : ' (bulan kalender saat ini, Asia/Jakarta)'}. ${active} dari ${forms.length} formulir aktif; ${hadir} hadir, ${izin} izin tercatat.`,
            source: {
              workspace: 'absensi',
              month,
              scope: input.kelompokId ?? 'All authorized kelompok',
              route: '/admin/dashboard',
              section: 'Dashboard summary',
            },
            columns: [
              { key: 'form', label: 'Formulir', format: 'text' },
              { key: 'hadir', label: 'Hadir', format: 'number' },
              { key: 'izin', label: 'Izin', format: 'number' },
              { key: 'total', label: 'Total', format: 'number' },
            ],
            rows,
            presentation: rows.some((row) => row.total > 0)
              ? {
                  kind: 'cartesian',
                  chartType: 'bar',
                  xKey: 'form',
                  series: [
                    { key: 'hadir', label: 'Hadir', valueType: 'number' },
                    { key: 'izin', label: 'Izin', valueType: 'number' },
                  ],
                }
              : { kind: 'table' },
          })
        } catch {
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
    getMonthlyAttendanceSummary: createTool({
      id: 'getMonthlyAttendanceSummary',
      description:
        'Read monthly attendance totals with bounded breakdowns by category, gender, status, or daily trend. Defaults to current Asia/Jakarta calendar month. Aggregates by default; participant names only when includeNames is true.',
      inputSchema: z
        .object({
          month: monthSchema.optional(),
          kelompokId: z.string().uuid().optional(),
          breakdown: z
            .enum(['category', 'gender', 'status', 'trend'])
            .default('category'),
          includeNames: z.boolean().default(false),
        })
        .strict(),
      outputSchema: dataViewSchema,
      requestContextSchema: callerSchema,
      execute: async (input, context) => {
        const caller = callerSchema.parse(context?.requestContext.all)
        const { client, signal } = callerDatabase(
          config,
          caller.accessToken,
          context?.abortSignal
        )
        const month = input.month ?? currentReportingMonth()
        const range = monthRange(month)
        try {
          const records = await readRows(attendanceRow, signal, (from, to) => {
            const select = input.kelompokId
              ? 'status,timestamp,temp_name,temp_category,temp_gender,participant_id,form_id,participants!attendance_participant_id_fkey(name,gender,category:lookup_values!participants_category_id_fkey(value)),attendance_forms!inner(kelompok_id)'
              : 'status,timestamp,temp_name,temp_category,temp_gender,participant_id,form_id,participants!attendance_participant_id_fkey(name,gender,category:lookup_values!participants_category_id_fkey(value))'
            let query = client
              .from('attendance')
              .select(select)
              .eq('is_pending', false)
              .gte('timestamp', range.start)
              .lt('timestamp', range.end)
              .order('timestamp')
              .range(from, to)
              .abortSignal(signal)
            if (input.kelompokId)
              query = query.eq('attendance_forms.kelompok_id', input.kelompokId)
            return query
          })
          const scope = input.kelompokId ?? 'All authorized kelompok'
          const summaryPrefix = `Absensi ${month}${input.month ? '' : ' (bulan kalender saat ini, Asia/Jakarta)'}.`
          if (input.breakdown === 'trend') {
            const perDay = new Map<string, { hadir: number; izin: number }>()
            for (const record of records) {
              const day = record.timestamp.slice(0, 10)
              const row = perDay.get(day) ?? { hadir: 0, izin: 0 }
              if (record.status === 'HADIR') row.hadir++
              else row.izin++
              perDay.set(day, row)
            }
            const rows = [...perDay]
              .map(([date, count]) => ({ date, ...count }))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 50)
            return dataViewSchema.parse({
              summary: `${summaryPrefix} Tren harian; ${records.length} kehadiran tercatat.`,
              source: {
                workspace: 'absensi',
                month,
                scope,
                route: '/admin/attendance',
                section: 'Attendance summary',
              },
              columns: [
                { key: 'date', label: 'Tanggal', format: 'date' },
                { key: 'hadir', label: 'Hadir', format: 'number' },
                { key: 'izin', label: 'Izin', format: 'number' },
              ],
              rows,
              presentation: rows.length
                ? {
                    kind: 'cartesian',
                    chartType: 'line',
                    xKey: 'date',
                    series: [
                      { key: 'hadir', label: 'Hadir', valueType: 'number' },
                      { key: 'izin', label: 'Izin', valueType: 'number' },
                    ],
                  }
                : { kind: 'table' },
            })
          }
          if (input.includeNames) {
            const perName = new Map<string, { hadir: number; izin: number }>()
            for (const record of records) {
              const name =
                record.participants?.name ?? record.temp_name ?? 'Unknown'
              const row = perName.get(name) ?? { hadir: 0, izin: 0 }
              if (record.status === 'HADIR') row.hadir++
              else row.izin++
              perName.set(name, row)
            }
            const rows = [...perName]
              .map(([name, count]) => ({ name, ...count }))
              .sort((a, b) => a.name.localeCompare(b.name))
              .slice(0, 50)
            return dataViewSchema.parse({
              summary: `${summaryPrefix} Rincian peserta yang diminta secara eksplisit.`,
              source: {
                workspace: 'absensi',
                month,
                scope,
                route: '/admin/attendance',
                section: 'Attendance summary',
              },
              columns: [
                { key: 'name', label: 'Nama', format: 'text' },
                { key: 'hadir', label: 'Hadir', format: 'number' },
                { key: 'izin', label: 'Izin', format: 'number' },
              ],
              rows,
              presentation: { kind: 'table' },
            })
          }
          if (input.breakdown === 'status') {
            const hadir = records.filter((r) => r.status === 'HADIR').length
            const izin = records.length - hadir
            const rows = [
              { label: 'HADIR', count: hadir },
              { label: 'IZIN', count: izin },
            ]
            return dataViewSchema.parse({
              summary: `${summaryPrefix} ${records.length} kehadiran tercatat.`,
              source: {
                workspace: 'absensi',
                month,
                scope,
                route: '/admin/attendance',
                section: 'Attendance summary',
              },
              columns: [
                { key: 'label', label: 'Status', format: 'text' },
                { key: 'count', label: 'Jumlah', format: 'number' },
              ],
              rows,
              presentation:
                hadir + izin > 0
                  ? { kind: 'pie', categoryKey: 'label', valueKey: 'count' }
                  : { kind: 'table' },
            })
          }
          const totals = new Map<string, { hadir: number; izin: number }>()
          for (const record of records) {
            const label =
              input.breakdown === 'gender'
                ? (record.participants?.gender ??
                  record.temp_gender ??
                  'Unknown')
                : normalizeCategory(
                    record.participants?.category?.value ?? record.temp_category
                  )
            const row = totals.get(label) ?? { hadir: 0, izin: 0 }
            if (record.status === 'HADIR') row.hadir++
            else row.izin++
            totals.set(label, row)
          }
          const rows = [...totals]
            .map(([label, count]) => ({
              label,
              ...count,
              total: count.hadir + count.izin,
            }))
            .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
            .slice(0, 50)
          return dataViewSchema.parse({
            summary: `${summaryPrefix} Perincian ${input.breakdown === 'gender' ? 'gender' : 'kategori'}; ${records.length} kehadiran tercatat.`,
            source: {
              workspace: 'absensi',
              month,
              scope,
              route: '/admin/attendance',
              section: 'Attendance summary',
            },
            columns: [
              {
                key: 'label',
                label: input.breakdown === 'gender' ? 'Gender' : 'Kategori',
                format: 'text',
              },
              { key: 'hadir', label: 'Hadir', format: 'number' },
              { key: 'izin', label: 'Izin', format: 'number' },
              { key: 'total', label: 'Total', format: 'number' },
            ],
            rows,
            presentation: rows.some((row) => row.total > 0)
              ? {
                  kind: 'cartesian',
                  chartType: 'bar',
                  xKey: 'label',
                  series: [
                    { key: 'hadir', label: 'Hadir', valueType: 'number' },
                    { key: 'izin', label: 'Izin', valueType: 'number' },
                  ],
                }
              : { kind: 'table' },
          })
        } catch {
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
  }
}
