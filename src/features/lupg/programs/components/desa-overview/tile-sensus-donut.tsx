import {
  donutSegments,
  type DonutSlice,
} from '../../../utils/svg-charts'
import { type SensusCategorySlice } from '../../hooks/use-desa-overview'

interface Props {
  slices: SensusCategorySlice[]
  sensusTotal: number
}

const PALETTE = [
  'text-emerald-500',
  'text-sky-500',
  'text-amber-500',
  'text-fuchsia-500',
  'text-lime-500',
  'text-indigo-500',
  'text-rose-500',
  'text-teal-500',
]

const RADIUS = 32
const STROKE = 10
const VIEW = (RADIUS + STROKE) * 2

export function TileSensusDonut({ slices, sensusTotal }: Props) {
  const donutSlices: DonutSlice[] = slices.map((s) => ({
    key: s.category,
    value: s.count,
  }))
  const segs = donutSegments(donutSlices, {
    radius: RADIUS,
    strokeWidth: STROKE,
  })

  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
        Sensus per Kategori
      </div>
      <div className='flex min-h-0 flex-1 items-center gap-3'>
        <svg
          width={VIEW}
          height={VIEW}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          aria-label='Donat distribusi sensus per kategori'
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
                className={PALETTE[i % PALETTE.length]}
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
            style={{ fontSize: '9px' }}
          >
            total
          </text>
        </svg>
        <ul className='flex flex-1 flex-col gap-0.5 text-[11px]'>
          {slices.length === 0 ? (
            <li className='text-muted-foreground'>Tidak ada snapshot.</li>
          ) : (
            slices.map((s, i) => (
              <li
                key={s.category}
                className='flex items-center justify-between gap-2'
              >
                <span className='inline-flex items-center gap-1.5 truncate'>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${PALETTE[i % PALETTE.length].replace('text-', 'bg-')}`}
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
