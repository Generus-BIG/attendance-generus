'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, CalendarCheck, Clock, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'


async function getDashboardStats() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString()

  // Fetch counts directly from Supabase for better performance
  const [participantsCount, hadirCount, izinCount, pendingCount] = await Promise.all([
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'HADIR')
      .gte('timestamp', startOfMonth)
      .lte('timestamp', endOfMonth),
    supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'IZIN')
      .gte('timestamp', startOfMonth)
      .lte('timestamp', endOfMonth),
    supabase.from('pending_participants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return {
    totalParticipants: participantsCount.count || 0,
    totalHadir: hadirCount.count || 0,
    totalIzin: izinCount.count || 0,
    pendingApprovals: pendingCount.count || 0,
  }
}

export function StatsCards() {
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: getDashboardStats,
    initialData: { totalParticipants: 0, totalHadir: 0, totalIzin: 0, pendingApprovals: 0 },
  })

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('dashboard-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_participants',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Peserta Aktif</CardTitle>
          <Users className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats.totalParticipants}</div>
          <p className='text-xs text-muted-foreground'>
            Peserta terdaftar dan aktif
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Hadir</CardTitle>
          <CalendarCheck className='h-4 w-4 text-teal-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-teal-600'>{stats.totalHadir}</div>
          <p className='text-xs text-muted-foreground'>
            Kehadiran bulan ini
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Izin</CardTitle>
          <Clock className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-amber-600'>{stats.totalIzin}</div>
          <p className='text-xs text-muted-foreground'>
            Izin bulan ini
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Pending Approval</CardTitle>
          <UserCheck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600'>{stats.pendingApprovals}</div>
          <p className='text-xs text-muted-foreground'>
            Menunggu persetujuan
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
