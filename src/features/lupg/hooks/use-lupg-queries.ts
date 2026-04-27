import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import * as monthlyReportSvc from '../services/monthly-report.service'
import * as sensusSvc from '../services/sensus.service'
import * as defsSvc from '../services/definitions.service'
import * as programSvc from '../services/program-report.service'
import * as metricSvc from '../services/metric-report.service'
import * as sarprasSvc from '../services/sarpras-report.service'
import * as shodaqohSvc from '../services/shodaqoh-report.service'
import * as mustinSvc from '../services/mustin-notes.service'
import * as programsSvc from '../programs/services'
import * as matrixSvc from '../matrix/services'
import {
  type DerivedGpnSensusRow,
  type MonthlyReportWithSubmitterRow,
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
  programReports: (mrId: string) =>
    ['lupg', 'program-reports', mrId] as const,
  metricReports: (mrId: string) =>
    ['lupg', 'metric-reports', mrId] as const,
  sarprasReports: (mrId: string) =>
    ['lupg', 'sarpras-reports', mrId] as const,
  shodaqoh: (mrId: string) => ['lupg', 'shodaqoh', mrId] as const,
  mustin: (mrId: string) => ['lupg', 'mustin', mrId] as const,
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
    queryKey: id ? KEYS.monthlyReport(id) : ['lupg', 'monthly-report', 'none'],
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
    queryKey:
      kelompokId && month
        ? KEYS.monthlyReportByKelompokMonth(kelompokId, month)
        : ['lupg', 'monthly-report', 'by', 'none'],
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

// ============== Sensus ==============

export function useSensus(kelompokId: string | undefined) {
  return useQuery({
    queryKey: kelompokId ? KEYS.sensus(kelompokId) : ['lupg', 'sensus', 'none'],
    queryFn: () =>
      kelompokId ? sensusSvc.listSensus(kelompokId) : Promise.resolve([]),
    enabled: !!kelompokId,
  })
}

export function useUpsertSensusCell() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sensusSvc.upsertSensusCell,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.sensus(row.kelompok_id) })
    },
  })
}

export function useSensusSnapshots(monthlyReportId: string | undefined) {
  return useQuery({
    queryKey: monthlyReportId
      ? KEYS.sensusSnapshots(monthlyReportId)
      : ['lupg', 'sensus-snapshots', 'none'],
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
    queryKey: monthlyReportId
      ? KEYS.programReports(monthlyReportId)
      : ['lupg', 'program-reports', 'none'],
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
    queryKey: monthlyReportId
      ? KEYS.metricReports(monthlyReportId)
      : ['lupg', 'metric-reports', 'none'],
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
    queryKey: monthlyReportId
      ? KEYS.sarprasReports(monthlyReportId)
      : ['lupg', 'sarpras-reports', 'none'],
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
    queryKey: monthlyReportId
      ? KEYS.shodaqoh(monthlyReportId)
      : ['lupg', 'shodaqoh', 'none'],
    queryFn: () =>
      monthlyReportId
        ? shodaqohSvc.getShodaqoh(monthlyReportId)
        : Promise.resolve(null),
    enabled: !!monthlyReportId,
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
    queryKey: monthlyReportId
      ? KEYS.mustin(monthlyReportId)
      : ['lupg', 'mustin', 'none'],
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

// ============== Definitions — Admin (all, with CRUD) ==============

const ADMIN_KEYS = {
  allPrograms: ['lupg', 'all-program-defs'] as const,
  allMetrics: ['lupg', 'all-metric-defs'] as const,
  allSarprasItems: ['lupg', 'all-sarpras-items'] as const,
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

function invalidateDefs(
  qc: ReturnType<typeof useQueryClient>,
  target: 'programs' | 'metrics' | 'sarpras'
) {
  if (target === 'programs') {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allPrograms })
    qc.invalidateQueries({ queryKey: ['lupg', 'program-defs'] })
  } else if (target === 'metrics') {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allMetrics })
    qc.invalidateQueries({ queryKey: ['lupg', 'metric-defs'] })
  } else {
    qc.invalidateQueries({ queryKey: ADMIN_KEYS.allSarprasItems })
    qc.invalidateQueries({ queryKey: ['lupg', 'sarpras-items'] })
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
    mutationFn: (v: { id: string; patch: Parameters<typeof defsSvc.updateProgram>[1] }) =>
      defsSvc.updateProgram(v.id, v.patch),
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
    mutationFn: (v: { id: string; patch: Parameters<typeof defsSvc.updateMetric>[1] }) =>
      defsSvc.updateMetric(v.id, v.patch),
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
    mutationFn: (v: { id: string; patch: Parameters<typeof defsSvc.updateSarprasItem>[1] }) =>
      defsSvc.updateSarprasItem(v.id, v.patch),
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

// ============== Programs — Yearly (R1) ==============

const PROGRAM_YEARLY_KEY = (kelompokId: string, year: number) =>
  ['lupg', 'programs-yearly', kelompokId, year] as const

export function useYearlyProgramData(
  kelompokId: string | undefined,
  year: number
) {
  return useQuery({
    queryKey: kelompokId
      ? PROGRAM_YEARLY_KEY(kelompokId, year)
      : ['lupg', 'programs-yearly', 'none'],
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

export function useUpsertProgramMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: programsSvc.upsertProgramMonth,
    onSuccess: (_row, vars) => {
      const year = parseInt(vars.month.slice(0, 4), 10)
      qc.invalidateQueries({ queryKey: PROGRAM_YEARLY_KEY(vars.kelompok_id, year) })
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
    queryKey: kelompokId
      ? MATRIX_YEARLY_KEY(kelompokId, year)
      : ['lupg', 'matrix-yearly', 'none'],
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
      qc.invalidateQueries({ queryKey: MATRIX_YEARLY_KEY(vars.kelompok_id, year) })
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
      reportsQ.data?.length ?? 0,
    ],
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
