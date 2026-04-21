import { type Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

export type MonthlyReportRow = Tables['lupg_monthly_reports']['Row']
export type MonthlyReportInsert = Tables['lupg_monthly_reports']['Insert']
export type MonthlyReportUpdate = Tables['lupg_monthly_reports']['Update']

export type SensusRow = Tables['lupg_sensus']['Row']
export type SensusSnapshotRow = Tables['lupg_sensus_snapshots']['Row']

export type ProgramDefinitionRow = Tables['lupg_program_definitions']['Row']
export type ProgramReportRow = Tables['lupg_program_reports']['Row']

export type MetricDefinitionRow = Tables['lupg_metric_definitions']['Row']
export type MetricReportRow = Tables['lupg_metric_reports']['Row']

export type SarprasItemRow = Tables['lupg_sarpras_items']['Row']
export type SarprasReportRow = Tables['lupg_sarpras_reports']['Row']

export type ShodaqohRow = Tables['lupg_shodaqoh']['Row']

export type MustinNoteRow = Tables['lupg_mustin_notes']['Row']

export type MonthlyReportStatus = 'draft' | 'submitted'
export type MustinStatus = 'open' | 'in_progress' | 'done'
export type MetricValueFormat = 'percent' | 'number' | 'currency'
export type MetricScope = 'kelompok' | 'desa'
export type SensusGender = 'L' | 'P'
