import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatMonthLabel } from '../../utils/month-utils'
import { bucketClass, getBucket } from '../../utils/heatmap-buckets'
import { pointFor, polylinePoints } from '../../utils/sparkline'

export interface HeatmapCell {
  /** % value for this (kelompok, month) — null if no data. */
  value: number | null
  /** Numerator (count) — needed for desa rata² weighting. */
  count: number
  /** Denominator (sensus) — needed for desa rata² weighting. */
  denom: number
}

export interface HeatmapRow {
  kelompokId: string
  kelompokName: string
  /** Cells aligned with monthKeys order (oldest → newest). */
  cells: HeatmapCell[]
}

interface Props {
  monthKeys: string[]
  rows: HeatmapRow[]
  selectedKelompokId: string | null
  onRowClick: (kelompokId: string) => void
}

/** Compute unweighted % average of non-null values. */
function avgOfValues(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

export function ProgramHeatmapTable({
  monthKeys,
  rows,
  selectedKelompokId,
  onRowClick,
}: Props) {
  const desaRow = useMemo(() => {
    // For each month column, compute aggregate count / denom across all kelompoks.
    const cells: Array<number | null> = monthKeys.map((_, i) => {
      let sumCount = 0
      let sumDenom = 0
      for (const r of rows) {
        const c = r.cells[i]
        if (!c) continue
        sumCount += c.count
        sumDenom += c.denom
      }
      return sumDenom > 0 ? Math.round((sumCount / sumDenom) * 100) : null
    })
    const avg = avgOfValues(cells)
    return { cells, avg }
  }, [monthKeys, rows])

  const monthNow = monthKeys[monthKeys.length - 1]
  const currentMonthIdx = monthKeys.length - 1

  return (
    <div className='-mx-6 overflow-x-auto px-6'>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead className='bg-card sticky left-0 z-10 text-[0.6875rem] font-medium uppercase tracking-[0.12em] shadow-[1px_0_0_var(--border)]'>
              Kelompok
            </TableHead>
            {monthKeys.map((mk, i) => {
              const isCurrent = mk === monthNow
              return (
                <TableHead
                  key={mk}
                  className={cn(
                    'text-center whitespace-nowrap text-[0.6875rem] font-medium uppercase tracking-[0.12em]',
                    isCurrent && 'text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                  title={formatMonthLabel(mk)}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  {formatMonthLabel(mk).slice(0, 3)}
                  {i === currentMonthIdx && (
                    <span className='sr-only'> (bulan berjalan)</span>
                  )}
                </TableHead>
              )
            })}
            <TableHead className='text-center text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
              Trend
            </TableHead>
            <TableHead className='text-right text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
              Avg
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const values = r.cells.map((c) => c.value)
            const avg = avgOfValues(values)
            const points = polylinePoints(values, { width: 80, height: 28 })
            // Find last non-null index for trailing dot
            let lastIdx = -1
            for (let i = values.length - 1; i >= 0; i--) {
              if (values[i] != null) {
                lastIdx = i
                break
              }
            }
            const dot =
              lastIdx >= 0
                ? pointFor(values, lastIdx, { width: 80, height: 28 })
                : null

            const isActive = selectedKelompokId === r.kelompokId

            return (
              <TableRow
                key={r.kelompokId}
                onClick={() => onRowClick(r.kelompokId)}
                className={cn(
                  'cursor-pointer transition-colors',
                  isActive && 'bg-muted/60 hover:bg-muted/60'
                )}
                aria-expanded={isActive}
              >
                <TableCell
                  className={cn(
                    'bg-card sticky left-0 z-10 font-medium shadow-[1px_0_0_var(--border)]',
                    isActive && 'bg-muted/60'
                  )}
                >
                  {r.kelompokName}
                </TableCell>
                {r.cells.map((c, i) => {
                  const b = getBucket(c.value)
                  const isCurrent = i === currentMonthIdx
                  return (
                    <TableCell
                      key={i}
                      className={cn(
                        'text-center tabular-nums',
                        isCurrent ? 'text-sm font-semibold' : 'text-xs font-medium',
                        bucketClass(b)
                      )}
                    >
                      {c.value != null ? `${c.value}%` : '·'}
                    </TableCell>
                  )
                })}
                <TableCell className='p-1'>
                  {points ? (
                    <svg
                      width={80}
                      height={28}
                      viewBox='0 0 80 28'
                      className='text-foreground/70 block'
                      aria-hidden='true'
                    >
                      <polyline
                        points={points}
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.5}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      {dot && (
                        <circle cx={dot.x} cy={dot.y} r={2} fill='currentColor' />
                      )}
                    </svg>
                  ) : (
                    <span className='text-muted-foreground text-xs'>—</span>
                  )}
                </TableCell>
                <TableCell className='text-right tabular-nums font-medium'>
                  {avg != null ? `${avg}%` : '—'}
                </TableCell>
              </TableRow>
            )
          })}

          {/* Desa rata² row — summary row with tinted background */}
          <TableRow className='bg-muted/40 font-semibold hover:bg-muted/40'>
            <TableCell className='bg-muted/40 sticky left-0 z-10 text-[0.6875rem] uppercase tracking-[0.12em] shadow-[1px_0_0_var(--border)]'>
              Desa rata²
            </TableCell>
            {desaRow.cells.map((v, i) => {
              const b = getBucket(v)
              const isCurrent = i === currentMonthIdx
              return (
                <TableCell
                  key={i}
                  className={cn(
                    'text-center tabular-nums',
                    isCurrent ? 'text-sm' : 'text-xs',
                    bucketClass(b)
                  )}
                >
                  {v != null ? `${v}%` : '·'}
                </TableCell>
              )
            })}
            <TableCell />
            <TableCell className='text-right tabular-nums'>
              {desaRow.avg != null ? `${desaRow.avg}%` : '—'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
