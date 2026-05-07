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
import { useSensus, useSensusSnapshots } from '../../hooks/use-lupg-queries'
import { CATEGORY_CODES, CATEGORY_LABELS } from '../../constants'
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

  const totalCount = rows.reduce(
    (sum, r) => sum + (r as SensusRow).count,
    0
  )
  const hasData = totalCount > 0

  return (
    <section id='section-sensus' className='scroll-mt-24 flex flex-col gap-4'>
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
              <Button variant='outline' size='sm'>
                <ExternalLink className='mr-2 h-3 w-3' />
                Update Sensus
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div>
        {!hasData ? (
          <div className='flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
            <AlertTriangle className='h-4 w-4 text-yellow-500' />
            {isSubmitted
              ? 'Tidak ada data sensus yang ter-snapshot.'
              : 'Sensus belum pernah diupdate. Klik "Update Sensus" untuk mulai.'}
          </div>
        ) : (
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
                    {rows
                      .filter((r) => r.gender === 'L')
                      .reduce((s, r) => s + r.count, 0)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {rows
                      .filter((r) => r.gender === 'P')
                      .reduce((s, r) => s + r.count, 0)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {totalCount}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  )
}
