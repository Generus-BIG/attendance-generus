import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'

export function usePhqKelompokScope(selectedKelompokId: string | undefined) {
  const { role, kelompok } = useAuthStore((s) => s.auth)
  const groupsQuery = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })
  const isMt = (role as Role) === 'mt'
  const mtKelompokId = useMemo(
    () => groupsQuery.data?.find((group) => group.value === kelompok)?.id,
    [groupsQuery.data, kelompok]
  )

  return {
    groups: groupsQuery.data ?? [],
    error: groupsQuery.error,
    isLoading: groupsQuery.isLoading,
    isResolving: isMt && groupsQuery.isLoading,
    kelompokId: isMt ? mtKelompokId : selectedKelompokId,
  }
}
