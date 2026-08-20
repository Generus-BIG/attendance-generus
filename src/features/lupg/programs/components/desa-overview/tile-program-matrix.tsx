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
}

function kelompokInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()
}

export function TileProgramMatrix({ rows, kelompoks, year }: Props) {
  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-4'>
      <div className='mb-3 flex items-start justify-between gap-2'>
        <div className='text-xs font-medium text-muted-foreground'>
          Matrix Program × Kelompok
        </div>
        <StatusLegend />
      </div>
      <div className='min-h-0 flex-1 overflow-auto'>
        <table className='w-full border-collapse text-xs'>
          <thead>
            <tr>
              <th className='sticky left-0 z-10 bg-card px-1 py-1 text-left font-medium'>
                Program
              </th>
              {kelompoks.map((k) => (
                <th
                  key={k.id}
                  className='px-1 py-1 text-center font-mono font-medium'
                  title={k.name}
                >
                  {kelompokInitials(k.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.code}>
                <td className='sticky left-0 z-10 truncate bg-card px-1 py-1 font-medium'>
                  {p.name}
                </td>
                {kelompoks.map((k) => {
                  const v = p.byKelompok[k.id] ?? null
                  const b = getBucket(v)
                  return (
                    <td
                      key={k.id}
                      className={cn(
                        'px-0 py-0 text-center font-mono tabular-nums',
                        bucketClass(b)
                      )}
                    >
                      <Link
                        to='/admin/lupg/programs'
                        search={{
                          tab: 'kelompok' as const,
                          kelompok: k.id,
                          year: String(year),
                        }}
                        className='block w-full px-1 py-1 hover:underline focus:ring-2 focus:ring-ring focus:outline-none'
                        title={`${p.name} — ${k.name}: ${v != null ? `${v}%` : 'tidak ada data'}`}
                      >
                        {v != null ? `${v}%` : '·'}
                      </Link>
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
