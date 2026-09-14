import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import { dataViewSchema, monthSchema } from '../../features/assistant/data-view'
import { CATEGORY_CODES, PROGRAM_CODES } from '../../features/lupg/constants'
import {
  callerDatabase,
  callerSchema,
  currentReportingMonth,
  readRows,
  type DataConfig,
} from './data'

const monthInput = z.object({ month: monthSchema.optional() }).strict()

const sensusInput = z
  .object({
    kelompokId: z.string().uuid().optional(),
    category: z.enum(CATEGORY_CODES).optional(),
    grouping: z.enum(['category', 'gender']).default('category'),
  })
  .strict()
const sensusRow = z.object({
  category_code: z.enum(CATEGORY_CODES),
  gender: z.enum(['L', 'P']),
  count: z.number().int().nonnegative(),
})

export function createLupgTools(config: DataConfig) {
  return {
    getLupgSensusSummary: createTool({
      id: 'getLupgSensusSummary',
      description:
        'Read current LUPG sensus composition, not historical month snapshots. Defaults to all authorized kelompok. Category codes include PAUD, ACR, APR, AR, GPN_A, GPN_B and pendidik. Returns aggregates only.',
      inputSchema: sensusInput,
      outputSchema: dataViewSchema,
      requestContextSchema: callerSchema,
      execute: async (input, context) => {
        // No browser singleton or privileged key: each query carries this verified caller.
        const caller = callerSchema.parse(context?.requestContext.all)
        const { client, signal } = callerDatabase(
          config,
          caller.accessToken,
          context?.abortSignal
        )
        try {
          const totals = new Map<string, number>()
          const sourceRows = await readRows(sensusRow, signal, (from, to) => {
            let query = client
              .from('lupg_sensus')
              .select('category_code,gender,count')
              .order('kelompok_id')
              .order('category_code')
              .order('gender')
              .range(from, to)
              .abortSignal(signal)
            if (input.kelompokId)
              query = query.eq('kelompok_id', input.kelompokId)
            if (input.category)
              query = query.eq('category_code', input.category)
            return query
          })
          for (const row of sourceRows) {
            const label =
              input.grouping === 'gender' ? row.gender : row.category_code
            totals.set(label, (totals.get(label) ?? 0) + row.count)
          }
          const rows = [...totals]
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
          if (rows.length > 5)
            rows.splice(4, rows.length - 4, {
              label: 'Other',
              count: rows.slice(4).reduce((sum, row) => sum + row.count, 0),
            })
          return dataViewSchema.parse({
            summary:
              'Sensus terkini; seluruh kelompok yang diizinkan jika cakupan tidak disebutkan. Pendidik termasuk hanya bila tidak ada filter kategori.',
            source: {
              workspace: 'lupg',
              scope: `${input.kelompokId ?? 'All authorized kelompok'}${input.category ? ` · ${input.category}` : ''}`,
              route: '/admin/lupg/sensus',
              section: 'Sensus',
            },
            columns: [
              {
                key: 'label',
                label: input.grouping === 'gender' ? 'Gender' : 'Kategori',
                format: 'text',
              },
              { key: 'count', label: 'Jumlah', format: 'number' },
            ],
            rows,
            presentation: rows.some((row) => row.count > 0)
              ? { kind: 'pie', categoryKey: 'label', valueKey: 'count' }
              : { kind: 'table' },
          })
        } catch {
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
    getLupgProgramProgress: createTool({
      id: 'getLupgProgramProgress',
      description:
        'Read monthly LUPG program realization and sensus. Defaults to current Asia/Jakarta calendar month and all authorized kelompok. Uses canonical program codes and weighted percentages; no participant identities.',
      inputSchema: z
        .object({
          month: monthSchema.optional(),
          kelompokId: z.string().uuid().optional(),
          program: z.enum(PROGRAM_CODES).optional(),
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
        try {
          const records = await readRows(
            z.object({
              program_code: z.enum(PROGRAM_CODES),
              denominator: z.number().nonnegative(),
              count_this_month: z.number().nonnegative(),
            }),
            signal,
            (from, to) => {
              let query = client
                .from('lupg_program_reports')
                .select(
                  'program_code,denominator,count_this_month,lupg_monthly_reports!inner(month,kelompok_id)'
                )
                .eq('lupg_monthly_reports.month', `${month}-01`)
                .order('monthly_report_id')
                .order('program_code')
                .range(from, to)
                .abortSignal(signal)
              if (input.kelompokId)
                query = query.eq(
                  'lupg_monthly_reports.kelompok_id',
                  input.kelompokId
                )
              if (input.program) query = query.eq('program_code', input.program)
              return query
            }
          )
          const totals = new Map<
            string,
            { program: string; sensus: number; realization: number }
          >()
          for (const record of records) {
            const row = totals.get(record.program_code) ?? {
              program: record.program_code,
              sensus: 0,
              realization: 0,
            }
            row.sensus += record.denominator
            row.realization += record.count_this_month
            totals.set(record.program_code, row)
          }
          const rows = [...totals.values()]
            .sort((a, b) => a.program.localeCompare(b.program))
            .map((row) => ({
              ...row,
              percent:
                row.sensus > 0
                  ? Math.round((row.realization / row.sensus) * 10000) / 100
                  : null,
            }))
          return dataViewSchema.parse({
            summary: `Program ${month}${input.month ? '' : ' (bulan kalender saat ini, Asia/Jakarta)'}. Persentase = jumlah realisasi / jumlah sensus; tanpa sensus ditampilkan kosong.`,
            source: {
              workspace: 'lupg',
              month,
              scope: `${input.kelompokId ?? 'All authorized kelompok'}${input.program ? ` · ${input.program}` : ''}`,
              route: '/admin/lupg/programs',
              section: 'Program progress',
            },
            columns: [
              { key: 'program', label: 'Program', format: 'text' },
              { key: 'sensus', label: 'Sensus', format: 'number' },
              { key: 'realization', label: 'Realisasi', format: 'number' },
              { key: 'percent', label: 'Capaian', format: 'percent' },
            ],
            rows,
            presentation: {
              kind: 'cartesian',
              chartType: 'bar',
              xKey: 'program',
              series: [
                { key: 'sensus', label: 'Sensus', valueType: 'number' },
                { key: 'realization', label: 'Realisasi', valueType: 'number' },
              ],
            },
          })
        } catch {
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
    getLupgReportCompleteness: createTool({
      id: 'getLupgReportCompleteness',
      description:
        'Read monthly LUPG report lifecycle and per-kelompok section completeness. Defaults to current Asia/Jakarta calendar month. Returns draft/submitted status and missing sections; no participant identities.',
      inputSchema: monthInput,
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
        const monthDate = `${month}-01`
        try {
          const reports = await readRows(
            z.object({
              id: z.string().uuid(),
              kelompok_id: z.string().uuid(),
              status: z.string(),
            }),
            signal,
            (from, to) =>
              client
                .from('lupg_monthly_reports')
                .select('id,kelompok_id,status')
                .eq('month', monthDate)
                .order('kelompok_id')
                .range(from, to)
                .abortSignal(signal)
          )
          const reportIds = reports.map((report) => report.id)
          const presence = async (table: string) => {
            if (!reportIds.length) return new Set<string>()
            const rows = await readRows(
              z.object({ monthly_report_id: z.string().uuid() }),
              signal,
              (from, to) =>
                client
                  .from(table)
                  .select('monthly_report_id')
                  .in('monthly_report_id', reportIds)
                  .range(from, to)
                  .abortSignal(signal)
            )
            return new Set(rows.map((row) => row.monthly_report_id))
          }
          const [programs, metrics, mustin, sarpras, shodaqoh] =
            await Promise.all([
              presence('lupg_program_reports'),
              presence('lupg_metric_reports'),
              presence('lupg_mustin_notes'),
              presence('lupg_sarpras_reports'),
              presence('lupg_shodaqoh'),
            ])
          const sensus = await readRows(
            z.object({ kelompok_id: z.string().uuid() }),
            signal,
            (from, to) =>
              client
                .from('lupg_sensus')
                .select('kelompok_id')
                .range(from, to)
                .abortSignal(signal)
          )
          const sensusKelompok = new Set(sensus.map((row) => row.kelompok_id))
          const kelompokIds = [
            ...new Set(reports.map((report) => report.kelompok_id)),
          ]
          const names = new Map<string, string>()
          if (kelompokIds.length) {
            const lookups = await readRows(
              z.object({ id: z.string().uuid(), value: z.string() }),
              signal,
              (from, to) =>
                client
                  .from('lookup_values')
                  .select('id,value')
                  .in('id', kelompokIds)
                  .range(from, to)
                  .abortSignal(signal)
            )
            for (const lookup of lookups) names.set(lookup.id, lookup.value)
          }
          const rows = reports.slice(0, 50).map((report) => {
            const has = {
              Sensus: sensusKelompok.has(report.kelompok_id),
              Program: programs.has(report.id),
              Metrik: metrics.has(report.id),
              Mustin: mustin.has(report.id),
              Sarpras: sarpras.has(report.id),
              Shodaqoh: shodaqoh.has(report.id),
            }
            const missing = Object.entries(has)
              .filter(([, present]) => !present)
              .map(([key]) => key)
            return {
              kelompok: names.get(report.kelompok_id) ?? report.kelompok_id,
              status: report.status,
              sections: `${6 - missing.length}/6`,
              missing: missing.length ? missing.join(', ') : '—',
            }
          })
          return dataViewSchema.parse({
            summary: `Kelengkapan laporan LUPG ${month}${input.month ? '' : ' (bulan kalender saat ini, Asia/Jakarta)'}. ${reports.filter((r) => r.status === 'submitted').length} dari ${reports.length} laporan disubmit.`,
            source: {
              workspace: 'lupg',
              month,
              scope: 'All authorized kelompok',
              route: '/admin/lupg/dashboard',
              section: 'Report completeness',
            },
            columns: [
              { key: 'kelompok', label: 'Kelompok', format: 'text' },
              { key: 'status', label: 'Status', format: 'text' },
              { key: 'sections', label: 'Bagian', format: 'text' },
              { key: 'missing', label: 'Belum lengkap', format: 'text' },
            ],
            rows,
            presentation: { kind: 'table' },
          })
        } catch {
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
    getPhqSummary: createTool({
      id: 'getPhqSummary',
      description:
        'Read monthly PHQ attendance, progress, and juz distribution. Defaults to current Asia/Jakarta calendar month and all authorized kelompok. Uses the independent PHQ domain; no participant identities.',
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
        const monthDate = `${month}-01`
        try {
          const meetings = await readRows(
            z.object({
              id: z.string().uuid(),
              kelompok_id: z.string().uuid(),
            }),
            signal,
            (from, to) => {
              let query = client
                .from('lupg_phq_meetings')
                .select('id,kelompok_id')
                .eq('month', monthDate)
                .order('activity_date')
                .range(from, to)
                .abortSignal(signal)
              if (input.kelompokId)
                query = query.eq('kelompok_id', input.kelompokId)
              return query
            }
          )
          const meetingIds = meetings.map((meeting) => meeting.id)
          const attendance = meetingIds.length
            ? await readRows(
                z.object({
                  participant_id: z.string().uuid(),
                  meeting_id: z.string().uuid(),
                  status: z.string(),
                }),
                signal,
                (from, to) =>
                  client
                    .from('lupg_phq_attendance')
                    .select('participant_id,meeting_id,status')
                    .in('meeting_id', meetingIds)
                    .range(from, to)
                    .abortSignal(signal)
              )
            : []
          const progress = meetingIds.length
            ? await readRows(
                z.object({
                  participant_id: z.string().uuid(),
                  meeting_id: z.string().uuid(),
                  score: z.number().nullable(),
                  juz: z.number().int().positive().nullable(),
                }),
                signal,
                (from, to) =>
                  client
                    .from('lupg_phq_progress')
                    .select('participant_id,meeting_id,score,juz')
                    .in('meeting_id', meetingIds)
                    .range(from, to)
                    .abortSignal(signal)
              )
            : []
          const present = new Set(
            attendance
              .filter((row) => row.status === 'hadir')
              .map((row) => row.participant_id)
          ).size
          const assessed = new Set(progress.map((row) => row.participant_id))
            .size
          const scores = progress
            .map((row) => row.score)
            .filter((score): score is number => score !== null)
          const average = scores.length
            ? Math.round(
                (scores.reduce((sum, score) => sum + score, 0) /
                  scores.length) *
                  100
              ) / 100
            : null
          const juzCounts = new Map<number, number>()
          for (const row of progress) {
            if (row.juz === null) continue
            juzCounts.set(row.juz, (juzCounts.get(row.juz) ?? 0) + 1)
          }
          const rows = [
            { metric: 'Pertemuan', value: meetings.length },
            { metric: 'Peserta hadir', value: present },
            { metric: 'Absensi tercatat', value: attendance.length },
            { metric: 'Peserta dinilai', value: assessed },
            { metric: 'Rata-rata nilai', value: average },
            ...[...juzCounts]
              .sort(([a], [b]) => a - b)
              .map(([juz, count]) => ({
                metric: `Juz ${juz}`,
                value: count,
              })),
          ]
          return dataViewSchema.parse({
            summary: `Ringkasan PHQ ${month}${input.month ? '' : ' (bulan kalender saat ini, Asia/Jakarta)'}. ${meetings.length} pertemuan, ${present} peserta hadir.`,
            source: {
              workspace: 'lupg',
              month,
              scope: input.kelompokId ?? 'All authorized kelompok',
              route: '/admin/lupg/phq/summary',
              section: 'PHQ summary',
            },
            columns: [
              { key: 'metric', label: 'Metrik', format: 'text' },
              { key: 'value', label: 'Nilai', format: 'number' },
            ],
            rows,
            presentation:
              meetings.length > 0
                ? {
                    kind: 'cartesian',
                    chartType: 'bar',
                    xKey: 'metric',
                    series: [
                      { key: 'value', label: 'Nilai', valueType: 'number' },
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
