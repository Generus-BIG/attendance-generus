import { formatMonthLabel } from '../../../utils/month-utils'
import {
  polylinePoints,
  sparklineDomain,
} from '../../../utils/sparkline'
import { areaPath } from '../../../utils/svg-charts'
import {
  type DesaSummary,
  type TrendPoint,
} from '../../hooks/use-desa-overview'

interface Props {
  summary: DesaSummary
  trend: TrendPoint[]
  currentMonthKey: string
  /** Target line %. Default 90. */
  target?: number
}

const SVG_W = 320
const SVG_H = 80

export function TileHeroTrend({
  summary,
  trend,
  currentMonthKey,
  target = 90,
}: Props) {
  const values = trend.map((p) => p.value)
  const { yMin, yMax } = sparklineDomain(values)
  const area = areaPath(values, { width: SVG_W, height: SVG_H, yMin, yMax })
  const line = polylinePoints(values, { width: SVG_W, height: SVG_H, yMin, yMax })
  const padding = 2
  const innerH = Math.max(1, SVG_H - padding * 2)
  const targetY =
    target >= yMin && target <= yMax && yMax !== yMin
      ? padding + innerH - ((target - yMin) / (yMax - yMin)) * innerH
      : null

  const currentLabel = formatMonthLabel(currentMonthKey)

  return (
    <div className='bg-card flex h-full flex-col justify-between rounded-lg border p-4'>
      <div>
        <div className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
          Rata² Desa — {currentLabel}
        </div>
        <div className='mt-1 flex items-baseline gap-3'>
          <span className='font-mono text-4xl font-semibold tabular-nums'>
            {summary.desaAvg != null ? `${summary.desaAvg}%` : '—'}
          </span>
          {summary.deltaDesaAvg != null && (
            <span
              className={
                summary.deltaDesaAvg > 0
                  ? 'text-emerald-600 dark:text-emerald-400 text-sm'
                  : summary.deltaDesaAvg < 0
                    ? 'text-red-600 dark:text-red-400 text-sm'
                    : 'text-muted-foreground text-sm'
              }
            >
              {summary.deltaDesaAvg > 0 ? '+' : summary.deltaDesaAvg < 0 ? '−' : ''}
              {Math.abs(summary.deltaDesaAvg)}% vs bulan lalu
            </span>
          )}
        </div>
      </div>
      <svg
        width='100%'
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio='none'
        className='mt-2 text-emerald-500 dark:text-emerald-400'
        aria-hidden='true'
      >
        {area && (
          <path d={area} fill='currentColor' fillOpacity={0.15} />
        )}
        {line && (
          <polyline
            points={line}
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        )}
        {targetY != null && (
          <line
            x1={0}
            y1={targetY}
            x2={SVG_W}
            y2={targetY}
            strokeDasharray='4 3'
            stroke='currentColor'
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        )}
      </svg>
    </div>
  )
}
