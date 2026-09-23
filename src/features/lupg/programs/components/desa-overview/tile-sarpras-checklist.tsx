import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { type SarprasCompletenessRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: SarprasCompletenessRow[]
  readOnly?: boolean
}

export function TileSarprasChecklist({ rows, readOnly }: Props) {
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
          rows.map((r) => {
            const content = (
              <div className='flex items-center gap-2 rounded px-1 py-0.5'>
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
              </div>
            )
            return (
              <div
                key={r.kelompokId}
                className={
                  readOnly
                    ? ''
                    : 'rounded focus-within:ring-2 focus-within:ring-ring hover:bg-muted'
                }
              >
                {readOnly ? (
                  content
                ) : (
                  <Link
                    to='/admin/lupg/programs'
                    search={{
                      tab: 'kelompok' as const,
                      kelompok: r.kelompokId,
                    }}
                    className='block focus-visible:outline-none'
                    title={`${r.kelompokName}: ${r.okCount}/${r.total} item lengkap`}
                  >
                    {content}
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
