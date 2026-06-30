import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  deleteDashboardShare,
  fetchDashboardShares,
  upsertDashboardShare,
} from './services'

export const dashboardSharingQueryKey = ['dashboard-sharing'] as const

export function useDashboardShares() {
  return useQuery({
    queryKey: dashboardSharingQueryKey,
    queryFn: fetchDashboardShares,
  })
}

export function useUpsertDashboardShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertDashboardShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardSharingQueryKey,
      })
      toast.success('Konfigurasi sharing tersimpan.')
    },
    onError: () => {
      toast.error('Gagal menyimpan konfigurasi sharing.')
    },
  })
}

export function useDeleteDashboardShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDashboardShare,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardSharingQueryKey,
      })
      toast.success('Konfigurasi sharing dihapus.')
    },
    onError: () => {
      toast.error('Gagal menghapus konfigurasi sharing.')
    },
  })
}
