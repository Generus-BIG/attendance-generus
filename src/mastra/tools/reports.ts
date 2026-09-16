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
  defaultReportMonth,
  jakartaDate,
  readRows,
  resolveScope,
  scopeFields,
  type DataConfig,
} from './data'
import { col, resultView, scopeResult } from './result'

const id = z.string(),
  nullable = z.string().nullable().optional(),
  number = z.number().finite()
const reportSchema = z.object({
  id,
  kelompok_id: id,
  month: id,
  status: id,
  locked: z.boolean(),
  last_edited_at: nullable,
  submitted_at: nullable,
})
const inputSchema = z
  .object({
    ...scopeFields,
    operation: z.enum([
      'status',
      'history',
      'sections',
      'sensus',
      'mustin',
      'shodaqoh',
      'metrics',
      'programs',
      'sarpras',
      'materials',
      'character',
      'documentation',
    ]),
    month: monthSchema.optional(),
    year: z.number().int().min(1900).max(2200).optional(),
    surface: z.enum(['report', 'recap', 'presentation']).default('report'),
    status: z.enum(['open', 'in_progress', 'done']).optional(),
    overdue: z.boolean().optional(),
    asOf: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    category: z.string().max(80).optional(),
    gender: z.enum(['L', 'P']).optional(),
    grouping: z.enum(['category', 'gender']).optional(),
    level: z.string().max(40).optional(),
    program: z
      .enum(['TURBA_GPN', 'GOMA', 'GMKM', 'PHQ', 'SHOLAT_ACR', 'NIKAH_JM'])
      .optional(),
    metric: z.string().max(80).optional(),
  })
  .strict()

export function createReportTools(config: DataConfig) {
  return {
    readLupgReports: createTool({
      id: 'readLupgReports',
      description:
        'Read LUPG monthly/yearly status, activity history, nine-section presence, report or live-presentation sensus, Mustin (includes done), Shodaqoh PPG, reported attendance/piket percentages, Program Tracker (GMSU=SHOLAT_ACR), Sarpras, material targets, collective 29 Karakter, and documentation captions. Missing child rows mean unrecorded, not zero. Generic monthly PHQ is distinct from independent PHQ records. Aggregate program percentage is summed realization / summed denominator, never an average of percentages. For a compact sensus composition chart, use grouping category or gender; omit grouping for the complete per-kelompok evidence table. Explicit month first; omitted month follows Jakarta day-8 report default. No report creation.',
      inputSchema,
      outputSchema: dataViewSchema,
      requestContextSchema: callerSchema,
      execute: async (raw, context) => {
        const input = inputSchema.parse(raw),
          caller = callerSchema.parse(context?.requestContext.all)
        const { client, signal } = callerDatabase(
          config,
          caller.accessToken,
          context?.abortSignal
        )
        const month = input.month ?? defaultReportMonth()
        const scope = await resolveScope(client, signal, input)
        if (scope.unresolved) return scopeResult(scope, 'lupg')
        const route =
          input.surface === 'presentation'
            ? '/admin/lupg/presentation'
            : input.surface === 'recap'
              ? '/admin/lupg/recap'
              : input.operation === 'status' || input.operation === 'history'
                ? '/admin/lupg/dashboard'
                : input.operation === 'mustin'
                  ? '/admin/lupg/mustin'
                  : '/admin/lupg/reports'
        const source = {
          workspace: 'lupg' as const,
          scope: scope.label,
          month,
          route,
          section: input.operation,
        }
        const view = (
          summary: string,
          columns: Parameters<typeof resultView>[2],
          rows: Parameters<typeof resultView>[3],
          reason?: string,
          presentation?: AssistantDataResult['presentation']
        ) =>
          resultView(
            source,
            summary,
            columns,
            rows,
            input,
            reason,
            presentation
          )
        try {
          if (input.operation === 'sensus') {
            const values = await readRows(
              z.object({
                kelompok_id: id,
                category_code: id,
                gender: id,
                count: number,
              }),
              signal,
              (from, to) => {
                let q = client
                  .from('lupg_sensus')
                  .select('kelompok_id,category_code,gender,count')
                  .order('kelompok_id')
                  .order('category_code')
                  .order('gender')
                  .range(from, to)
                  .abortSignal(signal)
                if (scope.id) q = q.eq('kelompok_id', scope.id)
                if (input.category) q = q.eq('category_code', input.category)
                if (input.gender) q = q.eq('gender', input.gender)
                return q
              }
            )
            const names = new Map(
              scope.groups.map((group) => [group.id, group.value])
            )
            if (input.grouping) {
              const totals = new Map<string, number>()
              for (const value of values) {
                const label =
                  input.grouping === 'category'
                    ? value.category_code
                    : value.gender
                totals.set(label, (totals.get(label) ?? 0) + value.count)
              }
              const rows = [...totals]
                .map(([label, count]) => ({ label, count }))
                .sort(
                  (left, right) =>
                    right.count - left.count ||
                    left.label.localeCompare(right.label)
                )
              const pie = rows.length <= 5 && rows.some((row) => row.count > 0)
              return view(
                `Sensus terkini dihimpun menurut ${input.grouping === 'category' ? 'kategori' : 'gender'}; tidak bergantung pada adanya laporan bulanan.`,
                [
                  col(
                    'label',
                    input.grouping === 'category' ? 'Kategori' : 'Gender'
                  ),
                  col('count', 'Jumlah', 'number'),
                ],
                rows,
                undefined,
                pie
                  ? { kind: 'pie', categoryKey: 'label', valueKey: 'count' }
                  : {
                      kind: 'cartesian',
                      chartType: 'bar',
                      xKey: 'label',
                      series: [
                        {
                          key: 'count',
                          label: 'Jumlah',
                          valueType: 'number',
                        },
                      ],
                    }
              )
            }
            return view(
              `Sensus terkini per kelompok, kategori, dan gender; tidak bergantung pada adanya laporan bulanan. Pendidik terpisah dari Generus.`,
              [
                col('kelompok', 'Kelompok'),
                col('category', 'Kategori'),
                col('gender', 'Gender'),
                col('count', 'Jumlah', 'number'),
              ],
              values.map((value) => ({
                kelompok: names.get(value.kelompok_id) ?? value.kelompok_id,
                category: value.category_code,
                gender: value.gender,
                count: value.count,
              }))
            )
          }
          const reports = await readRows(reportSchema, signal, (from, to) => {
            let q = client
              .from('lupg_monthly_reports')
              .select(
                'id,kelompok_id,month,status,locked,last_edited_at,submitted_at'
              )
              .order('month')
              .order('kelompok_id')
              .order('id')
              .range(from, to)
              .abortSignal(signal)
            if (scope.id) q = q.eq('kelompok_id', scope.id)
            if (input.year && !input.month)
              q = q
                .gte('month', `${input.year}-01-01`)
                .lt('month', `${input.year + 1}-01-01`)
            else q = q.eq('month', `${month}-01`)
            return q
          })
          const reportIds = reports.map((r) => r.id),
            names = new Map(scope.groups.map((g) => [g.id, g.value])),
            byId = new Map(reports.map((r) => [r.id, r]))
          const base = (reportId: string) => {
            const r = byId.get(reportId)
            return {
              kelompok: r
                ? (names.get(r.kelompok_id) ?? r.kelompok_id)
                : 'Tidak diketahui',
              month: r?.month.slice(0, 7) ?? month,
            }
          }
          const baseCols = [
            col('kelompok', 'Kelompok'),
            col('month', 'Bulan', 'date'),
          ]
          // Only fixed call sites supply tables/columns: this helper is not a model query interface.
          async function children<T>(
            table: string,
            schema: z.ZodType<T>,
            columns: string,
            parent = 'monthly_report_id'
          ) {
            if (!reportIds.length) return []
            return readRows(schema, signal, (from, to) =>
              client
                .from(table)
                .select(columns)
                .in(parent, reportIds)
                .order(parent)
                .order('id')
                .range(from, to)
                .abortSignal(signal)
            )
          }
          const sensusSchema = z.object({
            category_code: id,
            gender: id,
            count: number,
            kelompok_id: nullable,
            monthly_report_id: nullable,
          })
          async function sensus() {
            const liveGroups = reports
              .filter(
                (r) =>
                  input.surface === 'presentation' || r.status !== 'submitted'
              )
              .map((r) => r.kelompok_id)
            const live = liveGroups.length
              ? await readRows(sensusSchema, signal, (from, to) =>
                  client
                    .from('lupg_sensus')
                    .select('kelompok_id,category_code,gender,count')
                    .in('kelompok_id', liveGroups)
                    .order('kelompok_id')
                    .order('category_code')
                    .order('gender')
                    .range(from, to)
                    .abortSignal(signal)
                )
              : []
            const snapshots = await children(
              'lupg_sensus_snapshots',
              sensusSchema,
              'id,monthly_report_id,category_code,gender,count'
            )
            return reports.flatMap((r) => {
              const basis =
                input.surface === 'presentation' || r.status !== 'submitted'
                  ? 'live'
                  : 'snapshot'
              return (
                basis === 'live'
                  ? live.filter((s) => s.kelompok_id === r.kelompok_id)
                  : snapshots.filter((s) => s.monthly_report_id === r.id)
              )
                .filter(
                  (s) =>
                    (!input.category || s.category_code === input.category) &&
                    (!input.gender || s.gender === input.gender)
                )
                .map((s) => ({
                  ...base(r.id),
                  category: s.category_code,
                  gender: s.gender,
                  count: s.count,
                  basis,
                }))
            })
          }
          if (input.operation === 'history') {
            const history = await children(
              'lupg_monthly_report_edit_history',
              z.object({
                id,
                monthly_report_id: id,
                section: id,
                action: id,
                edited_at: id,
                editor_display_name: nullable,
              }),
              'id,monthly_report_id,section,action,edited_at,editor_display_name'
            )
            return view(
              `Riwayat perubahan laporan ${input.year ?? month}.`,
              [
                ...baseCols,
                col('section', 'Bagian'),
                col('action', 'Aktivitas'),
                col('editedAt', 'Waktu'),
                col('editor', 'Editor'),
              ],
              history.map((r) => ({
                ...base(r.monthly_report_id),
                section: r.section,
                action: r.action,
                editedAt: r.edited_at,
                editor: r.editor_display_name ?? null,
              }))
            )
          }
          if (input.operation === 'status' || input.operation === 'sections') {
            const inventory = [
              ['Program', 'lupg_program_reports', 'monthly_report_id'],
              ['Kehadiran', 'lupg_metric_reports', 'monthly_report_id'],
              ['Resume Mustin', 'lupg_mustin_notes', 'monthly_report_id'],
              ['Sarpras', 'lupg_sarpras_reports', 'monthly_report_id'],
              ['Shodaqoh PPG', 'lupg_shodaqoh', 'monthly_report_id'],
              [
                'Target Capaian Materi',
                'lupg_character_target_reports',
                'monthly_report_id',
              ],
              [
                'Penerapan 29 Karakter',
                'lupg_character_monitoring_reports',
                'monthly_report_id',
              ],
              ['Dokumentasi', 'lupg_activity_photos', 'report_id'],
            ] as const
            const presence = new Map<string, Set<string>>()
            for (const [label, table, parent] of inventory) {
              const values = await children(
                table,
                z.object({ [parent]: id }),
                `id,${parent}`,
                parent
              )
              presence.set(label, new Set(values.map((v) => v[parent])))
            }
            const senses = await sensus()
            const months =
              input.year && !input.month
                ? Array.from(
                    { length: 12 },
                    (_, i) => `${input.year}-${String(i + 1).padStart(2, '0')}`
                  )
                : [month]
            const rows = months.flatMap((m) =>
              scope.groups.map((g) => {
                const r = reports.find(
                  (r) => r.kelompok_id === g.id && r.month.slice(0, 7) === m
                )
                const present = inventory
                  .filter(([label]) => r && presence.get(label)!.has(r.id))
                  .map(([label]) => label as string)
                if (senses.some((s) => s.kelompok === g.value && s.month === m))
                  present.unshift('Sensus')
                const missing = [
                  'Sensus',
                  ...inventory.map(([label]) => label),
                ].filter((label) => !present.includes(label))
                return {
                  kelompok: g.value,
                  month: m,
                  status: r?.status ?? 'not_started',
                  locked: r ? (r.locked ? 'Ya' : 'Tidak') : null,
                  sections: `${present.length}/9 bagian memiliki input`,
                  missing: missing.join(', ') || '—',
                  lastEdited: r?.last_edited_at ?? null,
                  submitted: r?.submitted_at ?? null,
                }
              })
            )
            return view(
              `${reports.filter((r) => r.status === 'submitted').length} laporan disubmit dari ${rows.length} kelompok-bulan. Kehadiran input sembilan bagian; bukan validasi kelengkapan. Status dan kunci terpisah.`,
              [
                ...baseCols,
                col('status', 'Status'),
                col('locked', 'Terkunci'),
                col('sections', 'Input bagian'),
                col('missing', 'Belum tercatat'),
                col('lastEdited', 'Edit terakhir'),
                col('submitted', 'Waktu submit'),
              ],
              rows
            )
          }
          if (input.operation === 'mustin') {
            const values = await children(
              'lupg_mustin_notes',
              z.object({
                id,
                monthly_report_id: id,
                pokok_masalah: id,
                keputusan_rencana: id,
                pic: nullable,
                deadline: nullable,
                status: id,
              }),
              'id,monthly_report_id,pokok_masalah,keputusan_rencana,pic,deadline,status'
            )
            const asOf = input.asOf ?? jakartaDate()
            const rows = values
              .map((r) => ({
                ...base(r.monthly_report_id),
                issue: r.pokok_masalah,
                plan: r.keputusan_rencana,
                pic: r.pic ?? null,
                deadline: r.deadline ?? null,
                status: r.status,
                overdue:
                  r.deadline === null || r.deadline === undefined
                    ? null
                    : r.deadline < asOf && r.status !== 'done'
                      ? 'Ya'
                      : 'Tidak',
              }))
              .filter(
                (r) =>
                  (!input.status || r.status === input.status) &&
                  (input.overdue === undefined ||
                    r.overdue === (input.overdue ? 'Ya' : 'Tidak'))
              )
            return view(
              `Resume Mustin ${input.year ?? month}; termasuk done kecuali difilter. Lewat tenggat dihitung per ${asOf}; tenggat kosong tidak diketahui.`,
              [
                ...baseCols,
                col('issue', 'Pokok masalah'),
                col('plan', 'Keputusan/rencana'),
                col('pic', 'PIC'),
                col('deadline', 'Tenggat', 'date'),
                col('status', 'Status'),
                col('overdue', 'Lewat tenggat'),
              ],
              rows
            )
          }
          if (input.operation === 'shodaqoh') {
            const values = await children(
              'lupg_shodaqoh',
              z.object({
                id,
                monthly_report_id: id,
                nominal: number,
                jumlah_kk: number,
                notes: nullable,
              }),
              'id,monthly_report_id,nominal,jumlah_kk,notes'
            )
            const nominal = values.reduce((s, r) => s + r.nominal, 0),
              kk = values.reduce((s, r) => s + r.jumlah_kk, 0)
            const rows = reports.map((r) => {
              const s = values.find((s) => s.monthly_report_id === r.id)
              return {
                ...base(r.id),
                nominal: s?.nominal ?? null,
                kk: s?.jumlah_kk ?? null,
                perKk: s && s.jumlah_kk > 0 ? s.nominal / s.jumlah_kk : null,
                notes: s?.notes ?? null,
              }
            })
            return view(
              `Shodaqoh PPG ${input.year ?? month}: ${values.length} input, nominal ${nominal}, ${input.year && !input.month ? 'kontribusi KK-bulan (bukan KK unik)' : 'KK'} ${kk}; nominal per KK ${kk ? nominal / kk : 'tidak tersedia'}. Bulan tanpa input bukan nol.`,
              [
                ...baseCols,
                col('nominal', 'Nominal', 'number'),
                col('kk', 'KK', 'number'),
                col('perKk', 'Nominal/KK', 'number'),
                col('notes', 'Keterangan'),
              ],
              rows,
              undefined,
              input.year && !input.month && !!scope.id && rows.length > 1
                ? {
                    kind: 'cartesian',
                    chartType: 'area',
                    xKey: 'month',
                    series: [
                      { key: 'nominal', label: 'Nominal', valueType: 'number' },
                    ],
                  }
                : undefined
            )
          }
          if (input.operation === 'metrics') {
            const values = await children(
              'lupg_metric_reports',
              z.object({
                id,
                monthly_report_id: id,
                metric_code: id,
                current_value: number,
                denominator: number.nullable(),
                notes: nullable,
              }),
              'id,monthly_report_id,metric_code,current_value,denominator,notes'
            )
            return view(
              `Persentase kehadiran/piket dilaporkan ${input.year ?? month}; ATT_PCT dan ATT_PCT_PIKET terpisah. Bukan log Absensi dan tidak dirata-ratakan tanpa penyebut.`,
              [
                ...baseCols,
                col('metric', 'Metrik'),
                col('percent', 'Nilai dilaporkan', 'number'),
                col('denominator', 'Penyebut', 'number'),
                col('notes', 'Keterangan'),
              ],
              values
                .filter((r) => !input.metric || r.metric_code === input.metric)
                .map((r) => ({
                  ...base(r.monthly_report_id),
                  metric: r.metric_code,
                  percent: r.current_value,
                  denominator: r.denominator,
                  notes: r.notes ?? null,
                }))
            )
          }
          if (input.operation === 'programs') {
            const values = (
              await children(
                'lupg_program_reports',
                z.object({
                  id,
                  monthly_report_id: id,
                  program_code: id,
                  denominator: number,
                  count_this_month: number,
                  notes: nullable,
                }),
                'id,monthly_report_id,program_code,denominator,count_this_month,notes'
              )
            ).filter((r) => !input.program || r.program_code === input.program)
            return view(
              `Program ${input.year ?? month}; GMSU = SHOLAT_ACR. Persentase per baris = realisasi/sensus; agregasi per program gunakan jumlah realisasi/jumlah sensus, penyebut nol tidak tersedia. PHQ ini total program bulanan.`,
              [
                ...baseCols,
                col('program', 'Program'),
                col('denominator', 'Sensus', 'number'),
                col('realization', 'Realisasi', 'number'),
                col('percent', 'Capaian', 'percent'),
                col('notes', 'Keterangan'),
              ],
              values.map((r) => ({
                ...base(r.monthly_report_id),
                program: r.program_code,
                denominator: r.denominator,
                realization: r.count_this_month,
                percent:
                  r.denominator > 0
                    ? (r.count_this_month / r.denominator) * 100
                    : null,
                notes: r.notes ?? null,
              }))
            )
          }
          if (input.operation === 'sarpras') {
            const items = await readRows(
              z.object({ id, name: id }),
              signal,
              (from, to) =>
                client
                  .from('lupg_sarpras_items')
                  .select('id,name')
                  .eq('active', true)
                  .order('sort_order')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
            )
            const values = await children(
              'lupg_sarpras_reports',
              z.object({
                id,
                monthly_report_id: id,
                item_id: id,
                is_fulfilled: z.boolean(),
                notes: nullable,
              }),
              'id,monthly_report_id,item_id,is_fulfilled,notes'
            )
            return view(
              `Sarpras ${input.year ?? month}; tidak ada input berbeda dari belum terpenuhi.`,
              [
                ...baseCols,
                col('item', 'Sarana/prasarana'),
                col('status', 'Status'),
                col('notes', 'Keterangan'),
              ],
              reports.flatMap((r) =>
                items.map((i) => {
                  const v = values.find(
                    (v) => v.monthly_report_id === r.id && v.item_id === i.id
                  )
                  return {
                    ...base(r.id),
                    item: i.name,
                    status: v
                      ? v.is_fulfilled
                        ? 'Terpenuhi'
                        : 'Belum terpenuhi'
                      : 'Belum tercatat',
                    notes: v?.notes ?? null,
                  }
                })
              )
            )
          }
          if (input.operation === 'character') {
            const items = await readRows(
              z.object({ id, level_code: id, activity_label: id }),
              signal,
              (from, to) => {
                let q = client
                  .from('lupg_character_monitoring_activities')
                  .select('id,level_code,activity_label')
                  .eq('active', true)
                  .order('level_code')
                  .order('sort_order')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
                if (input.level) q = q.eq('level_code', input.level)
                return q
              }
            )
            const values = await children(
              'lupg_character_monitoring_reports',
              z.object({
                id,
                monthly_report_id: id,
                activity_id: id,
                status: z
                  .enum([
                    'needs_guidance',
                    'not_applied',
                    'in_progress',
                    'consistent',
                    'established',
                  ])
                  .nullable(),
                notes: nullable,
              }),
              'id,monthly_report_id,activity_id,status,notes'
            )
            const labels = {
              needs_guidance: 'Perlu Pembinaan',
              not_applied: 'Belum diterapkan',
              in_progress: 'Mulai diterapkan',
              consistent: 'Konsisten',
              established: 'Membudaya',
            }
            return view(
              `Penerapan 29 Karakter ${input.year ?? month}: penilaian kolektif jenjang × konteks, bukan diagnosis per peserta.`,
              [
                ...baseCols,
                col('level', 'Jenjang'),
                col('context', 'Konteks'),
                col('status', 'Penilaian'),
                col('notes', 'Catatan pembinaan'),
              ],
              reports.flatMap((r) =>
                items.map((i) => {
                  const v = values.find(
                    (v) =>
                      v.monthly_report_id === r.id && v.activity_id === i.id
                  )
                  return {
                    ...base(r.id),
                    level: i.level_code,
                    context: i.activity_label,
                    status: v?.status ? labels[v.status] : 'Belum dinilai',
                    notes: v?.notes ?? null,
                  }
                })
              )
            )
          }
          if (input.operation === 'materials') {
            const year = input.year ?? Number(month.slice(0, 4))
            const templates = await readRows(
              z.object({ id }),
              signal,
              (from, to) =>
                client
                  .from('lupg_character_target_templates')
                  .select('id')
                  .eq('year', year)
                  .eq('status', 'active')
                  .order('id')
                  .range(from, to)
                  .abortSignal(signal)
            )
            const items = templates.length
              ? await readRows(
                  z.object({
                    id,
                    level_code: id,
                    month_index: number,
                    category_label: id,
                    material_label: id,
                    detail_label: nullable,
                    reference_from: nullable,
                    reference_to: nullable,
                  }),
                  signal,
                  (from, to) => {
                    let q = client
                      .from('lupg_character_target_items')
                      .select(
                        'id,level_code,month_index,category_label,material_label,detail_label,reference_from,reference_to'
                      )
                      .in(
                        'template_id',
                        templates.map((t) => t.id)
                      )
                      .eq('active', true)
                      .order('month_index')
                      .order('level_code')
                      .order('category_label')
                      .order('sort_order')
                      .order('id')
                      .range(from, to)
                      .abortSignal(signal)
                    if (input.month || !input.year)
                      q = q.eq('month_index', Number(month.slice(5)))
                    if (input.level) q = q.eq('level_code', input.level)
                    if (input.category)
                      q = q.eq('category_label', input.category)
                    return q
                  }
                )
              : []
            const values = await children(
              'lupg_character_target_reports',
              z.object({
                id,
                monthly_report_id: id,
                target_item_id: id,
                realization_percent: number.nullable(),
                notes: nullable,
                reference_from_actual: nullable,
                reference_to_actual: nullable,
              }),
              'id,monthly_report_id,target_item_id,realization_percent,notes,reference_from_actual,reference_to_actual'
            )
            return view(
              `Target Capaian Materi ${input.year ?? month}; detail kosong dikecualikan. Rentang Dari/Sampai tetap pada detail. Input yang tidak tercatat ditampilkan kosong.`,
              [
                ...baseCols,
                col('level', 'Jenjang'),
                col('category', 'Kategori'),
                col('material', 'Materi'),
                col('detail', 'Detail'),
                col('reference', 'Dari–Sampai target'),
                col('actual', 'Dari–Sampai aktual'),
                col('percent', 'Capaian', 'percent'),
                col('notes', 'Catatan'),
              ],
              reports.flatMap((r) =>
                items
                  .filter(
                    (i) =>
                      i.detail_label?.trim() &&
                      i.month_index === Number(r.month.slice(5, 7))
                  )
                  .map((i) => {
                    const v = values.find(
                      (v) =>
                        v.monthly_report_id === r.id &&
                        v.target_item_id === i.id
                    )
                    return {
                      ...base(r.id),
                      level: i.level_code,
                      category: i.category_label,
                      material: i.material_label,
                      detail: i.detail_label ?? null,
                      reference:
                        i.reference_from || i.reference_to
                          ? `${i.reference_from ?? '?'} – ${i.reference_to ?? '?'}`
                          : null,
                      actual:
                        v?.reference_from_actual || v?.reference_to_actual
                          ? `${v.reference_from_actual ?? '?'} – ${v.reference_to_actual ?? '?'}`
                          : null,
                      percent: v?.realization_percent ?? null,
                      notes: v?.notes ?? null,
                    }
                  })
              )
            )
          }
          const photos = await children(
            'lupg_activity_photos',
            z.object({ id, report_id: id, caption: nullable }),
            'id,report_id,caption',
            'report_id'
          )
          return view(
            `Dokumentasi ${input.year ?? month}: ${photos.length} foto tercatat; hanya metadata/caption, tanpa analisis visual.`,
            [...baseCols, col('caption', 'Caption')],
            photos.map((p) => ({
              ...base(p.report_id),
              caption: p.caption ?? null,
            }))
          )
        } catch (error) {
          if (error instanceof Error && error.message === 'QUERY_LIMIT')
            return view(
              'Cakupan melebihi batas operasional; persempit bulan atau kelompok.',
              [col('status', 'Status')],
              [],
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
