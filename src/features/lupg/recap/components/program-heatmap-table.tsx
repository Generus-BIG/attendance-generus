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
import { bucketClass, getBucket } from '../utils/heatmap-buckets'
import { pointFor, polylinePoints } from '../utils/sparkline'

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

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='sticky left-0 z-10 bg-card'>
              Kelompok
            </TableHead>
            {monthKeys.map((mk) => (
              <TableHead
                key={mk}
                className='text-center whitespace-nowrap'
                title={formatMonthLabel(mk)}
              >
                {formatMonthLabel(mk).slice(0, 3)}
              </TableHead>
            ))}
            <TableHead className='text-center'>Trend</TableHead>
            <TableHead className='text-right'>Avg</TableHead>
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
                  'cursor-pointer',
                  isActive && 'bg-muted/50'
                )}
                aria-expanded={isActive}
              >
                <TableCell className='sticky left-0 z-10 bg-card font-medium'>
                  {r.kelompokName}
                </TableCell>
                {r.cells.map((c, i) => {
                  const b = getBucket(c.value)
                  return (
                    <TableCell
                      key={i}
                      className={cn(
                        'text-center text-xs tabular-nums font-mono',
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
                      className='block'
                      aria-hidden='true'
                    >
                      <polyline
                        points={points}
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={1.5}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='text-emerald-600 dark:text-emerald-400'
                      />
                      {dot && (
                        <circle
                          cx={dot.x}
                          cy={dot.y}
                          r={2}
                          className='fill-emerald-600 dark:fill-emerald-400'
                        />
                      )}
                    </svg>
                  ) : (
                    <span className='text-muted-foreground text-xs'>—</span>
                  )}
                </TableCell>
                <TableCell className='text-right font-mono tabular-nums'>
                  {avg != null ? `${avg}%` : '—'}
                </TableCell>
              </TableRow>
            )
          })}

          {/* Desa rata² row */}
          <TableRow className='border-t-2 font-semibold'>
            <TableCell className='sticky left-0 z-10 bg-card'>
              Desa rata²
            </TableCell>
            {desaRow.cells.map((v, i) => {
              const b = getBucket(v)
              return (
                <TableCell
                  key={i}
                  className={cn(
                    'text-center text-xs font-mono tabular-nums',
                    bucketClass(b)
                  )}
                >
                  {v != null ? `${v}%` : '·'}
                </TableCell>
              )
            })}
            <TableCell />
            <TableCell className='text-right font-mono tabular-nums'>
              {desaRow.avg != null ? `${desaRow.avg}%` : '—'}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
