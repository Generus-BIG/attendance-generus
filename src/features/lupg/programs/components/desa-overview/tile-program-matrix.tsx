import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { bucketClass, getBucket } from '../../../utils/heatmap-buckets'
import {
  type KelompokLite,
  type ProgramKelompokMatrixRow,
} from '../../hooks/use-desa-overview'
import { StatusLegend } from './status-legend'

interface Props {
  rows: ProgramKelompokMatrixRow[]
  kelompoks: KelompokLite[]
  year: number
  readOnly?: boolean
}

export function TileProgramMatrix({ rows, kelompoks, year, readOnly }: Props) {
  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-4'>
      <div className='mb-3 flex items-start justify-between gap-2'>
        <div className='text-xs font-medium text-muted-foreground'>
          Matrix Program × Kelompok
        </div>
        <StatusLegend />
      </div>
      <div className='max-h-80 min-h-0 flex-1 overflow-auto'>
        <table className='w-full border-collapse text-xs'>
          <thead>
            <tr>
              <th className='sticky left-0 z-10 min-w-36 bg-card px-2 py-2 text-left font-medium'>
                Program
              </th>
              {kelompoks.map((k) => (
                <th
                  key={k.id}
                  scope='col'
                  className='min-w-24 px-2 py-2 text-center font-medium whitespace-nowrap'
                >
                  {k.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.code}>
                <th
                  scope='row'
                  className='sticky left-0 z-10 min-w-36 truncate bg-card px-2 py-2 text-left font-medium'
                >
                  {p.name}
                </th>
                {kelompoks.map((k) => {
                  const v = p.byKelompok[k.id] ?? null
                  const b = getBucket(v)
                  return (
                    <td
                      key={k.id}
                      className={cn(
                        'min-w-24 px-0 py-0 text-center font-mono tabular-nums',
                        bucketClass(b)
                      )}
                      aria-label={`${p.name}, ${k.name}: ${v != null ? `${v}%` : 'tidak ada data'}`}
                    >
                      {readOnly ? (
                        <span
                          className='block px-1 py-2'
                          title={`${p.name} — ${k.name}`}
                        >
                          {v != null ? `${v}%` : '—'}
                        </span>
                      ) : (
                        <Link
                          to='/admin/lupg/programs'
                          search={{
                            tab: 'kelompok' as const,
                            kelompok: k.id,
                            year: String(year),
                          }}
                          className='block w-full px-1 py-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                          title={`${p.name} — ${k.name}: ${v != null ? `${v}%` : 'tidak ada data'}`}
                        >
                          {v != null ? `${v}%` : '—'}
                        </Link>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
