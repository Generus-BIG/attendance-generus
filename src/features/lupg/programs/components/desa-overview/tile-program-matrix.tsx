import { cn } from '@/lib/utils'
import {
  bucketClass,
  getBucket,
} from '../../../utils/heatmap-buckets'
import {
  type KelompokLite,
  type ProgramKelompokMatrixRow,
} from '../../hooks/use-desa-overview'

interface Props {
  rows: ProgramKelompokMatrixRow[]
  kelompoks: KelompokLite[]
}

export function TileProgramMatrix({ rows, kelompoks }: Props) {
  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
        Matrix Program × Kelompok
      </div>
      <div className='min-h-0 flex-1 overflow-auto'>
        <table className='w-full border-collapse text-[11px]'>
          <thead>
            <tr>
              <th className='bg-card sticky left-0 z-10 px-1 py-1 text-left font-medium'>
                Program
              </th>
              {kelompoks.map((k) => (
                <th
                  key={k.id}
                  className='truncate px-1 py-1 text-center font-medium'
                  title={k.name}
                >
                  {k.name.slice(0, 8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.code}>
                <td className='bg-card sticky left-0 z-10 truncate px-1 py-1 font-medium'>
                  {p.name}
                </td>
                {kelompoks.map((k) => {
                  const v = p.byKelompok[k.id] ?? null
                  const b = getBucket(v)
                  return (
                    <td
                      key={k.id}
                      className={cn(
                        'px-1 py-1 text-center font-mono tabular-nums',
                        bucketClass(b)
                      )}
                    >
                      {v != null ? `${v}%` : '·'}
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
