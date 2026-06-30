import { useQuery } from '@tanstack/react-query'
import { fetchPublicDashboardPayload } from './services'

export function usePublicDashboardPayload(token: string, monthKey: string) {
  return useQuery({
    queryKey: ['public-dashboard', token, monthKey],
    queryFn: () => fetchPublicDashboardPayload(token, monthKey),
    staleTime: 1000 * 60,
  })
}
