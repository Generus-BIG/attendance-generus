import { formatMonthLabel } from '../../../utils/month-utils'
import {
  polylinePoints,
  sparklineDomain,
} from '../../../utils/sparkline'
import {
  type ProgramTrendLine,
  type TrendPoint,
} from '../../hooks/use-desa-overview'

interface Props {
  lines: ProgramTrendLine[]
  desaTrend: TrendPoint[]
  monthKeys: string[]
}

const SVG_W = 720
const SVG_H = 140
const PADDING_L = 32
const PADDING_R = 12
const PADDING_T = 12
const PADDING_B = 22

export function TileFullTrend({ lines, desaTrend, monthKeys }: Props) {
  const allValues: Array<number | null> = [
    ...lines.flatMap((l) => l.monthly),
    ...desaTrend.map((p) => p.value),
  ]
  const { yMin: autoMin, yMax: autoMax } = sparklineDomain(allValues)
  const yMin = Math.min(60, autoMin)
  const yMax = Math.max(100, autoMax)

  const chartW = SVG_W - PADDING_L - PADDING_R
  const chartH = SVG_H - PADDING_T - PADDING_B

  function toPoints(values: Array<number | null | undefined>): string {
    return polylinePoints(values, {
      width: chartW,
      height: chartH,
      yMin,
      yMax,
      padding: 0,
    })
  }

  const desaValues = desaTrend.map((p) => p.value)
  const desaPts = toPoints(desaValues)
  const xLabelFor = (i: number) => formatMonthLabel(monthKeys[i] ?? '').slice(0, 3)
  const stepX = monthKeys.length > 1 ? chartW / (monthKeys.length - 1) : 0

  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide'>
        <span>Trend 12 Bulan</span>
        <span className='inline-flex items-center gap-3 text-[10px] normal-case'>
          <span className='inline-flex items-center gap-1'>
            <span className='inline-block h-0.5 w-4 bg-emerald-500 dark:bg-emerald-400' />
            Desa rata²
          </span>
          <span className='inline-flex items-center gap-1'>
            <span className='inline-block h-0.5 w-4 bg-zinc-400 dark:bg-zinc-500' />
            Program
          </span>
        </span>
      </div>
      <svg
        width='100%'
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio='none'
        className='min-h-0 flex-1'
        aria-label='Tren rata² desa dan per program sepanjang tahun'
      >
        {[70, 80, 90].map((tick) => {
          const y =
            PADDING_T + chartH - ((tick - yMin) / (yMax - yMin)) * chartH
          return (
            <g key={tick}>
              <line
                x1={PADDING_L}
                y1={y}
                x2={SVG_W - PADDING_R}
                y2={y}
                stroke='currentColor'
                strokeOpacity={0.1}
                strokeWidth={1}
                className='text-foreground'
              />
              <text
                x={PADDING_L - 4}
                y={y + 3}
                textAnchor='end'
                className='fill-muted-foreground'
                style={{ fontSize: '9px' }}
              >
                {tick}%
              </text>
            </g>
          )
        })}
        <g transform={`translate(${PADDING_L}, ${PADDING_T})`}>
          {lines.map((l) => {
            const pts = toPoints(l.monthly)
            if (!pts) return null
            return (
              <polyline
                key={l.code}
                points={pts}
                fill='none'
                stroke='currentColor'
                strokeOpacity={0.45}
                strokeWidth={1.2}
                className='text-zinc-500 dark:text-zinc-400'
              />
            )
          })}
          {desaPts && (
            <polyline
              points={desaPts}
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-emerald-500 dark:text-emerald-400'
            />
          )}
        </g>
        {monthKeys.map((_, i) => (
          <text
            key={i}
            x={PADDING_L + i * stepX}
            y={SVG_H - 4}
            textAnchor='middle'
            className='fill-muted-foreground'
            style={{ fontSize: '9px' }}
          >
            {xLabelFor(i)}
          </text>
        ))}
      </svg>
    </div>
  )
}
