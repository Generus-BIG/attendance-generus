import { useQuery } from '@tanstack/react-query'
import {
  fetchMonthlyAttendance,
  aggregateMonthlyRecap,
  fetchCensusParticipants,
} from '../services/dashboard-recap.service'
import { type MonthlyFormRecap } from '../types'
import { format } from 'date-fns'

interface UseMonthlyFormRecapParams {
  formIds: string[]
  month: Date
  enabled?: boolean
}

export function useMonthlyFormRecap({
  formIds,
  month,
  enabled = true,
}: UseMonthlyFormRecapParams) {
  const monthKey = format(month, 'yyyy-MM')

  return useQuery<MonthlyFormRecap>({
    queryKey: ['dashboard-recap', monthKey, formIds] as const,
    queryFn: async () => {
      const [records, censusParticipants] = await Promise.all([
        fetchMonthlyAttendance({ formIds, month }),
        fetchCensusParticipants(['GPN A', 'GPN B', 'AR']),
      ])
      return aggregateMonthlyRecap(records, month, censusParticipants)
    },
    staleTime: 1000 * 60 * 5,
    enabled: enabled && formIds.length > 0,
  })
}
