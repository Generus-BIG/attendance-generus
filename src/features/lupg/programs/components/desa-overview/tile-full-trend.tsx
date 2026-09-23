import { useMemo, useState } from 'react'
import { formatMonthLabel } from '../../../utils/month-utils'
import { PROGRAM_TARGET_PCT } from '../../constants'
import {
  type ProgramTrendLine,
  type TrendPoint,
} from '../../hooks/use-desa-overview'

interface Props {
  lines: ProgramTrendLine[]
  desaTrend: TrendPoint[]
  monthKeys: string[]
}

const SVG_W = 760
const SVG_H = 200
const PAD_L = 40
const PAD_R = 16
const PAD_T = 14
const PAD_B = 26
const CHART_W = SVG_W - PAD_L - PAD_R
const CHART_H = SVG_H - PAD_T - PAD_B

function segments(
  values: Array<number | null | undefined>,
  x: (i: number) => number,
  y: (value: number) => number
) {
  const result: string[] = []
  let points: string[] = []
  values.forEach((value, index) => {
    if (value == null || Number.isNaN(value)) {
      if (points.length) result.push(points.join(' '))
      points = []
      return
    }
    points.push(`${x(index)},${y(value)}`)
  })
  if (points.length) result.push(points.join(' '))
  return result
}

export function TileFullTrend({ lines, desaTrend, monthKeys }: Props) {
  const [selectedCode, setSelectedCode] = useState('')
  const selectedLine = lines.find((line) => line.code === selectedCode)
  const monthLabels = useMemo(
    () => monthKeys.map((key) => formatMonthLabel(key).slice(0, 3)),
    [monthKeys]
  )
  const stepX = monthKeys.length > 1 ? CHART_W / (monthKeys.length - 1) : 0
  const xFor = (index: number) => PAD_L + index * stepX
  const yFor = (value: number) => PAD_T + CHART_H - (value / 100) * CHART_H
  const desaSegments = segments(
    desaTrend.map((point) => point.value),
    xFor,
    yFor
  )
  const programSegments = selectedLine
    ? segments(selectedLine.monthly, xFor, yFor)
    : []

  return (
    <section className='flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold'>Trend 12 Bulan</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            Desa rata-rata dibanding target program
          </p>
        </div>
        <label className='flex items-center gap-2 text-xs text-muted-foreground'>
          <span>Bandingkan program</span>
          <select
            value={selectedCode}
            onChange={(event) => setSelectedCode(event.target.value)}
            className='h-9 max-w-48 rounded-md border bg-background px-2 text-foreground'
          >
            <option value=''>Tanpa perbandingan</option>
            {lines.map((line) => (
              <option key={line.code} value={line.code}>
                {line.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className='my-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          <span
            className='h-0.75 w-5 rounded-full bg-chart-1'
            aria-hidden='true'
          />
          Desa rata-rata
        </span>
        {selectedLine && (
          <span className='inline-flex max-w-48 items-center gap-1.5 truncate'>
            <span
              className='w-5 border-t border-dashed border-muted-foreground'
              aria-hidden='true'
            />
            {selectedLine.name}
          </span>
        )}
        <span className='inline-flex items-center gap-1.5'>
          <span
            className='w-5 border-t border-dashed border-foreground/60'
            aria-hidden='true'
          />
          Target {PROGRAM_TARGET_PCT}%
        </span>
      </div>
      <div className='min-h-52 flex-1'>
        <svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio='none'
          role='img'
          aria-label={`Tren rata-rata desa${selectedLine ? ` dan ${selectedLine.name}` : ''} selama 12 bulan`}
        >
          <title>
            Tren rata-rata desa dan satu program pilihan selama 12 bulan
          </title>
          {[0, 20, 40, 60, 80, 100].map((tick) => {
            const y = yFor(tick)
            return (
              <g key={tick}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={SVG_W - PAD_R}
                  y2={y}
                  stroke='currentColor'
                  strokeOpacity={tick === PROGRAM_TARGET_PCT ? 0.35 : 0.1}
                  strokeDasharray={
                    tick === PROGRAM_TARGET_PCT ? '4 3' : undefined
                  }
                  className='text-foreground'
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor='end'
                  className='fill-muted-foreground font-mono'
                  style={{ fontSize: '10px' }}
                >
                  {tick}%
                </text>
              </g>
            )
          })}
          {monthKeys.map((month, index) => (
            <text
              key={month}
              x={xFor(index)}
              y={SVG_H - 6}
              textAnchor='middle'
              className='fill-muted-foreground'
              style={{ fontSize: '10px' }}
            >
              {monthLabels[index]}
            </text>
          ))}
          {programSegments.map((points, index) => (
            <polyline
              key={`program-${index}`}
              points={points}
              fill='none'
              stroke='currentColor'
              strokeDasharray='5 4'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-muted-foreground'
            />
          ))}
          {selectedLine?.monthly.map((value, index) =>
            value == null ? null : (
              <circle
                key={`program-point-${index}`}
                cx={xFor(index)}
                cy={yFor(value)}
                r={2}
                className='fill-muted-foreground'
              >
                <title>{`${selectedLine.name}, ${monthLabels[index]}: ${value}%`}</title>
              </circle>
            )
          )}
          {desaSegments.map((points, index) => (
            <polyline
              key={`desa-${index}`}
              points={points}
              fill='none'
              stroke='currentColor'
              strokeWidth={2.5}
              strokeLinecap='round'
              strokeLinejoin='round'
              className='text-chart-1'
            />
          ))}
          {desaTrend.map(({ monthKey, value }, index) =>
            value == null ? null : (
              <circle
                key={monthKey}
                cx={xFor(index)}
                cy={yFor(value)}
                r={2.5}
                className='fill-chart-1'
              >
                <title>{`${formatMonthLabel(monthKey)}: ${value}%`}</title>
              </circle>
            )
          )}
        </svg>
      </div>
      <p className='sr-only'>
        {desaTrend
          .map(
            ({ monthKey, value }) =>
              `${formatMonthLabel(monthKey)}: ${value == null ? 'tidak ada data' : `${value}%`}`
          )
          .join('; ')}
      </p>
      {selectedLine && (
        <p className='sr-only'>
          {selectedLine.monthly
            .map(
              (value, index) =>
                `${monthLabels[index]}: ${value == null ? 'tidak ada data' : `${value}%`}`
            )
            .join('; ')}
        </p>
      )}
    </section>
  )
}
