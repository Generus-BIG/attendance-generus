import { type PublicDashboardVisibleSections } from '@/features/dashboard-sharing/types'
import { type CensusParticipant } from '@/features/dashboard/services/dashboard-recap.service'
import {
  type AttendanceRecord,
  type DashboardFormItem,
  type MonthlyFormRecap,
} from '@/features/dashboard/types'

export type PublicDashboardRecord = AttendanceRecord & {
  permission_description: string | null
}

export type PublicDashboardPayload =
  | { status: 'unavailable' }
  | {
      status: 'ok'
      share: {
        id: string
        name: string
        token: string
        visibleSections: PublicDashboardVisibleSections
        displayMode: 'monthly' | 'forms'
        formMode: 'all' | 'selected'
        formIds: string[]
      }
      forms: Pick<DashboardFormItem, 'id' | 'title' | 'date'>[]
      records: PublicDashboardRecord[]
      censusParticipants: CensusParticipant[]
      recap: MonthlyFormRecap
    }
