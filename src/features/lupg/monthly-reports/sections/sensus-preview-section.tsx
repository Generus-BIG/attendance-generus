import { Link } from '@tanstack/react-router'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CATEGORY_CODES, CATEGORY_LABELS } from '../../constants'
import { useSensus, useSensusSnapshots } from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow, type SensusRow } from '../../types'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
}

export function SensusPreviewSection({ report }: Props) {
  const isSubmitted = report.status === 'submitted'

  // For submitted reports, show snapshot. For drafts, show current master.
  const { data: masterRows = [] } = useSensus(
    isSubmitted ? undefined : report.kelompok_id
  )
  const { data: snapshotRows = [] } = useSensusSnapshots(
    isSubmitted ? report.id : undefined
  )

  const rows = isSubmitted ? snapshotRows : masterRows

  // Pivot to (category × gender) matrix
  const byCell: Record<string, number> = {}
  for (const r of rows) {
    byCell[`${r.category_code}_${r.gender}`] = r.count
  }

  const totalCount = rows.reduce((sum, r) => sum + (r as SensusRow).count, 0)
  const totalL = rows
    .filter((r) => r.gender === 'L')
    .reduce((sum, r) => sum + r.count, 0)
  const totalP = rows
    .filter((r) => r.gender === 'P')
    .reduce((sum, r) => sum + r.count, 0)
  const hasData = totalCount > 0

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
            : 'Data master sensus kelompok saat ini (akan di-snapshot saat submit).'
        }
        action={
          !isSubmitted ? (
            <Link to='/admin/lupg/sensus'>
              <Button
                variant='outline'
                size='sm'
                className='min-h-11 w-full sm:min-h-8 sm:w-auto'
              >
                <ExternalLink className='mr-2 h-3 w-3' />
                Update Sensus
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div>
        {!hasData ? (
          <div className='flex items-start gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
            <AlertTriangle className='mt-0.5 size-4 shrink-0 text-yellow-500' />
            {isSubmitted
              ? 'Tidak ada data sensus yang ter-snapshot.'
              : 'Sensus belum pernah diupdate. Klik "Update Sensus" untuk mulai.'}
          </div>
        ) : (
          <>
            <div className='sm:hidden'>
              <div className='grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_3.25rem] gap-1 border-b px-1 pb-2 text-xs font-medium text-muted-foreground'>
                <span>Kategori</span>
                <span className='text-right'>L</span>
                <span className='text-right'>P</span>
                <span className='text-right'>Jumlah</span>
              </div>
              <div>
                {CATEGORY_CODES.map((code) => {
                  const l = byCell[`${code}_L`] ?? 0
                  const p = byCell[`${code}_P`] ?? 0
                  const total = l + p
                  if (total === 0) return null
                  return (
                    <div
                      key={code}
                      className='grid min-h-11 grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_3.25rem] items-center gap-1 border-b px-1 py-2 text-sm'
                    >
                      <span className='min-w-0 leading-snug font-medium wrap-break-word'>
                        {CATEGORY_LABELS[code]}
                      </span>
                      <span className='text-right tabular-nums'>
                        {l || '-'}
                      </span>
                      <span className='text-right tabular-nums'>
                        {p || '-'}
                      </span>
                      <span className='text-right font-medium tabular-nums'>
                        {total}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className='grid min-h-11 grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_3.25rem] items-center gap-1 border-t px-1 pt-2 text-sm font-semibold'>
                <span>Total</span>
                <span className='text-right tabular-nums'>{totalL}</span>
                <span className='text-right tabular-nums'>{totalP}</span>
                <span className='text-right tabular-nums'>{totalCount}</span>
              </div>
            </div>
            <div className='hidden overflow-x-auto sm:block'>
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
                    const l = byCell[`${code}_L`] ?? 0
                    const p = byCell[`${code}_P`] ?? 0
                    const total = l + p
                    if (total === 0) return null
                    return (
                      <TableRow key={code}>
                        <TableCell className='font-medium'>
                          {CATEGORY_LABELS[code]}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {l || '-'}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {p || '-'}
                        </TableCell>
                        <TableCell className='text-right font-medium tabular-nums'>
                          {total}
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
                      {totalCount}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
