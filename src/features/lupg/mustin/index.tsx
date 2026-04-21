import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KelompokSelector } from '../components/kelompok-selector'
import { MUSTIN_STATUS_LABELS } from '../constants'
import { listOpenMustinNotes } from '../services/mustin-notes.service'
import { type MustinStatus } from '../types'
import { formatMonthLabel, monthKeyFromDate } from '../utils/month-utils'

type StatusFilter = 'all' | MustinStatus

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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

  const filtered =
    statusFilter === 'all'
      ? notes
      : notes.filter((n) => n.status === statusFilter)

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Resume Mustin
            </h2>
            <p className='text-muted-foreground'>
              Action tracker lintas-bulan. Menampilkan item open dan in
              progress dari semua laporan.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {!isTeamManager && (
              <KelompokSelector
                value={adminKelompokId}
                onChange={setAdminKelompokId}
              />
            )}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className='w-[140px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua aktif</SelectItem>
                <SelectItem value='open'>Open</SelectItem>
                <SelectItem value='in_progress'>In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              {filtered.length} item aktif
            </CardTitle>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            {isLoading ? (
              <div className='text-muted-foreground flex items-center justify-center py-8'>
                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
                Tidak ada item aktif.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isTeamManager && <TableHead>Kelompok</TableHead>}
                    <TableHead>Bulan</TableHead>
                    <TableHead>Pokok Masalah</TableHead>
                    <TableHead>Keputusan / Rencana</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id}>
                      {!isTeamManager && (
                        <TableCell>{kelompokLabel(n.kelompok_id)}</TableCell>
                      )}
                      <TableCell>
                        {formatMonthLabel(monthKeyFromDate(n.month))}
                      </TableCell>
                      <TableCell className='max-w-xs whitespace-pre-wrap'>
                        {n.pokok_masalah}
                      </TableCell>
                      <TableCell className='max-w-xs whitespace-pre-wrap'>
                        {n.keputusan_rencana}
                      </TableCell>
                      <TableCell>{n.pic ?? '-'}</TableCell>
                      <TableCell>
                        {n.deadline
                          ? new Date(n.deadline).toLocaleDateString('id-ID')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span className='bg-muted inline-flex items-center rounded-full px-2 py-0.5 text-xs'>
                          {MUSTIN_STATUS_LABELS[n.status as MustinStatus]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          to='/admin/lupg/reports/$monthlyReportId'
                          params={{
                            monthlyReportId: n.monthly_report_id,
                          }}
                        >
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7'
                          >
                            <ExternalLink className='h-3 w-3' />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
