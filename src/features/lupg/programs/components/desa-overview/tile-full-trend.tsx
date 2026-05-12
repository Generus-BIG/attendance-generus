import { useState } from 'react'
import { PROGRAM_TARGET_PCT } from '../../constants'
import { formatMonthLabel } from '../../../utils/month-utils'
import { polylinePoints, sparklineDomain } from '../../../utils/sparkline'
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
const PAD_R = 48 // extra room for endpoint data label
const PAD_T = 14
const PAD_B = 26

const CHART_W = SVG_W - PAD_L - PAD_R
const CHART_H = SVG_H - PAD_T - PAD_B

/** Round a y-axis bound to the nearest multiple of `step`. */
function roundTo(value: number, step: number, dir: 'down' | 'up'): number {
  return dir === 'down'
    ? Math.floor(value / step) * step
    : Math.ceil(value / step) * step
}

export function TileFullTrend({ lines, desaTrend, monthKeys }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // --- Y-axis domain ---
  const allValues: Array<number | null> = [
    ...lines.flatMap((l) => l.monthly),
    ...desaTrend.map((p) => p.value),
  ]
  const { yMin: autoMin, yMax: autoMax } = sparklineDomain(allValues)
  const yMin = roundTo(Math.min(60, autoMin), 10, 'down')
  const yMax = roundTo(Math.max(100, autoMax), 10, 'up')

  // Gridline ticks every 10% within [yMin, yMax].
  const ticks: number[] = []
  for (let t = yMin; t <= yMax; t += 10) ticks.push(t)

  // --- Point math ---
  function toPoints(values: Array<number | null | undefined>): string {
    return polylinePoints(values, {
      width: CHART_W,
      height: CHART_H,
      yMin,
      yMax,
      padding: 0,
    })
  }

  const desaValues = desaTrend.map((p) => p.value)
  const desaPts = toPoints(desaValues)
  const stepX = monthKeys.length > 1 ? CHART_W / (monthKeys.length - 1) : 0

  const xFor = (i: number): number => PAD_L + i * stepX
  const yFor = (v: number): number =>
    PAD_T + CHART_H - ((v - yMin) / (yMax - yMin)) * CHART_H

  // Latest non-null desa value + its index (for endpoint data label).
  let endpointIdx = -1
  for (let i = desaValues.length - 1; i >= 0; i--) {
    if (desaValues[i] != null && !Number.isNaN(desaValues[i] as number)) {
      endpointIdx = i
      break
    }
  }

  // --- Hover data for the panel ---
  const hoveredDesa =
    hoveredIdx != null ? (desaValues[hoveredIdx] ?? null) : null
  const hoveredPrograms =
    hoveredIdx == null
      ? []
      : lines
          .map((l) => ({
            code: l.code,
            name: l.name,
            value: l.monthly[hoveredIdx] ?? null,
          }))
          .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))

  const xLabelFor = (i: number) =>
    formatMonthLabel(monthKeys[i] ?? '').slice(0, 3)

  return (
    <div className='bg-card relative flex h-full flex-col rounded-lg border p-4'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='text-foreground text-xs font-medium'>Trend 12 Bulan</div>
        <div className='text-muted-foreground inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
          <span className='inline-flex items-center gap-1.5'>
            <span
              className='bg-chart-1 inline-block h-0.75 w-5 rounded-full'
              aria-hidden='true'
            />
            Desa rata-rata
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <span
              className='bg-muted-foreground/50 inline-block h-0.5 w-5 rounded-full'
              aria-hidden='true'
            />
            Program (per jenis)
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <span
              className='border-foreground/60 inline-block h-0.5 w-5 border-t border-dashed'
              aria-hidden='true'
            />
            Target {PROGRAM_TARGET_PCT}%
          </span>
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        <svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio='none'
          className='overflow-visible'
          aria-label='Tren rata-rata desa dan per program sepanjang tahun'
        >
          {/* Gridlines + Y-axis labels — every 10% */}
          {ticks.map((t) => {
            const y = yFor(t)
            const isTarget = t === PROGRAM_TARGET_PCT
            return (
              <g key={t}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={SVG_W - PAD_R}
                  y2={y}
                  stroke='currentColor'
                  strokeOpacity={isTarget ? 0.45 : 0.09}
                  strokeWidth={1}
                  strokeDasharray={isTarget ? '4 3' : undefined}
                  className='text-foreground'
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor='end'
                  className='fill-muted-foreground font-mono'
                  style={{ fontSize: '10px' }}
                >
                  {t}%
                </text>
              </g>
            )
          })}

          {/* Vertical grid ticks at each month (faint) */}
          {monthKeys.map((_, i) => (
            <line
              key={`vtick-${i}`}
              x1={xFor(i)}
              y1={PAD_T}
              x2={xFor(i)}
              y2={PAD_T + CHART_H}
              stroke='currentColor'
              strokeOpacity={0.05}
              strokeWidth={1}
              className='text-foreground'
            />
          ))}

          {/* Hover crosshair + bar background */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={xFor(hoveredIdx)}
                y1={PAD_T}
                x2={xFor(hoveredIdx)}
                y2={PAD_T + CHART_H}
                stroke='currentColor'
                strokeOpacity={0.35}
                strokeWidth={1}
                className='text-foreground'
              />
            </g>
          )}

          {/* Program lines (background) */}
          <g transform={`translate(${PAD_L}, ${PAD_T})`}>
            {lines.map((l) => {
              const pts = toPoints(l.monthly)
              if (!pts) return null
              return (
                <polyline
                  key={l.code}
                  points={pts}
                  fill='none'
                  stroke='currentColor'
                  strokeOpacity={0.5}
                  strokeWidth={1.2}
                  className='text-muted-foreground/70'
                />
              )
            })}
            {desaPts && (
              <polyline
                points={desaPts}
                fill='none'
                stroke='currentColor'
                strokeWidth={2.2}
                strokeLinecap='round'
                strokeLinejoin='round'
                className='text-chart-1'
              />
            )}
          </g>

          {/* Hover dots on desa + each program */}
          {hoveredIdx !== null && (
            <g>
              {lines.map((l) => {
                const v = l.monthly[hoveredIdx]
                if (v == null || Number.isNaN(v)) return null
                return (
                  <circle
                    key={`dot-${l.code}`}
                    cx={xFor(hoveredIdx)}
                    cy={yFor(v)}
                    r={2.5}
                    className='fill-muted-foreground/80'
                  />
                )
              })}
              {hoveredDesa != null && !Number.isNaN(hoveredDesa) && (
                <circle
                  cx={xFor(hoveredIdx)}
                  cy={yFor(hoveredDesa)}
                  r={4}
                  className='fill-chart-1 stroke-background'
                  strokeWidth={2}
                />
              )}
            </g>
          )}

          {/* Endpoint data label — only when not hovering (otherwise tooltip wins) */}
          {endpointIdx >= 0 && hoveredIdx === null && (
            <g>
              <circle
                cx={xFor(endpointIdx)}
                cy={yFor(desaValues[endpointIdx] as number)}
                r={3.5}
                className='fill-chart-1 stroke-background'
                strokeWidth={2}
              />
              <text
                x={xFor(endpointIdx) + 8}
                y={yFor(desaValues[endpointIdx] as number) + 3}
                textAnchor='start'
                className='fill-foreground font-mono'
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                {desaValues[endpointIdx]}%
              </text>
            </g>
          )}

          {/* X-axis month labels */}
          {monthKeys.map((_, i) => (
            <text
              key={`xlbl-${i}`}
              x={xFor(i)}
              y={SVG_H - 6}
              textAnchor='middle'
              className={
                hoveredIdx === i
                  ? 'fill-foreground font-medium'
                  : 'fill-muted-foreground'
              }
              style={{ fontSize: '10px' }}
            >
              {xLabelFor(i)}
            </text>
          ))}
        </svg>

        {/* Hover capture overlay — one invisible strip per month */}
        <div
          className='absolute inset-0 flex'
          style={{
            paddingLeft: `${((PAD_L - stepX / 2) / SVG_W) * 100}%`,
            paddingRight: `${((PAD_R - stepX / 2) / SVG_W) * 100}%`,
            paddingTop: `${(PAD_T / SVG_H) * 100}%`,
            paddingBottom: `${(PAD_B / SVG_H) * 100}%`,
          }}
        >
          {monthKeys.map((mk, i) => (
            <div
              key={mk}
              className='flex-1 cursor-crosshair'
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              aria-hidden='true'
            />
          ))}
        </div>

        {/* Floating month panel */}
        {hoveredIdx !== null && (
          <div
            className='bg-popover text-popover-foreground pointer-events-none absolute z-10 min-w-44 max-w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-xs shadow-md'
            style={{
              left: `${(xFor(hoveredIdx) / SVG_W) * 100}%`,
              top: 4,
            }}
            role='tooltip'
          >
            <div className='text-muted-foreground mb-1 text-xs font-medium'>
              {formatMonthLabel(monthKeys[hoveredIdx] ?? '')}
            </div>
            <div className='border-border mb-1.5 flex items-center justify-between gap-4 border-b pb-1.5'>
              <span className='inline-flex items-center gap-1.5 font-semibold'>
                <span
                  className='bg-chart-1 inline-block h-2 w-2 rounded-sm'
                  aria-hidden='true'
                />
                Desa rata-rata
              </span>
              <span className='font-mono tabular-nums'>
                {hoveredDesa != null && !Number.isNaN(hoveredDesa)
                  ? `${hoveredDesa}%`
                  : '—'}
              </span>
            </div>
            <ul className='flex flex-col gap-0.5'>
              {hoveredPrograms.map((p) => (
                <li
                  key={p.code}
                  className='flex items-center justify-between gap-4'
                >
                  <span className='text-muted-foreground truncate'>
                    {p.name}
                  </span>
                  <span className='font-mono tabular-nums'>
                    {p.value != null && !Number.isNaN(p.value)
                      ? `${p.value}%`
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
