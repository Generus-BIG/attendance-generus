import { donutSegments, type DonutSlice } from '../../../utils/svg-charts'
import { type SensusCategorySlice } from '../../hooks/use-desa-overview'

interface Props {
  slices: SensusCategorySlice[]
  sensusTotal: number
}

const PALETTE = [
  'text-chart-1',
  'text-chart-2',
  'text-chart-3',
  'text-chart-4',
  'text-chart-5',
] as const

const OTHER_COLOR = 'text-muted-foreground'
const MAX_SLICES = 5

const RADIUS = 32
const STROKE = 10
const VIEW = (RADIUS + STROKE) * 2

export function TileSensusDonut({ slices, sensusTotal }: Props) {
  // Cap at MAX_SLICES and roll the rest into a single "Lainnya" slice.
  const visibleSlices = slices.slice(0, MAX_SLICES)
  const overflow = slices.slice(MAX_SLICES)
  const displaySlices =
    overflow.length === 0
      ? visibleSlices
      : [
          ...visibleSlices,
          {
            category: 'Lainnya',
            count: overflow.reduce((a, b) => a + b.count, 0),
            pct: overflow.reduce((a, b) => a + b.pct, 0),
          },
        ]

  const donutSlices: DonutSlice[] = displaySlices.map((s) => ({
    key: s.category,
    value: s.count,
  }))
  const segs = donutSegments(donutSlices, {
    radius: RADIUS,
    strokeWidth: STROKE,
  })

  function colorFor(idx: number): string {
    if (overflow.length > 0 && idx === displaySlices.length - 1)
      return OTHER_COLOR
    return PALETTE[idx % PALETTE.length]
  }

  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-4'>
      <div className='mb-3 text-xs font-medium text-muted-foreground'>
        Sensus per Kategori
      </div>
      <div className='flex min-h-0 flex-1 items-center gap-3'>
        <svg
          width={VIEW}
          height={VIEW}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          aria-label='Distribusi sensus per kategori'
          className='shrink-0'
        >
          {segs.length === 0 ? (
            <circle
              cx={VIEW / 2}
              cy={VIEW / 2}
              r={RADIUS}
              fill='none'
              stroke='currentColor'
              strokeOpacity={0.15}
              strokeWidth={STROKE}
              className='text-muted-foreground'
            />
          ) : (
            segs.map((s, i) => (
              <circle
                key={s.key}
                cx={VIEW / 2}
                cy={VIEW / 2}
                r={RADIUS}
                fill='none'
                stroke='currentColor'
                strokeWidth={STROKE}
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
                className={colorFor(i)}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: `${VIEW / 2}px ${VIEW / 2}px`,
                }}
              />
            ))
          )}
          <text
            x={VIEW / 2}
            y={VIEW / 2 - 2}
            textAnchor='middle'
            className='fill-foreground font-mono text-lg font-semibold'
            style={{ fontSize: '16px' }}
          >
            {sensusTotal.toLocaleString('id-ID')}
          </text>
          <text
            x={VIEW / 2}
            y={VIEW / 2 + 12}
            textAnchor='middle'
            className='fill-muted-foreground'
            style={{ fontSize: '10px' }}
          >
            total
          </text>
        </svg>
        <ul className='flex flex-1 flex-col gap-1 text-xs'>
          {displaySlices.length === 0 ? (
            <li className='text-muted-foreground'>Tidak ada snapshot.</li>
          ) : (
            displaySlices.map((s, i) => (
              <li
                key={s.category}
                className='flex items-center justify-between gap-2'
              >
                <span className='inline-flex items-center gap-1.5 truncate'>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${colorFor(i).replace('text-', 'bg-')}`}
                  />
                  <span className='truncate'>{s.category}</span>
                </span>
                <span className='font-mono tabular-nums'>
                  {s.count} · {s.pct}%
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
