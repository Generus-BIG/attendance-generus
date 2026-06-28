import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import * as matrixSvc from '../matrix/services'
import * as programsSvc from '../programs/services'
import * as characterSvc from '../services/character-monitoring.service'
import * as characterTargetsSvc from '../services/character-targets.service'
import * as defsSvc from '../services/definitions.service'
import * as metricSvc from '../services/metric-report.service'
import * as monthlyReportSvc from '../services/monthly-report.service'
import * as mustinSvc from '../services/mustin-notes.service'
import * as mustinTmplSvc from '../services/mustin-templates.service'
import * as programSvc from '../services/program-report.service'
import * as sarprasSvc from '../services/sarpras-report.service'
import * as sensusSvc from '../services/sensus.service'
import * as shodaqohSvc from '../services/shodaqoh-report.service'
import {
  type DerivedGpnSensusRow,
  type MonthlyReportWithSubmitterRow,
  type SensusRow,
} from '../types'

const KEYS = {
  monthlyReports: (params: {
    kelompokId?: string
    fromMonth?: string
    toMonth?: string
  }) => ['lupg', 'monthly-reports', params] as const,
  monthlyReport: (id: string) => ['lupg', 'monthly-report', id] as const,
  monthlyReportByKelompokMonth: (kelompokId: string, month: string) =>
    ['lupg', 'monthly-report', 'by', kelompokId, month] as const,
  sensus: (kelompokId: string) => ['lupg', 'sensus', kelompokId] as const,
  sensusSnapshots: (mrId: string) =>
    ['lupg', 'sensus-snapshots', mrId] as const,
  programs: ['lupg', 'program-defs'] as const,
  metrics: ['lupg', 'metric-defs'] as const,
  sarprasItems: ['lupg', 'sarpras-items'] as const,
  mustinTemplates: ['lupg', 'mustin-templates'] as const,
  programReports: (mrId: string) => ['lupg', 'program-reports', mrId] as const,
  metricReports: (mrId: string) => ['lupg', 'metric-reports', mrId] as const,
  sarprasReports: (mrId: string) => ['lupg', 'sarpras-reports', mrId] as const,
  shodaqoh: (mrId: string) => ['lupg', 'shodaqoh', mrId] as const,
  mustin: (mrId: string) => ['lupg', 'mustin', mrId] as const,
  characterActivities: ['lupg', 'character-monitoring-activities'] as const,
  characterActivitiesAll: [
    'lupg',
    'character-monitoring-activities',
    'all',
  ] as const,
  characterReports: (mrId: string) =>
    ['lupg', 'character-monitoring-reports', mrId] as const,
  characterReportsBatch: (mrIds: readonly string[]) =>
    ['lupg', 'character-monitoring-reports', 'batch', mrIds] as const,
  characterTargetTemplates: ['lupg', 'character-target-templates'] as const,
  characterTargetItems: (templateId: string) =>
    ['lupg', 'character-target-items', templateId] as const,
  characterTargetItemsForMonth: (year: number, monthIndex: number) =>
    ['lupg', 'character-target-items', year, monthIndex] as const,
  characterTargetReports: (mrId: string) =>
    ['lupg', 'character-target-reports', mrId] as const,
  characterTargetReportsBatch: (mrIds: readonly string[]) =>
    ['lupg', 'character-target-reports', 'batch', mrIds] as const,
}

export const LUPG_QUERY_KEYS = KEYS

// ============== Monthly Reports ==============

export function useMonthlyReports(params: {
  kelompokId?: string
  fromMonth?: string
  toMonth?: string
}) {
  return useQuery({
    queryKey: KEYS.monthlyReports(params),
    queryFn: () => monthlyReportSvc.listMonthlyReports(params),
  })
}

export function useMonthlyReport(id: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'monthly-report', id ?? 'none'] as const,
    queryFn: () =>
      id ? monthlyReportSvc.getMonthlyReportById(id) : Promise.resolve(null),
    enabled: !!id,
  })
}

export function useMonthlyReportByKelompokMonth(
  kelompokId: string | undefined,
  month: string | undefined
) {
  return useQuery({
    queryKey: [
      'lupg',
      'monthly-report',
      'by',
      kelompokId ?? 'none',
      month ?? 'none',
    ] as const,
    queryFn: () =>
      kelompokId && month
        ? monthlyReportSvc.getMonthlyReport(kelompokId, month)
        : Promise.resolve(null),
    enabled: !!kelompokId && !!month,
  })
}

export function useEnsureMonthlyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { kelompokId: string; month: string }) =>
      monthlyReportSvc.ensureMonthlyReport(vars.kelompokId, vars.month),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['lupg', 'monthly-reports'] })
      qc.invalidateQueries({
        queryKey: KEYS.monthlyReportByKelompokMonth(
          report.kelompok_id,
          report.month.slice(0, 7)
        ),
      })
    },
  })
}

export function useSubmitMonthlyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => monthlyReportSvc.submitMonthlyReport(id),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: KEYS.monthlyReport(report.id) })
      qc.invalidateQueries({ queryKey: ['lupg', 'monthly-reports'] })
      qc.invalidateQueries({ queryKey: KEYS.sensusSnapshots(report.id) })
    },
  })
}

export function useUnlockMonthlyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => monthlyReportSvc.unlockMonthlyReport(id),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: KEYS.monthlyReport(report.id) })
      qc.invalidateQueries({ queryKey: ['lupg', 'monthly-reports'] })
    },
  })
}

// ============== Definitions (shared) ==============

export function useActivePrograms() {
  return useQuery({
    queryKey: KEYS.programs,
    queryFn: defsSvc.listActivePrograms,
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveMetrics() {
  return useQuery({
    queryKey: KEYS.metrics,
    queryFn: defsSvc.listActiveMetrics,
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveSarprasItems() {
  return useQuery({
    queryKey: KEYS.sarprasItems,
    queryFn: defsSvc.listActiveSarprasItems,
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveMustinTemplates() {
  return useQuery({
    queryKey: KEYS.mustinTemplates,
    queryFn: mustinTmplSvc.listActiveMustinTemplates,
    staleTime: 5 * 60 * 1000,
  })
}

// ============== Sensus ==============

export function useSensus(kelompokId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'sensus', kelompokId ?? 'none'] as const,
    queryFn: () =>
      kelompokId ? sensusSvc.listSensus(kelompokId) : Promise.resolve([]),
    enabled: !!kelompokId,
  })
}

export function useSensusForKelompoks(kelompokIds: string[]) {
  return useQuery({
    queryKey: ['lupg', 'sensus', 'desa', kelompokIds] as const,
    queryFn: async () => {
      if (kelompokIds.length === 0) return [] as SensusRow[]
      const { data, error } = await supabase
        .from('lupg_sensus')
        .select('*')
        .in('kelompok_id', kelompokIds)
        .order('category_code')
        .order('gender')
      if (error) throw error
      return (data ?? []) as SensusRow[]
    },
    enabled: kelompokIds.length > 0,
  })
}

export function useUpsertSensusCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sensusSvc.upsertSensusCell,
    onSuccess: (row) => {
      qc.setQueryData<SensusRow[]>(
        KEYS.sensus(row.kelompok_id),
        (prev = []) => {
          const existingIndex = prev.findIndex(
            (item) =>
              item.kelompok_id === row.kelompok_id &&
              item.category_code === row.category_code &&
              item.gender === row.gender
          )
          if (existingIndex === -1) return [...prev, row]
          const next = [...prev]
          next[existingIndex] = row
          return next
        }
      )
      qc.invalidateQueries({ queryKey: KEYS.sensus(row.kelompok_id) })
    },
  })
}

export function useSensusSnapshots(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'sensus-snapshots', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? sensusSvc.listSensusSnapshots(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

// ============== Program Reports ==============

export function useProgramReports(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'program-reports', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? programSvc.listProgramReports(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useUpsertProgramReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: programSvc.upsertProgramReport,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.programReports(row.monthly_report_id),
      })
    },
  })
}

// ============== Metric Reports ==============

export function useMetricReports(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'metric-reports', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? metricSvc.listMetricReports(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useUpsertMetricReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: metricSvc.upsertMetricReport,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.metricReports(row.monthly_report_id),
      })
    },
  })
}

// ============== Sarpras Reports ==============

export function useSarprasReports(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'sarpras-reports', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? sarprasSvc.listSarprasReports(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useUpsertSarprasReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sarprasSvc.upsertSarprasReport,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.sarprasReports(row.monthly_report_id),
      })
    },
  })
}

// ============== Shodaqoh ==============

export function useShodaqoh(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'shodaqoh', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? shodaqohSvc.getShodaqoh(monthlyReportId)
        : Promise.resolve(null),
    enabled: !!monthlyReportId,
  })
}

export function useYearlyShodaqohData(
  kelompokId: string | undefined,
  year: number
) {
  return useQuery({
    queryKey: ['lupg', 'shodaqoh-yearly', kelompokId ?? 'none', year] as const,
    queryFn: () =>
      kelompokId
        ? shodaqohSvc.listYearlyShodaqohData(kelompokId, year)
        : Promise.resolve({ monthlyReports: [], shodaqohRows: [] }),
    enabled: !!kelompokId,
  })
}

export function useUpsertShodaqoh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: shodaqohSvc.upsertShodaqoh,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.shodaqoh(row.monthly_report_id) })
    },
  })
}

// ============== Mustin Notes ==============

export function useMustinNotes(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'mustin', monthlyReportId ?? 'none'] as const,
    queryFn: () =>
      monthlyReportId
        ? mustinSvc.listMustinNotes(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useCreateMustinNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mustinSvc.createMustinNote,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.mustin(row.monthly_report_id) })
    },
  })
}

export function useUpdateMustinNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      patch: Parameters<typeof mustinSvc.updateMustinNote>[1]
      monthlyReportId: string
    }) => mustinSvc.updateMustinNote(vars.id, vars.patch),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.mustin(vars.monthlyReportId) })
    },
  })
}

export function useDeleteMustinNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; monthlyReportId: string }) =>
      mustinSvc.deleteMustinNote(vars.id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.mustin(vars.monthlyReportId) })
    },
  })
}

export function useSeedMustinFromTemplates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      monthlyReportId: string
      templates: Array<{
        code: string
        label: string
        sort_order: number
      }>
    }) => {
      const rows = vars.templates.map((t) => ({
        monthly_report_id: vars.monthlyReportId,
        sort_order: t.sort_order,
        pokok_masalah: t.label,
        keputusan_rencana: '',
        template_code: t.code,
      }))
      return mustinSvc.batchInsertMustinNotes(rows)
    },
    onSuccess: (_rows, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.mustin(vars.monthlyReportId) })
    },
  })
}

// ============== Character Monitoring ==============

export function useActiveCharacterMonitoringActivities() {
  return useQuery({
    queryKey: KEYS.characterActivities,
    queryFn: characterSvc.listActiveCharacterMonitoringActivities,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllCharacterMonitoringActivities() {
  return useQuery({
    queryKey: KEYS.characterActivitiesAll,
    queryFn: characterSvc.listAllCharacterMonitoringActivities,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCharacterMonitoringActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterSvc.createCharacterMonitoringActivity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.characterActivities })
      qc.invalidateQueries({ queryKey: KEYS.characterActivitiesAll })
    },
  })
}

export function useUpdateCharacterMonitoringActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      patch: Parameters<
        typeof characterSvc.updateCharacterMonitoringActivity
      >[1]
    }) => characterSvc.updateCharacterMonitoringActivity(vars.id, vars.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.characterActivities })
      qc.invalidateQueries({ queryKey: KEYS.characterActivitiesAll })
    },
  })
}

export function useDeleteCharacterMonitoringActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterSvc.deleteCharacterMonitoringActivity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.characterActivities })
      qc.invalidateQueries({ queryKey: KEYS.characterActivitiesAll })
    },
  })
}

export function useCharacterMonitoringReports(
  monthlyReportId: string | undefined
) {
  return useQuery({
    queryKey: [
      'lupg',
      'character-monitoring-reports',
      monthlyReportId ?? 'none',
    ] as const,
    queryFn: () =>
      monthlyReportId
        ? characterSvc.listCharacterMonitoringReports(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useCharacterMonitoringReportsBatch(monthlyReportIds: string[]) {
  return useQuery({
    queryKey: KEYS.characterReportsBatch(monthlyReportIds),
    queryFn: () =>
      characterSvc.listCharacterMonitoringReportsBatch(monthlyReportIds),
    enabled: monthlyReportIds.length > 0,
  })
}

export function useUpsertCharacterMonitoringReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterSvc.upsertCharacterMonitoringReport,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.characterReports(row.monthly_report_id),
      })
    },
  })
}

// ============== Character Target Templates ==============

export function useCharacterTargetTemplates() {
  return useQuery({
    queryKey: KEYS.characterTargetTemplates,
    queryFn: characterTargetsSvc.listCharacterTargetTemplates,
  })
}

export function useCharacterTargetItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'character-target-items', templateId ?? 'none'] as const,
    queryFn: () =>
      templateId
        ? characterTargetsSvc.listCharacterTargetItems(templateId)
        : Promise.resolve([]),
    enabled: !!templateId,
  })
}

export function useCharacterTargetItemsForMonth(
  year: number | undefined,
  monthIndex: number | undefined
) {
  return useQuery({
    queryKey: [
      'lupg',
      'character-target-items',
      year ?? 'none',
      monthIndex ?? 'none',
    ] as const,
    queryFn: () =>
      year && monthIndex
        ? characterTargetsSvc.listActiveCharacterTargetItemsForMonth(
            year,
            monthIndex
          )
        : Promise.resolve({ template: null, templates: [], items: [] }),
    enabled: !!year && !!monthIndex,
  })
}

export function useCreateCharacterTargetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterTargetsSvc.createCharacterTargetTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
    },
  })
}

export function useUpdateCharacterTargetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      patch: Parameters<
        typeof characterTargetsSvc.updateCharacterTargetTemplate
      >[1]
    }) =>
      characterTargetsSvc.updateCharacterTargetTemplate(vars.id, vars.patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
      qc.invalidateQueries({ queryKey: KEYS.characterTargetItems(row.id) })
    },
  })
}

export function useDeleteCharacterTargetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterTargetsSvc.deleteCharacterTargetTemplate,
    onSuccess: (_value, templateId) => {
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
      qc.invalidateQueries({ queryKey: KEYS.characterTargetItems(templateId) })
      qc.invalidateQueries({ queryKey: ['lupg', 'character-target-items'] })
      qc.invalidateQueries({ queryKey: ['lupg', 'character-target-reports'] })
    },
  })
}

export function useActivateCharacterTargetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterTargetsSvc.activateCharacterTargetTemplate,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
      qc.invalidateQueries({ queryKey: KEYS.characterTargetItems(row.id) })
      qc.invalidateQueries({ queryKey: ['lupg', 'character-target-items'] })
    },
  })
}

export function useCreateCharacterTargetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterTargetsSvc.createCharacterTargetItem,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.characterTargetItems(row.template_id),
      })
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
    },
  })
}

export function useUpdateCharacterTargetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      id: string
      patch: Parameters<typeof characterTargetsSvc.updateCharacterTargetItem>[1]
    }) => characterTargetsSvc.updateCharacterTargetItem(vars.id, vars.patch),
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.characterTargetItems(row.template_id),
      })
    },
  })
}

export function useReplaceCharacterTargetItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      templateId: string
      items: Parameters<
        typeof characterTargetsSvc.replaceCharacterTargetItems
      >[1]
    }) =>
      characterTargetsSvc.replaceCharacterTargetItems(
        vars.templateId,
        vars.items
      ),
    onSuccess: (_rows, vars) => {
      qc.invalidateQueries({
        queryKey: KEYS.characterTargetItems(vars.templateId),
      })
      qc.invalidateQueries({ queryKey: KEYS.characterTargetTemplates })
    },
  })
}

export function useCharacterTargetReports(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: [
      'lupg',
      'character-target-reports',
      monthlyReportId ?? 'none',
    ] as const,
    queryFn: () =>
      monthlyReportId
        ? characterTargetsSvc.listCharacterTargetReports(monthlyReportId)
        : Promise.resolve([]),
    enabled: !!monthlyReportId,
  })
}

export function useCharacterTargetReportsBatch(monthlyReportIds: string[]) {
  return useQuery({
    queryKey: KEYS.characterTargetReportsBatch(monthlyReportIds),
    queryFn: () =>
      characterTargetsSvc.listCharacterTargetReportsBatch(monthlyReportIds),
    enabled: monthlyReportIds.length > 0,
  })
}

export function useUpsertCharacterTargetReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: characterTargetsSvc.upsertCharacterTargetReport,
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: KEYS.characterTargetReports(row.monthly_report_id),
      })
    },
  })
}

// ============== Definitions — Admin (all, with CRUD) ==============

const ADMIN_KEYS = {
  allPrograms: ['lupg', 'all-program-defs'] as const,
  allMetrics: ['lupg', 'all-metric-defs'] as const,
  allSarprasItems: ['lupg', 'all-sarpras-items'] as const,
  allMustinTemplates: ['lupg', 'all-mustin-templates'] as const,
}

export function useAllPrograms() {
  return useQuery({
    queryKey: ADMIN_KEYS.allPrograms,
    queryFn: defsSvc.listAllPrograms,
  })
}

export function useAllMetrics() {
  return useQuery({
    queryKey: ADMIN_KEYS.allMetrics,
    queryFn: defsSvc.listAllMetrics,
  })
}

export function useAllSarprasItems() {
  return useQuery({
    queryKey: ADMIN_KEYS.allSarprasItems,
    queryFn: defsSvc.listAllSarprasItems,
  })
}

export function useAllMustinTemplates() {
  return useQuery({
    queryKey: ADMIN_KEYS.allMustinTemplates,
    queryFn: mustinTmplSvc.listAllMustinTemplates,
  })
}

function invalidateDefs(
  qc: ReturnType<typeof useQueryClient>,
  target: 'programs' | 'metrics' | 'sarpras' | 'mustin-templates'
) {
  if (target === 'programs') {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allPrograms })
    qc.invalidateQueries({ queryKey: ['lupg', 'program-defs'] })
  } else if (target === 'metrics') {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allMetrics })
    qc.invalidateQueries({ queryKey: ['lupg', 'metric-defs'] })
  } else if (target === 'sarpras') {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allSarprasItems })
    qc.invalidateQueries({ queryKey: ['lupg', 'sarpras-items'] })
  } else {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allMustinTemplates })
    qc.invalidateQueries({ queryKey: ['lupg', 'mustin-templates'] })
  }
}

export function useCreateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.createProgram,
    onSuccess: () => invalidateDefs(qc, 'programs'),
  })
}

export function useUpdateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      patch: Parameters<typeof defsSvc.updateProgram>[1]
    }) => defsSvc.updateProgram(v.id, v.patch),
    onSuccess: () => invalidateDefs(qc, 'programs'),
  })
}

export function useDeleteProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.deleteProgram,
    onSuccess: () => invalidateDefs(qc, 'programs'),
  })
}

export function useCreateMetric() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.createMetric,
    onSuccess: () => invalidateDefs(qc, 'metrics'),
  })
}

export function useUpdateMetric() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      patch: Parameters<typeof defsSvc.updateMetric>[1]
    }) => defsSvc.updateMetric(v.id, v.patch),
    onSuccess: () => invalidateDefs(qc, 'metrics'),
  })
}

export function useDeleteMetric() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.deleteMetric,
    onSuccess: () => invalidateDefs(qc, 'metrics'),
  })
}

export function useCreateSarprasItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.createSarprasItem,
    onSuccess: () => invalidateDefs(qc, 'sarpras'),
  })
}

export function useUpdateSarprasItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      patch: Parameters<typeof defsSvc.updateSarprasItem>[1]
    }) => defsSvc.updateSarprasItem(v.id, v.patch),
    onSuccess: () => invalidateDefs(qc, 'sarpras'),
  })
}

export function useDeleteSarprasItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: defsSvc.deleteSarprasItem,
    onSuccess: () => invalidateDefs(qc, 'sarpras'),
  })
}

export function useCreateMustinTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mustinTmplSvc.createMustinTemplate,
    onSuccess: () => invalidateDefs(qc, 'mustin-templates'),
  })
}

export function useUpdateMustinTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      patch: Parameters<typeof mustinTmplSvc.updateMustinTemplate>[1]
    }) => mustinTmplSvc.updateMustinTemplate(v.id, v.patch),
    onSuccess: () => invalidateDefs(qc, 'mustin-templates'),
  })
}

export function useDeleteMustinTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mustinTmplSvc.deleteMustinTemplate,
    onSuccess: () => invalidateDefs(qc, 'mustin-templates'),
  })
}

// ============== Programs — Yearly (R1) ==============

const PROGRAM_YEARLY_KEY = (kelompokId: string, year: number) =>
  ['lupg', 'programs-yearly', kelompokId, year] as const

export function useYearlyProgramData(
  kelompokId: string | undefined,
  year: number
) {
  return useQuery({
    queryKey: ['lupg', 'programs-yearly', kelompokId ?? 'none', year] as const,
    queryFn: () =>
      kelompokId
        ? programsSvc.listYearlyProgramData(kelompokId, year)
        : Promise.resolve({ monthlyReports: [], programReports: [] }),
    enabled: !!kelompokId,
  })
}

export function useYearlyProgramDataDesa(year: number) {
  return useQuery({
    queryKey: ['lupg', 'programs-yearly-desa', year] as const,
    queryFn: () => programsSvc.listYearlyProgramData(undefined, year),
  })
}

export function useYearlyMetrics(kelompokId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['lupg', 'metrics-yearly', kelompokId ?? 'none', year] as const,
    queryFn: () =>
      kelompokId
        ? metricSvc.listYearlyMetrics(kelompokId, year)
        : Promise.resolve({ monthlyReports: [], metricReports: [] }),
    enabled: !!kelompokId,
  })
}

export function useYearlyMetricsDesa(year: number) {
  return useQuery({
    queryKey: ['lupg', 'metrics-yearly-desa', year] as const,
    queryFn: () => metricSvc.listYearlyMetrics(undefined, year),
  })
}

export function useUpsertProgramMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: programsSvc.upsertProgramMonth,
    onSuccess: (_row, vars) => {
      const year = parseInt(vars.month.slice(0, 4), 10)
      qc.invalidateQueries({
        queryKey: PROGRAM_YEARLY_KEY(vars.kelompok_id, year),
      })
      qc.invalidateQueries({ queryKey: ['lupg', 'monthly-reports'] })
    },
  })
}

// ============== Matrix (R2) ==============

const MATRIX_YEARLY_KEY = (kelompokId: string, year: number) =>
  ['lupg', 'matrix-yearly', kelompokId, year] as const

export function useYearlyMatrixData(
  kelompokId: string | undefined,
  year: number
) {
  return useQuery({
    queryKey: ['lupg', 'matrix-yearly', kelompokId ?? 'none', year] as const,
    queryFn: () =>
      kelompokId
        ? matrixSvc.listYearlyMatrixData(kelompokId, year)
        : Promise.resolve({ monthlyReports: [], metricReports: [] }),
    enabled: !!kelompokId,
  })
}

export function useUpsertMetricMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: matrixSvc.upsertMetricMonth,
    onSuccess: (_row, vars) => {
      const year = parseInt(vars.month.slice(0, 4), 10)
      qc.invalidateQueries({
        queryKey: MATRIX_YEARLY_KEY(vars.kelompok_id, year),
      })
      qc.invalidateQueries({
        queryKey: ['lupg', 'metrics-yearly', vars.kelompok_id, year],
      })
      qc.invalidateQueries({
        queryKey: ['lupg', 'metrics-yearly-desa', year],
      })
      qc.invalidateQueries({ queryKey: ['lupg', 'monthly-reports'] })
    },
  })
}

// ============== Derived GPN Sensus (R2) ==============

export function useDerivedGpnSensus(kelompokId: string | undefined) {
  return useQuery({
    queryKey: ['lupg', 'sensus-gpn-derived', kelompokId ?? 'none'],
    queryFn: async () => {
      if (!kelompokId) return [] as DerivedGpnSensusRow[]
      const { data, error } = await supabase
        .from('lupg_sensus_gpn_derived')
        .select('*')
        .eq('kelompok_id', kelompokId)
      if (error) throw error
      return (data ?? []) as DerivedGpnSensusRow[]
    },
    enabled: !!kelompokId,
  })
}

export function useDerivedGpnSensusForKelompoks(kelompokIds: string[]) {
  return useQuery({
    queryKey: ['lupg', 'sensus-gpn-derived', 'desa', kelompokIds] as const,
    queryFn: async () => {
      if (kelompokIds.length === 0) return [] as DerivedGpnSensusRow[]
      const { data, error } = await supabase
        .from('lupg_sensus_gpn_derived')
        .select('*')
        .in('kelompok_id', kelompokIds)
      if (error) throw error
      return (data ?? []) as DerivedGpnSensusRow[]
    },
    enabled: kelompokIds.length > 0,
  })
}

// ============== Monthly Reports With Submitter (R2, RPC fallback path) ==============

export function useMonthlyReportsWithSubmitter(params?: {
  fromMonth?: string
  toMonth?: string
  kelompokId?: string
}) {
  const reportsQ = useMonthlyReports(params ?? {})
  return useQuery({
    queryKey: [
      'lupg',
      'monthly-reports-with-submitter',
      params ?? {},
      reportsQ.data,
    ] as const,
    queryFn: async () => {
      const reports = reportsQ.data ?? []
      const withNames: MonthlyReportWithSubmitterRow[] = await Promise.all(
        reports.map(async (r) => {
          if (!r.submitted_by) return { ...r, submitter_display_name: null }
          const { data } = await supabase.rpc('lupg_get_submitter_display', {
            p_user_id: r.submitted_by,
          })
          return {
            ...r,
            submitter_display_name: (data as string | null) ?? null,
          }
        })
      )
      return withNames
    },
    enabled: !reportsQ.isLoading,
  })
}
