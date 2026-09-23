import { formatMonthLabel } from '../../../utils/month-utils'
import { pointFor, sparklineDomain } from '../../../utils/sparkline'
import { areaPath } from '../../../utils/svg-charts'
import {
  type DesaSummary,
  type TrendPoint,
} from '../../hooks/use-desa-overview'

interface Props {
  summary: DesaSummary
  trend: TrendPoint[]
  currentMonthKey: string
  /** Target line %. Default 80. */
  target?: number
}

const SVG_W = 320
const SVG_H = 80

export function TileHeroTrend({
  summary,
  trend,
  currentMonthKey,
  target = 80,
}: Props) {
  const values = trend.map((p) => p.value)
  const { yMin, yMax } = sparklineDomain(values)
  const area = areaPath(values, { width: SVG_W, height: SVG_H, yMin, yMax })
  const lineSegments: string[] = []
  let run: string[] = []
  values.forEach((value, index) => {
    if (value == null || Number.isNaN(value)) {
      if (run.length) lineSegments.push(run.join(' '))
      run = []
      return
    }
    const point = pointFor(values, index, {
      width: SVG_W,
      height: SVG_H,
      yMin,
      yMax,
    })
    if (point) run.push(`${point.x},${point.y}`)
  })
  if (run.length) lineSegments.push(run.join(' '))
  const padding = 2
  const innerH = Math.max(1, SVG_H - padding * 2)
  const targetY =
    target >= yMin && target <= yMax && yMax !== yMin
      ? padding + innerH - ((target - yMin) / (yMax - yMin)) * innerH
      : null

  const currentLabel = formatMonthLabel(currentMonthKey)

  return (
    <div className='flex h-full flex-col justify-between p-4 @3xl/desa:p-6'>
      <div>
        <div className='text-sm font-medium text-muted-foreground'>
          Rata² Desa — {currentLabel}
        </div>
        <div className='mt-1 flex items-baseline gap-3'>
          <span className='font-mono text-5xl font-semibold tabular-nums @3xl/desa:text-6xl'>
            {summary.desaAvg != null ? `${summary.desaAvg}%` : '—'}
          </span>
          {summary.deltaDesaAvg != null && (
            <span
              className={
                summary.deltaDesaAvg > 0
                  ? 'text-sm text-success'
                  : summary.deltaDesaAvg < 0
                    ? 'text-sm text-destructive'
                    : 'text-sm text-muted-foreground'
              }
            >
              {summary.deltaDesaAvg > 0
                ? '+'
                : summary.deltaDesaAvg < 0
                  ? '−'
                  : ''}
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
        className='mt-2 text-chart-1'
        aria-hidden='true'
      >
        {area && <path d={area} fill='currentColor' fillOpacity={0.15} />}
        {lineSegments.map((points, index) => (
          <polyline
            key={index}
            points={points}
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        ))}
        {values.map((_, index) => {
          const point = pointFor(values, index, {
            width: SVG_W,
            height: SVG_H,
            yMin,
            yMax,
          })
          return point ? (
            <circle
              key={trend[index]?.monthKey}
              cx={point.x}
              cy={point.y}
              r={1.5}
              fill='currentColor'
            />
          ) : null
        })}
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
