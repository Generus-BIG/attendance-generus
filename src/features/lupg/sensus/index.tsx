import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { KelompokSelector } from '../components/kelompok-selector'
import {
  useSensus,
  useUpsertSensusCell,
} from '../hooks/use-lupg-queries'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  type CategoryCode,
} from '../constants'
import { type SensusGender } from '../types'

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

  const byCell: Record<string, number> = {}
  for (const r of rows) byCell[`${r.category_code}_${r.gender}`] = r.count

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
              Sensus Generus
            </h2>
            <p className='text-muted-foreground'>
              Data master peserta per kategori × gender. Update saat ada
              perubahan.
            </p>
          </div>
          {!isTeamManager && (
            <KelompokSelector
              value={adminKelompokId}
              onChange={setAdminKelompokId}
            />
          )}
        </div>

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
          <Card>
            <CardHeader>
              <CardTitle>Sensus Per Kategori</CardTitle>
              <CardDescription>
                Klik sel angka untuk edit. Auto-save saat blur.
              </CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className='text-right'>L</TableHead>
                    <TableHead className='text-right'>P</TableHead>
                    <TableHead className='text-right'>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CATEGORY_CODES.map((code) => {
                    const l = byCell[`${code}_L`] ?? 0
                    const p = byCell[`${code}_P`] ?? 0
                    return (
                      <TableRow key={code}>
                        <TableCell className='font-medium'>
                          {CATEGORY_LABELS[code]}
                        </TableCell>
                        <TableCell className='text-right'>
                          <SensusCell
                            kelompokId={resolvedKelompokId}
                            categoryCode={code}
                            gender='L'
                            initial={l}
                          />
                        </TableCell>
                        <TableCell className='text-right'>
                          <SensusCell
                            kelompokId={resolvedKelompokId}
                            categoryCode={code}
                            gender='P'
                            initial={p}
                          />
                        </TableCell>
                        <TableCell className='text-right font-semibold tabular-nums'>
                          {l + p}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

function SensusCell({ kelompokId, categoryCode, gender, initial }: CellProps) {
  const [value, setValue] = useState(initial.toString())
  const upsert = useUpsertSensusCell()

  useEffect(() => {
    setValue(initial.toString())
  }, [initial])

  const save = () => {
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
