import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KelompokSelector } from '../components/kelompok-selector'
import { listOpenMustinNotes } from '../services/mustin-notes.service'
import {
  currentMonthKey,
  formatMonthLabel,
  monthKeyFromDate,
} from '../utils/month-utils'

export function MustinCrossReport() {
  const { role, kelompok } = useAuthStore((s) => s.auth)
  const isTeamManager = role === 'team_manager'

  const { data: kelompokOptions = [] } = useQuery({
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

  const [adminKelompokId, setAdminKelompokId] = useState<string | undefined>()

  const resolvedKelompokId: string | undefined = isTeamManager
    ? kelompokOptions.find((o) => o.value === kelompok)?.id
    : adminKelompokId

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['lupg', 'mustin-cross', resolvedKelompokId],
    queryFn: () =>
      listOpenMustinNotes(
        resolvedKelompokId ? { kelompokId: resolvedKelompokId } : undefined
      ),
  })

  const monthGroups = useMemo(() => {
    const byMonth = new Map<string, typeof notes>()

    for (const note of notes) {
      const monthKey = monthKeyFromDate(note.month)
      byMonth.set(monthKey, [...(byMonth.get(monthKey) ?? []), note])
    }

    const thisMonth = currentMonthKey()

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, items]) => ({
        monthKey,
        label:
          monthKey === thisMonth ? 'Bulan ini' : formatMonthLabel(monthKey),
        items,
      }))
  }, [notes])

  const activeMonth =
    monthGroups.find((group) => group.monthKey === currentMonthKey())
      ?.monthKey ?? monthGroups[0]?.monthKey

  const kelompokLabel = (id: string) =>
    kelompokOptions.find((o) => o.id === id)?.value ?? '-'

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Resume Mustin</h2>
            <p className='text-muted-foreground'>
              Ringkasan pokok masalah dan tindak lanjut yang masih terbuka,
              dikelompokkan per bulan laporan.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {!isTeamManager && (
              <KelompokSelector
                value={adminKelompokId}
                onChange={setAdminKelompokId}
              />
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              {notes.length} item aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex items-center justify-center py-8 text-muted-foreground'>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                Memuat...
              </div>
            ) : monthGroups.length === 0 || !activeMonth ? (
              <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                Tidak ada resume Mustin aktif untuk filter ini.
              </div>
            ) : (
              <Tabs key={activeMonth} defaultValue={activeMonth}>
                <div className='-mx-6 overflow-x-auto px-6'>
                  <TabsList className='h-auto w-max justify-start rounded-none border-b bg-transparent p-0 text-muted-foreground'>
                    {monthGroups.map((group) => (
                      <TabsTrigger
                        key={group.monthKey}
                        value={group.monthKey}
                        className='h-auto rounded-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 py-3 font-semibold shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                      >
                        {group.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {monthGroups.map((group) => (
                  <TabsContent
                    key={group.monthKey}
                    value={group.monthKey}
                    className='mt-4'
                  >
                    <div className='mb-3 flex items-center justify-between gap-3'>
                      <div>
                        <h3 className='font-semibold'>
                          {formatMonthLabel(group.monthKey)}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          {group.items.length} pokok masalah masih perlu
                          ditindaklanjuti.
                        </p>
                      </div>
                    </div>

                    <div className='divide-y rounded-md border'>
                      {group.items.map((note) => (
                        <div
                          key={note.id}
                          className='grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
                        >
                          <div className='space-y-1'>
                            {!isTeamManager && (
                              <p className='text-xs font-medium text-muted-foreground'>
                                {kelompokLabel(note.kelompok_id)}
                              </p>
                            )}
                            <p className='text-sm font-medium whitespace-pre-wrap'>
                              {note.pokok_masalah}
                            </p>
                          </div>
                          <div className='space-y-1'>
                            <p className='text-xs font-medium text-muted-foreground'>
                              Keputusan / Rencana
                            </p>
                            <p className='text-sm whitespace-pre-wrap'>
                              {note.keputusan_rencana}
                            </p>
                          </div>
                          <div className='flex items-start md:justify-end'>
                            <Link
                              to='/admin/lupg/reports/$monthlyReportId'
                              params={{
                                monthlyReportId: note.monthly_report_id,
                              }}
                            >
                              <Button variant='outline' size='sm'>
                                <ExternalLink className='mr-2 h-3.5 w-3.5' />
                                Buka laporan
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
