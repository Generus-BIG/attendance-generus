import { type Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

export type MonthlyReportRow = Tables['lupg_monthly_reports']['Row']
export type MonthlyReportInsert = Tables['lupg_monthly_reports']['Insert']
export type MonthlyReportUpdate = Tables['lupg_monthly_reports']['Update']

export type SensusRow = Tables['lupg_sensus']['Row']
export type SensusSnapshotRow = Tables['lupg_sensus_snapshots']['Row']
export type SensusCellRow = Pick<
  SensusRow,
  'kelompok_id' | 'category_code' | 'gender' | 'count'
>

export type ProgramDefinitionRow = Tables['lupg_program_definitions']['Row']
export type ProgramReportRow = Tables['lupg_program_reports']['Row']

export type MetricDefinitionRow = Tables['lupg_metric_definitions']['Row']
export type MetricReportRow = Tables['lupg_metric_reports']['Row']

export type SarprasItemRow = Tables['lupg_sarpras_items']['Row']
export type SarprasReportRow = Tables['lupg_sarpras_reports']['Row']

export type ShodaqohRow = Tables['lupg_shodaqoh']['Row']

export type MustinNoteRow = Tables['lupg_mustin_notes']['Row']
export type MustinTemplateRow = Tables['lupg_mustin_templates']['Row']

export type MonthlyReportStatus = 'draft' | 'submitted'
export type MustinStatus = 'open' | 'in_progress' | 'done'
export type MetricValueFormat = 'percent' | 'number' | 'currency'
export type MetricScope = 'kelompok' | 'desa'
export type SensusGender = 'L' | 'P'
export type ReportingStyle = 'monthly_series' | 'quarterly'

export type CharacterMonitoringLevel = 'ACR' | 'APR' | 'AR' | 'GPN'
export type CharacterMonitoringStatus =
  | 'needs_guidance'
  | 'not_applied'
  | 'in_progress'
  | 'consistent'
  | 'established'

export type CharacterTargetReportStatus =
  | 'needs_discussion'
  | 'needs_guidance'
  | 'not_observed'
  | 'in_progress'
  | 'established'

export type CharacterMonitoringActivityRow =
  Tables['lupg_character_monitoring_activities']['Row'] & {
    level_code: CharacterMonitoringLevel
  }

export type CharacterMonitoringActivityInsert = Omit<
  Tables['lupg_character_monitoring_activities']['Insert'],
  'level_code'
> & {
  level_code: CharacterMonitoringLevel
}

export type CharacterMonitoringActivityUpdate = Omit<
  Tables['lupg_character_monitoring_activities']['Update'],
  'level_code'
> & {
  level_code?: CharacterMonitoringLevel
}

export type CharacterMonitoringReportRow = Omit<
  Tables['lupg_character_monitoring_reports']['Row'],
  'status'
> & {
  status: CharacterMonitoringStatus | null
}

export type CharacterMonitoringReportInsert = Omit<
  Tables['lupg_character_monitoring_reports']['Insert'],
  'status'
> & {
  status?: CharacterMonitoringStatus | null
}

export type CharacterMonitoringReportUpdate = Omit<
  Tables['lupg_character_monitoring_reports']['Update'],
  'status'
> & {
  status?: CharacterMonitoringStatus | null
}

export type CharacterTargetTemplateStatus =
  | 'draft'
  | 'parsed'
  | 'active'
  | 'archived'
  | 'failed'
export type CharacterTargetParserMethod =
  | 'manual'
  | 'azure_openai'
  | 'deterministic'

export type CharacterTargetTemplateRow =
  Tables['lupg_character_target_templates']['Row'] & {
    level_code: CharacterMonitoringLevel
    status: CharacterTargetTemplateStatus
    parser_method: CharacterTargetParserMethod
  }
export type CharacterTargetTemplateInsert = Omit<
  Tables['lupg_character_target_templates']['Insert'],
  'level_code' | 'status' | 'parser_method'
> & {
  level_code?: CharacterMonitoringLevel
  status?: CharacterTargetTemplateStatus
  parser_method?: CharacterTargetParserMethod
}
export type CharacterTargetTemplateUpdate = Omit<
  Tables['lupg_character_target_templates']['Update'],
  'level_code' | 'status' | 'parser_method'
> & {
  level_code?: CharacterMonitoringLevel
  status?: CharacterTargetTemplateStatus
  parser_method?: CharacterTargetParserMethod
}

export type CharacterTargetItemRow =
  Tables['lupg_character_target_items']['Row'] & {
    level_code: CharacterMonitoringLevel
  }
export type CharacterTargetItemInsert = Omit<
  Tables['lupg_character_target_items']['Insert'],
  'level_code'
> & {
  level_code: CharacterMonitoringLevel
}
export type CharacterTargetItemUpdate = Omit<
  Tables['lupg_character_target_items']['Update'],
  'level_code'
> & {
  level_code?: CharacterMonitoringLevel
}

export type CharacterTargetReportRow =
  Tables['lupg_character_target_reports']['Row'] & {
    status: CharacterTargetReportStatus
  }
export type CharacterTargetReportInsert = Omit<
  Tables['lupg_character_target_reports']['Insert'],
  'status'
> & {
  status?: CharacterTargetReportStatus
}
export type CharacterTargetReportUpdate = Omit<
  Tables['lupg_character_target_reports']['Update'],
  'status'
> & {
  status?: CharacterTargetReportStatus
}

// ============== R2 additions ==============

export interface DerivedGpnSensusRow {
  kelompok_id: string
  category_code: 'GPN_A' | 'GPN_B' | 'AR' | 'APR'
  gender: 'L' | 'P'
  count: number
}

export interface MonthlyReportWithSubmitterRow extends MonthlyReportRow {
  submitter_display_name: string | null
}

export interface YearlyMatrixData {
  monthlyReports: MonthlyReportRow[]
  metricReports: MetricReportRow[]
}

export interface UpsertMetricMonthInput {
  kelompok_id: string
  month: string // 'YYYY-MM'
  metric_code: string
  current_value: number
}

export type ActivityPhotoRow = Tables['lupg_activity_photos']['Row']
export type ActivityPhotoInsert = Tables['lupg_activity_photos']['Insert']

export type PhqCategory = 'ACR' | 'APR' | 'AR' | 'GPN_A' | 'GPN_B'
export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa'
export type HafalanPredicate =
  | 'Mumtaz'
  | 'Jayyid Jiddan'
  | 'Jayyid'
  | 'Maqbul'
  | 'Dhaif'
export type IntensifProgramCode = 'APR_INTENSIF' | 'AR_INTENSIF'

export type PhqParticipantRow = Tables['lupg_phq_participants']['Row']
export type PhqMeetingRow = Tables['lupg_phq_meetings']['Row']
export type PhqProgressRow = Tables['lupg_phq_progress']['Row']
export type PhqAttendanceRow = Tables['lupg_phq_attendance']['Row']
export type PhqMonthlyNoteRow = Tables['lupg_phq_monthly_notes']['Row']
export type PhqSummaryRow =
  Database['public']['Views']['lupg_phq_summary']['Row']
export type IntensifActivityRow = Tables['lupg_intensif_activities']['Row']
export type IntensifAttendanceRow = Tables['lupg_intensif_attendance']['Row']
export type IntensifSummaryRow =
  Database['public']['Views']['lupg_intensif_summary']['Row']
