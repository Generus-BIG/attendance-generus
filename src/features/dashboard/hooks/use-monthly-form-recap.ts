import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { DASHBOARD_FORMS, type DashboardFormKey, type MonthlyFormRecap } from '../types'
import {
  fetchMonthlyAttendance,
  aggregateMonthlyRecap,
} from '../services/dashboard-recap.service'

type UseMonthlyFormRecapParams = {
  formKey: DashboardFormKey
  month: Date
}

/**
 * Hook to fetch and aggregate monthly attendance data for a specific form
 * 
 * @param formKey - 'profmud' or 'ar'
 * @param month - Date object representing the month to query
 * @returns React Query result with MonthlyFormRecap data
 */
export function useMonthlyFormRecap({ formKey, month }: UseMonthlyFormRecapParams) {
  const config = DASHBOARD_FORMS[formKey]
  const monthKey = format(month, 'yyyy-MM')
  const formId = config.formId
  // Use monthTime for stable query key (Date objects don't work well as keys)
  const monthTime = month.getTime()

  return useQuery<MonthlyFormRecap, Error>({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- month is represented by monthTime
    queryKey: ['dashboard-recap', formKey, monthKey, formId, monthTime],
    queryFn: async () => {
      const records = await fetchMonthlyAttendance({
        formId,
        month,
      })
      return aggregateMonthlyRecap(records, month)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
