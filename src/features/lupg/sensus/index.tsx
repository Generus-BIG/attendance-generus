import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { KelompokSelector } from '../components/kelompok-selector'
import {
  useDerivedGpnSensus,
  useSensus,
  useUpsertSensusCell,
} from '../hooks/use-lupg-queries'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  type CategoryCode,
} from '../constants'
import { type DerivedGpnSensusRow, type SensusGender } from '../types'
import { SensusCardList } from './components/sensus-card-list'

export function SensusMaster() {
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

  const { data: rows = [], isLoading } = useSensus(resolvedKelompokId)
  const { data: derivedRaw = [] } = useDerivedGpnSensus(resolvedKelompokId)

  const latestUpdatedAt = useMemo(() => {
    if (rows.length === 0) return null
    const timestamps = rows
      .map((r) => r.last_updated_at)
      .filter((t): t is string => typeof t === 'string')
    if (timestamps.length === 0) return null
    const sorted = timestamps.sort()
    return sorted[sorted.length - 1] ?? null
  }, [rows])

  const byCell: Record<string, number> = {}
  for (const r of rows) byCell[`${r.category_code}_${r.gender}`] = r.count

  const derivedByKey = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of derivedRaw as DerivedGpnSensusRow[]) {
      m.set(`${d.category_code}__${d.gender}`, d.count)
    }
    return m
  }, [derivedRaw])

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
        <PageHeader
          kicker='LUPG · Sensus'
          title='Sensus Generus'
          description='Data master peserta per kategori × gender. Update saat ada perubahan.'
          actions={
            !isTeamManager ? (
              <KelompokSelector
                value={adminKelompokId}
                onChange={setAdminKelompokId}
              />
            ) : null
          }
        />

        {!resolvedKelompokId ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            Pilih kelompok untuk mulai input.
          </div>
        ) : isLoading ? (
          <div className='flex items-center justify-center py-16 text-muted-foreground'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat sensus...
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1 border-border/60 border-b pb-3'>
              <div className='flex items-baseline gap-1.5'>
                <span className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
                  Periode
                </span>
                <span className='text-sm font-semibold'>
                  {format(new Date(), 'MMMM yyyy', { locale: idLocale })}
                </span>
                <span className='text-muted-foreground text-xs'>(berjalan)</span>
              </div>
              <div className='flex items-baseline gap-1.5'>
                <span className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
                  Diperbarui
                </span>
                <span className='text-sm tabular-nums'>
                  {latestUpdatedAt
                    ? format(parseISO(latestUpdatedAt), 'dd MMM yyyy, HH:mm', {
                        locale: idLocale,
                      })
                    : 'Belum ada'}
                </span>
              </div>
              <div className='text-muted-foreground ms-auto max-w-[48ch] text-xs'>
                Sensus adalah data master yang selalu mencerminkan keadaan saat ini.
                Snapshot per bulan otomatis dibuat saat laporan bulanan dikirim.
              </div>
            </div>
            <div className='hidden md:block'>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead>Kategori</TableHead>
                      <TableHead className='text-right'>L</TableHead>
                      <TableHead className='text-right'>P</TableHead>
                      <TableHead className='text-right'>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CATEGORY_CODES.map((code) => {
                      const isDerived = code === 'GPN_A' || code === 'GPN_B'
                      const l = isDerived
                        ? (derivedByKey.get(`${code}__L`) ?? 0)
                        : (byCell[`${code}_L`] ?? 0)
                      const p = isDerived
                        ? (derivedByKey.get(`${code}__P`) ?? 0)
                        : (byCell[`${code}_P`] ?? 0)
                      return (
                        <TableRow
                          key={code}
                          className={cn(
                            isDerived && 'bg-muted/40 hover:bg-muted/40'
                          )}
                        >
                          <TableCell className='font-medium'>
                            {CATEGORY_LABELS[code]}
                            {isDerived && (
                              <span className='text-muted-foreground ms-2 text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
                                Otomatis
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {isDerived ? (
                              <DerivedCell count={l} />
                            ) : (
                              <SensusCell
                                kelompokId={resolvedKelompokId}
                                categoryCode={code}
                                gender='L'
                                initial={l}
                              />
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            {isDerived ? (
                              <DerivedCell count={p} />
                            ) : (
                              <SensusCell
                                kelompokId={resolvedKelompokId}
                                categoryCode={code}
                                gender='P'
                                initial={p}
                              />
                            )}
                          </TableCell>
                          <TableCell className='text-right font-semibold tabular-nums'>
                            {l + p}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className='md:hidden'>
              <SensusCardList
                kelompokId={resolvedKelompokId}
                byCell={byCell}
                derivedByKey={derivedByKey}
              />
            </div>
          </>
        )}
      </Main>
    </>
  )
}

interface CellProps {
  kelompokId: string
  categoryCode: CategoryCode
  gender: SensusGender
  initial: number
}

function DerivedCell({ count }: { count: number }) {
  return (
    <div className='flex flex-col items-end gap-0.5'>
      <div className='text-base font-semibold tabular-nums'>{count}</div>
    </div>
  )
}

function SensusCell({ kelompokId, categoryCode, gender, initial }: CellProps) {
  const [value, setValue] = useState(initial.toString())
  const upsert = useUpsertSensusCell()

  useEffect(() => {
    setValue(initial.toString())
  }, [initial])

  const save = () => {
    if (categoryCode === 'GPN_A' || categoryCode === 'GPN_B') return
    const n = parseInt(value, 10)
    if (isNaN(n) || n < 0) {
      setValue(initial.toString())
      return
    }
    if (n === initial) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        category_code: categoryCode,
        gender,
        count: n,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
          setValue(initial.toString())
        },
      }
    )
  }

  return (
    <Input
      type='number'
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      className='ms-auto w-20 text-right tabular-nums'
      inputMode='numeric'
    />
  )
}
