export const PUBLIC_DASHBOARD_SECTION_LABELS = {
  statCards: 'KPI Cards',
  groupChart: 'Persentase Per Kelompok',
  calendar: 'Kalender Kehadiran',
  categoryChart: 'Persentase Per Kategori',
  genderChart: 'Distribusi Gender',
  attendanceDistribution: 'Distribusi Kehadiran',
  followUp: 'Tindak Lanjut Peserta',
} as const

export type PublicDashboardSectionKey =
  keyof typeof PUBLIC_DASHBOARD_SECTION_LABELS

export type PublicDashboardVisibleSections = Record<
  PublicDashboardSectionKey,
  boolean
>

export const DEFAULT_PUBLIC_DASHBOARD_SECTIONS: PublicDashboardVisibleSections =
  {
    statCards: true,
    groupChart: true,
    calendar: true,
    categoryChart: true,
    genderChart: true,
    attendanceDistribution: true,
    followUp: false,
  }

export type DashboardShareConfig = {
  id: string
  name: string
  token: string
  isActive: boolean
  scope: 'desa'
  formMode: 'all' | 'selected'
  formIds: string[]
  visibleSections: PublicDashboardVisibleSections
  createdAt: string
  updatedAt: string
}

export type UpsertDashboardShareInput = {
  id?: string
  name: string
  isActive: boolean
  formMode: 'all' | 'selected'
  formIds: string[]
  visibleSections: PublicDashboardVisibleSections
}
