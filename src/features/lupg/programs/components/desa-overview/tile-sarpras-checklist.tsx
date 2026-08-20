import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { type SarprasCompletenessRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: SarprasCompletenessRow[]
}

export function TileSarprasChecklist({ rows }: Props) {
  return (
    <div className='flex h-full flex-col rounded-lg border bg-card p-4'>
      <div className='mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        Sarpras Checklist
      </div>
      <div className='flex flex-1 flex-col gap-2'>
        {rows.length === 0 ? (
          <div className='text-sm text-muted-foreground'>
            Tidak ada sarpras item.
          </div>
        ) : (
          rows.map((r) => (
            <Link
              key={r.kelompokId}
              to='/admin/lupg/programs'
              search={{ tab: 'kelompok' as const, kelompok: r.kelompokId }}
              className='flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted focus:ring-2 focus:ring-ring focus:outline-none'
              title={`${r.kelompokName}: ${r.okCount}/${r.total} item lengkap`}
            >
              <div className='w-16 truncate text-xs font-medium'>
                {r.kelompokName}
              </div>
              <div className='flex flex-1 gap-0.5'>
                {r.items.map((ok, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-3 flex-1 rounded-[2px]',
                      ok ? 'bg-success' : 'bg-muted'
                    )}
                    title={`Item ${i + 1}`}
                  />
                ))}
              </div>
              <div className='w-10 text-right font-mono text-xs tabular-nums'>
                {r.okCount}/{r.total}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
