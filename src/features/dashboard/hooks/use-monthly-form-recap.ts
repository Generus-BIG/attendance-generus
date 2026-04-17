import { format, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  fetchMonthlyAttendance,
  aggregateMonthlyRecap,
  fetchCensusParticipants,
} from '../services/dashboard-recap.service'
import { type MonthlyFormRecap } from '../types'

interface UseMonthlyFormRecapParams {
  formIds: string[]
  month: Date
  kelompokId?: string
  enabled?: boolean
}

export function useMonthlyFormRecap({
  formIds,
  month,
  kelompokId,
  enabled = true,
}: UseMonthlyFormRecapParams) {
  const monthKey = format(month, 'yyyy-MM')

  return useQuery<MonthlyFormRecap>({
    queryKey: [
      'dashboard-recap',
      monthKey,
      formIds,
      kelompokId ?? null,
    ] as const,
    queryFn: async () => {
      const monthDate = parseISO(`${monthKey}-01`)
      const [records, censusParticipants] = await Promise.all([
        fetchMonthlyAttendance({ formIds, month: monthDate }),
        fetchCensusParticipants(['GPN A', 'GPN B', 'AR'], kelompokId),
      ])
      return aggregateMonthlyRecap(records, monthDate, censusParticipants)
    },
    staleTime: 1000 * 60 * 5,
    enabled: enabled && formIds.length > 0,
  })
}
