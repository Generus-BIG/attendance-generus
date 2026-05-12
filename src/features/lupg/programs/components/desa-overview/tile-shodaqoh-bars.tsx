import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { formatRupiahShort } from '../../../utils/format-currency'
import { type ShodaqohPerKelompokRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ShodaqohPerKelompokRow[]
}

const SVG_W = 640
const SVG_H = 240
const PAD_T = 28
const PAD_R = 16
const PAD_B = 44
const PAD_L = 56

const CHART_W = SVG_W - PAD_L - PAD_R
const CHART_H = SVG_H - PAD_T - PAD_B

/**
 * Round up to a "nice" axis max (1, 2, 5 × 10^n) so gridlines land on
 * readable Rp values (e.g., a 1.2jt max becomes 2jt, not 1.2jt).
 */
function niceMax(maxVal: number): number {
  if (maxVal <= 0) return 1_000_000
  const order = Math.pow(10, Math.floor(Math.log10(maxVal)))
  const normalized = maxVal / order
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return niceNormalized * order
}

export function TileShodaqohBars({ rows }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const total = rows.reduce((a, b) => a + b.nominal, 0)
  const rawMax = Math.max(0, ...rows.map((r) => r.nominal))
  const yMax = niceMax(rawMax)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax)

  const barCount = rows.length
  const groupW = barCount > 0 ? CHART_W / barCount : 0
  const barW = Math.min(48, groupW * 0.62)

  const yFor = (value: number): number =>
    PAD_T + CHART_H - (value / yMax) * CHART_H

  return (
    <div className='bg-card relative flex h-full flex-col rounded-lg border p-4'>
      <div className='mb-2 flex items-start justify-between gap-3'>
        <div>
          <div className='text-foreground text-xs font-medium'>
            Shodaqoh PPG per Kelompok
          </div>
          <div className='text-muted-foreground mt-0.5 text-xs'>
            Total Desa MTD{' '}
            <span className='text-foreground font-mono font-semibold tabular-nums'>
              {formatRupiahShort(total)}
            </span>
          </div>
        </div>
        <div className='text-muted-foreground inline-flex items-center gap-1.5 text-xs'>
          <span
            className='bg-chart-1 inline-block h-2 w-2 rounded-sm'
            aria-hidden='true'
          />
          Nominal (Rp)
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        {rows.length === 0 ? (
          <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
            Tidak ada data shodaqoh.
          </div>
        ) : (
          <>
            <svg
              width='100%'
              height='100%'
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio='none'
              role='img'
              aria-label={`Shodaqoh per kelompok, total ${formatRupiahShort(total)}`}
              className='overflow-visible'
            >
              {/* Gridlines + Y-axis labels */}
              {ticks.map((t) => {
                const y = yFor(t)
                const isBaseline = t === 0
                return (
                  <g key={t}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={SVG_W - PAD_R}
                      y2={y}
                      stroke='currentColor'
                      strokeOpacity={isBaseline ? 0.35 : 0.09}
                      strokeWidth={1}
                      strokeDasharray={isBaseline ? undefined : '3 3'}
                      className='text-foreground'
                    />
                    <text
                      x={PAD_L - 8}
                      y={y + 3}
                      textAnchor='end'
                      className='fill-muted-foreground font-mono'
                      style={{ fontSize: '10px' }}
                    >
                      {isBaseline ? 'Rp 0' : formatRupiahShort(t)}
                    </text>
                  </g>
                )
              })}

              {/* Hover highlight band (behind bars) */}
              {hoveredIdx !== null && (
                <rect
                  x={PAD_L + hoveredIdx * groupW + 2}
                  y={PAD_T}
                  width={Math.max(0, groupW - 4)}
                  height={CHART_H}
                  className='fill-muted/50'
                  rx={4}
                />
              )}

              {/* Bars + outside labels + x-axis names */}
              {rows.map((r, i) => {
                const barX = PAD_L + i * groupW + (groupW - barW) / 2
                const barH =
                  r.nominal > 0 ? (r.nominal / yMax) * CHART_H : 0
                const barY = PAD_T + CHART_H - barH
                const isHovered = hoveredIdx === i
                const labelY = r.nominal > 0 ? barY - 7 : yFor(0) - 7

                return (
                  <g key={r.kelompokId}>
                    {r.nominal > 0 ? (
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx={3}
                        ry={3}
                        className={
                          isHovered
                            ? 'fill-chart-1'
                            : 'fill-chart-1 opacity-85'
                        }
                        style={{ transition: 'opacity 150ms ease' }}
                      />
                    ) : (
                      /* Zero-value marker: thin stub above baseline */
                      <rect
                        x={barX}
                        y={yFor(0) - 2}
                        width={barW}
                        height={2}
                        rx={1}
                        className='fill-muted-foreground/40'
                      />
                    )}

                    {/* Outside top data label */}
                    <text
                      x={barX + barW / 2}
                      y={labelY}
                      textAnchor='middle'
                      className={
                        r.nominal > 0
                          ? 'fill-foreground font-mono'
                          : 'fill-muted-foreground font-mono'
                      }
                      style={{
                        fontSize: '10px',
                        fontWeight: r.nominal > 0 ? 600 : 400,
                      }}
                    >
                      {r.nominal > 0
                        ? formatRupiahShort(r.nominal, false)
                        : '—'}
                    </text>

                    {/* X-axis kelompok name */}
                    <text
                      x={PAD_L + i * groupW + groupW / 2}
                      y={PAD_T + CHART_H + 18}
                      textAnchor='middle'
                      className={
                        isHovered
                          ? 'fill-foreground font-medium'
                          : 'fill-muted-foreground'
                      }
                      style={{ fontSize: '11px' }}
                    >
                      {r.kelompokName}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Transparent Link overlay — captures hover + drill-through. */}
            <div
              className='absolute inset-0 flex'
              style={{
                paddingLeft: `${(PAD_L / SVG_W) * 100}%`,
                paddingRight: `${(PAD_R / SVG_W) * 100}%`,
                paddingTop: `${(PAD_T / SVG_H) * 100}%`,
                paddingBottom: `${(PAD_B / SVG_H) * 100}%`,
              }}
            >
              {rows.map((r, i) => (
                <Link
                  key={r.kelompokId}
                  to='/admin/lupg/programs'
                  search={{
                    tab: 'kelompok' as const,
                    kelompok: r.kelompokId,
                  }}
                  className='focus-visible:ring-ring flex flex-1 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none'
                  aria-label={`Buka ${r.kelompokName}, Shodaqoh Rp ${r.nominal.toLocaleString('id-ID')}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(i)}
                  onBlur={() => setHoveredIdx(null)}
                />
              ))}
            </div>

            {/* Floating tooltip — single instance, repositions on hover. */}
            {hoveredIdx !== null && (
              <div
                className='bg-popover text-popover-foreground pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-md border px-3 py-2 text-xs shadow-md'
                style={{
                  left: `${((PAD_L + hoveredIdx * groupW + groupW / 2) / SVG_W) * 100}%`,
                  top: 0,
                }}
                role='tooltip'
              >
                <div className='font-semibold'>
                  {rows[hoveredIdx].kelompokName}
                </div>
                <div className='mt-1 flex items-center gap-2'>
                  <span
                    className='bg-chart-1 inline-block h-2 w-2 rounded-sm'
                    aria-hidden='true'
                  />
                  <span className='font-mono tabular-nums'>
                    Rp{' '}
                    {rows[hoveredIdx].nominal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className='text-muted-foreground mt-0.5'>
                  {total > 0 && rows[hoveredIdx].nominal > 0
                    ? `${Math.round((rows[hoveredIdx].nominal / total) * 100)}% dari total desa`
                    : 'Belum ada kontribusi'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
