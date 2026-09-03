import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CATEGORY_CODES,
  CATEGORY_LABELS,
  DERIVED_SENSUS_CATEGORIES,
  type CategoryCode,
} from '../../constants'
import {
  useDerivedGpnSensus,
  useSensus,
  useSensusSnapshots,
  useUpsertSensusCell,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow, type SensusGender } from '../../types'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
}

export function SensusPreviewSection({ report }: Props) {
  const isSubmitted = report.status === 'submitted'
  const { data: masterRows = [] } = useSensus(
    isSubmitted ? undefined : report.kelompok_id
  )
  const { data: derivedRows = [] } = useDerivedGpnSensus(
    isSubmitted ? undefined : report.kelompok_id
  )
  const { data: snapshotRows = [] } = useSensusSnapshots(
    isSubmitted ? report.id : undefined
  )
  const rows = isSubmitted ? snapshotRows : masterRows
  const byCell = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [`${row.category_code}_${row.gender}`, row.count])
      ),
    [rows]
  )
  const derivedByCell = useMemo(
    () =>
      Object.fromEntries(
        derivedRows.map((row) => [
          `${row.category_code}_${row.gender}`,
          row.count,
        ])
      ),
    [derivedRows]
  )

  const cells = CATEGORY_CODES.flatMap((code) =>
    (['L', 'P'] as const).map((gender) => ({
      code,
      gender,
      count:
        !isSubmitted && DERIVED_SENSUS_CATEGORIES.has(code)
          ? (derivedByCell[`${code}_${gender}`] ?? 0)
          : (byCell[`${code}_${gender}`] ?? 0),
    }))
  )
  const totalL = cells
    .filter((cell) => cell.gender === 'L')
    .reduce((sum, cell) => sum + cell.count, 0)
  const totalP = cells
    .filter((cell) => cell.gender === 'P')
    .reduce((sum, cell) => sum + cell.count, 0)

  return (
    <section
      id='section-sensus'
      className='flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Sensus Generus'
        description={
          isSubmitted
            ? 'Snapshot sensus saat laporan disubmit.'
            : 'Isi kategori manual di sini; perubahan langsung tersinkron ke Sensus Generus.'
        }
        action={
          <Link to='/admin/participants'>
            <Button variant='outline' size='sm' className='w-full'>
              <Users className='size-4' aria-hidden='true' />
              Manage Sensus
            </Button>
          </Link>
        }
      />
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className='text-right'>L</TableHead>
              <TableHead className='text-right'>P</TableHead>
              <TableHead className='text-right'>Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORY_CODES.map((code) => {
              const l =
                cells.find((cell) => cell.code === code && cell.gender === 'L')
                  ?.count ?? 0
              const p =
                cells.find((cell) => cell.code === code && cell.gender === 'P')
                  ?.count ?? 0
              const isDerived = DERIVED_SENSUS_CATEGORIES.has(code)
              return (
                <TableRow key={code}>
                  <TableCell className='font-medium'>
                    <div className='flex items-baseline gap-2'>
                      <span>{CATEGORY_LABELS[code]}</span>
                      {isDerived && (
                        <span className='text-xs font-normal text-muted-foreground'>
                          Auto Sync
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    {isSubmitted || isDerived ? (
                      <span
                        className={
                          isDerived ? 'tabular-nums text-muted-foreground' : 'tabular-nums'
                        }
                      >
                        {l}
                      </span>
                    ) : (
                      <SensusInput
                        key={l}
                        kelompokId={report.kelompok_id}
                        code={code}
                        gender='L'
                        initial={l}
                      />
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    {isSubmitted || isDerived ? (
                      <span
                        className={
                          isDerived ? 'tabular-nums text-muted-foreground' : 'tabular-nums'
                        }
                      >
                        {p}
                      </span>
                    ) : (
                      <SensusInput
                        key={p}
                        kelompokId={report.kelompok_id}
                        code={code}
                        gender='P'
                        initial={p}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    className={
                      isDerived
                        ? 'text-right font-medium tabular-nums text-muted-foreground'
                        : 'text-right font-medium tabular-nums'
                    }
                  >
                    {l + p}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className='border-t-2 font-semibold'>
              <TableCell>Total</TableCell>
              <TableCell className='text-right tabular-nums'>
                {totalL}
              </TableCell>
              <TableCell className='text-right tabular-nums'>
                {totalP}
              </TableCell>
              <TableCell className='text-right tabular-nums'>
                {totalL + totalP}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {!isSubmitted && cells.every((cell) => cell.count === 0) && (
        <div className='flex items-start gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
          <AlertTriangle className='mt-0.5 size-4 shrink-0 text-yellow-500' />
          Isi angka sensus manual untuk mulai.
        </div>
      )}
    </section>
  )
}

function SensusInput({
  kelompokId,
  code,
  gender,
  initial,
}: {
  kelompokId: string
  code: CategoryCode
  gender: SensusGender
  initial: number
}) {
  const [value, setValue] = useState(initial.toString())
  const upsert = useUpsertSensusCell()

  const save = () => {
    const count = Number(value)
    if (!Number.isInteger(count) || count < 0) {
      setValue(initial.toString())
      return
    }
    if (count === initial) return
    upsert.mutate(
      { kelompok_id: kelompokId, category_code: code, gender, count },
      {
        onError: (error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : 'Gagal menyimpan'
          )
          setValue(initial.toString())
        },
      }
    )
  }

  return (
    <Input
      className='ml-auto w-20 text-right tabular-nums'
      inputMode='numeric'
      min={0}
      onBlur={save}
      onChange={(event) => setValue(event.target.value)}
      type='number'
      value={value}
    />
  )
}
