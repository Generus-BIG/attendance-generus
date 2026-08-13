import { useQuery } from '@tanstack/react-query'
import { fetchPublicDashboardPayload } from './services'

export function usePublicDashboardPayload(
  token: string,
  monthKey: string,
  options: { enabled?: boolean; pollRealtime?: boolean } = {}
) {
  return useQuery({
    queryKey: ['public-dashboard', token, monthKey],
    queryFn: () => fetchPublicDashboardPayload(token, monthKey),
    staleTime: 1000 * 60,
    enabled: options.enabled ?? true,
    refetchInterval: options.pollRealtime
      ? (query) => {
          const payload = query.state.data
          return payload?.status === 'ok' &&
            payload.share.visibleSections.realtimeLog
            ? 15_000
            : false
        }
      : false,
    refetchIntervalInBackground: false,
  })
}
