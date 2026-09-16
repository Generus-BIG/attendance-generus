import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import { dataViewSchema, monthSchema } from '../../features/assistant/data-view'
import {
  callerDatabase,
  callerSchema,
  currentReportingMonth,
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
    operation: z.enum(['phq', 'intensif', 'definitions']),
    month: monthSchema.optional(),
    detail: z
      .enum([
        'participants',
        'meetings',
        'attendance',
        'progress',
        'notes',
        'summary',
      ])
      .default('summary'),
    program: z.enum(['APR_INTENSIF', 'AR_INTENSIF']).optional(),
    definition: z
      .enum(['programs', 'metrics', 'sarpras', 'categories'])
      .optional(),
    includeNames: z.boolean().default(false),
  })
  .strict()

export function createLupgOperationTools(config: DataConfig) {
  return {
    readLupgOperations: createTool({
      id: 'readLupgOperations',
      description:
        'Read the independent PHQ domain (participants, meetings, attendance, progress, mastery and notes), APR/AR Intensif activities with stored attendance snapshots, or configured reference definitions. PHQ attendance/progress are events, not unique roster totals. Never substitute ordinary participants/Absensi or monthly PHQ program totals; never substitute current participant details for an Intensif snapshot.',
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
          const needsScope = input.operation !== 'definitions'
          const scope = needsScope
            ? await resolveScope(client, signal, input)
            : { label: 'Konfigurasi LUPG', groups: [] }
          if ('unresolved' in scope && scope.unresolved)
            return scopeResult(scope, 'lupg')
          const source = {
            workspace: 'lupg' as const,
            scope: scope.label,
            month: needsScope ? month : undefined,
            route:
              input.operation === 'definitions'
                ? '/admin/lupg/config'
                : input.operation === 'intensif'
                  ? input.program === 'AR_INTENSIF'
                    ? '/admin/lupg/ar-intensif'
                    : '/admin/lupg/apr-intensif'
                  : input.detail === 'participants'
                    ? '/admin/lupg/phq/participants'
                    : input.detail === 'attendance'
                      ? '/admin/lupg/phq/attendance'
                      : input.detail === 'progress'
                        ? '/admin/lupg/phq/progress'
                        : '/admin/lupg/phq/summary',
            section: input.operation,
          }
          const view = (
            summary: string,
            columns: Parameters<typeof resultView>[2],
            rows: Parameters<typeof resultView>[3]
          ) => resultView(source, summary, columns, rows, input)

          if (input.operation === 'definitions') {
            const definition = input.definition ?? 'programs'
            if (definition === 'categories') {
              const rows = await readRows(
                z.object({ value: id }),
                signal,
                (from, to) =>
                  client
                    .from('lookup_values')
                    .select('value')
                    .eq('type', 'CATEGORY')
                    .order('value')
                    .range(from, to)
                    .abortSignal(signal)
              )
              return view(
                'Definisi kategori aktif yang dapat dibaca menurut RLS.',
                [col('label', 'Kategori')],
                rows.map((r) => ({ label: r.value }))
              )
            }
            const table =
              definition === 'programs'
                ? 'lupg_program_definitions'
                : definition === 'metrics'
                  ? 'lupg_metric_definitions'
                  : 'lupg_sarpras_items'
            const rows = await readRows(
              z.object({
                id,
                code: id.optional(),
                name: id,
                active: z.boolean(),
              }),
              signal,
              (from, to) =>
                client
                  .from(table)
                  .select('id,code,name,active')
                  .eq('active', true)
                  .order('sort_order')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
            )
            return view(
              `Definisi ${definition} aktif; hanya referensi, tanpa perubahan konfigurasi.`,
              [col('code', 'Kode'), col('name', 'Label')],
              rows.map((r) => ({ code: r.code ?? '—', name: r.name }))
            )
          }

          if (input.operation === 'intensif') {
            if (!input.program) throw new Error('PROGRAM_REQUIRED')
            const activities = await readRows(
              z.object({
                id,
                program_code: id,
                kelompok_id: id,
                activity_date: id,
                notes: nullable,
              }),
              signal,
              (from, to) => {
                let query = client
                  .from('lupg_intensif_activities')
                  .select('id,program_code,kelompok_id,activity_date,notes')
                  .eq('program_code', input.program)
                  .gte('activity_date', `${month}-01`)
                  .lt(
                    'activity_date',
                    `${month === '9999-12' ? '9999-12' : nextMonth(month)}-01`
                  )
                  .order('activity_date')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) query = query.eq('kelompok_id', scope.id)
                return query
              }
            )
            const attendance = activities.length
              ? await readRows(
                  z.object({
                    id,
                    activity_id: id,
                    participant_name: id,
                    participant_gender: nullable,
                    participant_category_code: id,
                    status: id,
                    notes: nullable,
                  }),
                  signal,
                  (from, to) =>
                    client
                      .from('lupg_intensif_attendance')
                      .select(
                        'id,activity_id,participant_name,participant_gender,participant_category_code,status,notes'
                      )
                      .in(
                        'activity_id',
                        activities.map((a) => a.id)
                      )
                      .order('participant_name')
                      .order('id')
                      .range(from, to)
                      .abortSignal(signal)
                )
              : []
            const activityById = new Map(
              activities.map((activity) => [activity.id, activity])
            )
            return view(
              `${input.program} ${month}: ${activities.length} kegiatan dan ${attendance.length} catatan kehadiran. Nama/gender/kategori memakai snapshot tersimpan.`,
              [
                col('program', 'Program'),
                col('date', 'Tanggal', 'date'),
                col('participant', 'Peserta'),
                col('gender', 'Gender'),
                col('category', 'Kategori'),
                col('status', 'Status'),
                col('notes', 'Catatan'),
              ],
              attendance.map((row) => ({
                program: input.program!,
                date: activityById.get(row.activity_id)?.activity_date ?? month,
                participant: row.participant_name,
                gender: row.participant_gender ?? null,
                category: row.participant_category_code,
                status: row.status,
                notes: row.notes ?? null,
              }))
            )
          }

          const participants = await readRows(
            z.object({
              id,
              name: id,
              category_code: id,
              gender: id,
              status_active: z.boolean(),
              highest_juz: z.number().nullable(),
              highest_surat: nullable,
              highest_ayat_from: z.number().nullable(),
              highest_ayat_to: z.number().nullable(),
              highest_juz_mastery_percent: z.number().nullable(),
            }),
            signal,
            (from, to) => {
              let query = client
                .from('lupg_phq_participants')
                .select(
                  'id,name,category_code,gender,status_active,highest_juz,highest_surat,highest_ayat_from,highest_ayat_to,highest_juz_mastery_percent'
                )
                .order('name')
                .order('id')
                .range(from, to)
                .abortSignal(signal)
              if (scope.id) query = query.eq('kelompok_id', scope.id)
              return query
            }
          )
          if (input.detail === 'participants')
            return view(
              'Peserta PHQ independen; tidak disubstitusi dari tabel peserta global.',
              [
                ...(input.includeNames ? [col('name', 'Nama')] : []),
                col('category', 'Kategori'),
                col('gender', 'Gender'),
                col('active', 'Aktif'),
                col('juz', 'Juz tertinggi', 'number'),
                col('surat', 'Surat'),
                col('ayat', 'Ayat'),
                col('mastery', 'Penguasaan', 'percent'),
              ],
              participants.map((p) => ({
                ...(input.includeNames ? { name: p.name } : {}),
                category: p.category_code,
                gender: p.gender,
                active: p.status_active ? 'Ya' : 'Tidak',
                juz: p.highest_juz,
                surat: p.highest_surat ?? null,
                ayat:
                  p.highest_ayat_from === null && p.highest_ayat_to === null
                    ? null
                    : `${p.highest_ayat_from ?? '?'}–${p.highest_ayat_to ?? '?'}`,
                mastery: p.highest_juz_mastery_percent,
              }))
            )

          const meetings = await readRows(
            z.object({ id, activity_date: id, notes: nullable }),
            signal,
            (from, to) => {
              let query = client
                .from('lupg_phq_meetings')
                .select('id,activity_date,notes')
                .eq('month', `${month}-01`)
                .order('activity_date')
                .order('id')
                .range(from, to)
                .abortSignal(signal)
              if (scope.id) query = query.eq('kelompok_id', scope.id)
              return query
            }
          )
          if (input.detail === 'meetings')
            return view(
              `Pertemuan PHQ ${month}.`,
              [col('date', 'Tanggal', 'date'), col('notes', 'Catatan')],
              meetings.map((m) => ({
                date: m.activity_date,
                notes: m.notes ?? null,
              }))
            )
          if (input.detail === 'notes') {
            const notes = await readRows(
              z.object({ notes: id }),
              signal,
              (from, to) => {
                let query = client
                  .from('lupg_phq_monthly_notes')
                  .select('notes')
                  .eq('month', `${month}-01`)
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) query = query.eq('kelompok_id', scope.id)
                return query
              }
            )
            return view(
              `Catatan bulanan PHQ ${month}.`,
              [col('notes', 'Catatan')],
              notes
            )
          }
          const meetingIds = meetings.map((m) => m.id)
          const participantNames = new Map(
            participants.map((p) => [p.id, p.name])
          )
          if (input.detail === 'attendance') {
            const rows = meetingIds.length
              ? await readRows(
                  z.object({
                    participant_id: id,
                    meeting_id: id,
                    status: id,
                    notes: nullable,
                  }),
                  signal,
                  (from, to) =>
                    client
                      .from('lupg_phq_attendance')
                      .select('participant_id,meeting_id,status,notes')
                      .in('meeting_id', meetingIds)
                      .order('meeting_id')
                      .order('participant_id')
                      .range(from, to)
                      .abortSignal(signal)
                )
              : []
            return view(
              `Kehadiran PHQ ${month}; catatan mentah, bukan peserta unik.`,
              [
                ...(input.includeNames ? [col('participant', 'Peserta')] : []),
                col('date', 'Tanggal', 'date'),
                col('status', 'Status'),
                col('notes', 'Catatan'),
              ],
              rows.map((r) => ({
                ...(input.includeNames
                  ? {
                      participant:
                        participantNames.get(r.participant_id) ??
                        r.participant_id,
                    }
                  : {}),
                date:
                  meetings.find((m) => m.id === r.meeting_id)?.activity_date ??
                  month,
                status: r.status,
                notes: r.notes ?? null,
              }))
            )
          }
          const progress = meetingIds.length
            ? await readRows(
                z.object({
                  participant_id: id,
                  meeting_id: id,
                  score: z.number(),
                  juz: z.number().nullable(),
                  juz_mastery_percent: z.number().nullable(),
                  surat: nullable,
                  ayat_from: z.number().nullable(),
                  ayat_to: z.number().nullable(),
                  notes: nullable,
                }),
                signal,
                (from, to) =>
                  client
                    .from('lupg_phq_progress')
                    .select(
                      'participant_id,meeting_id,score,juz,juz_mastery_percent,surat,ayat_from,ayat_to,notes'
                    )
                    .in('meeting_id', meetingIds)
                    .order('meeting_id')
                    .order('participant_id')
                    .range(from, to)
                    .abortSignal(signal)
              )
            : []
          if (input.detail === 'progress')
            return view(
              `Progres PHQ ${month}; nilai, persen penguasaan, dan progres tertinggi adalah metrik berbeda.`,
              [
                ...(input.includeNames ? [col('participant', 'Peserta')] : []),
                col('date', 'Tanggal', 'date'),
                col('score', 'Nilai', 'number'),
                col('juz', 'Juz', 'number'),
                col('mastery', 'Penguasaan', 'percent'),
                col('surat', 'Surat'),
                col('ayat', 'Ayat'),
                col('notes', 'Catatan'),
              ],
              progress.map((r) => ({
                ...(input.includeNames
                  ? {
                      participant:
                        participantNames.get(r.participant_id) ??
                        r.participant_id,
                    }
                  : {}),
                date:
                  meetings.find((m) => m.id === r.meeting_id)?.activity_date ??
                  month,
                score: r.score,
                juz: r.juz,
                mastery: r.juz_mastery_percent,
                surat: r.surat ?? null,
                ayat:
                  r.ayat_from === null && r.ayat_to === null
                    ? null
                    : `${r.ayat_from ?? '?'}–${r.ayat_to ?? '?'}`,
                notes: r.notes ?? null,
              }))
            )
          const scores = progress.map((p) => p.score)
          return view(
            `Ringkasan PHQ ${month}; ${meetings.length} pertemuan, ${participants.length} peserta PHQ, ${progress.length} catatan progres.`,
            [col('metric', 'Metrik'), col('value', 'Nilai', 'number')],
            [
              { metric: 'Pertemuan', value: meetings.length },
              { metric: 'Peserta PHQ', value: participants.length },
              { metric: 'Progres tercatat', value: progress.length },
              {
                metric: 'Rata-rata nilai',
                value: scores.length
                  ? scores.reduce((sum, score) => sum + score, 0) /
                    scores.length
                  : null,
              },
            ]
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'QUERY_LIMIT')
            return resultView(
              {
                workspace: 'lupg',
                scope: input.kelompok ?? input.kelompokId ?? 'Seluruh kelompok',
                month,
                route: '/admin/lupg/dashboard',
                section: input.operation,
              },
              'Cakupan melebihi batas operasional; persempit periode atau kelompok.',
              [col('status', 'Status')],
              [],
              input,
              'Agregat tidak dihitung karena batas 10.000 baris tercapai.'
            )
          if (error instanceof Error && error.message === 'PROGRAM_REQUIRED')
            throw error
          throw new Error(
            signal.aborted ? 'QUERY_CANCELLED_OR_TIMEOUT' : 'QUERY_ERROR'
          )
        }
      },
    }),
  }
}

function nextMonth(month: string) {
  const [year, value] = month.split('-').map(Number)
  return value === 12
    ? `${year + 1}-01`
    : `${year}-${String(value + 1).padStart(2, '0')}`
}
