import { ChevronDown, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MUSTIN_STATUS_LABELS } from '../../../constants'
import { type MustinRecapRow } from '../../hooks/use-desa-overview'

interface Props {
  monthLabel: string
  rows: MustinRecapRow[]
  grouped?: boolean
}

const STATUS_CLASS: Record<string, string> = {
  open: 'border-warning/40 bg-warning/10 text-foreground',
  in_progress: 'border-chart-1/40 bg-chart-1/10 text-foreground',
  done: 'border-success/40 bg-success/10 text-foreground',
}

function statusLabel(status: string): string {
  return (
    MUSTIN_STATUS_LABELS[status as keyof typeof MUSTIN_STATUS_LABELS] ?? status
  )
}

function shortTopic(text: string): string {
  const firstLine = text.trim().split(/\r?\n/, 1)[0] ?? ''
  if (firstLine.length <= 100) return firstLine || 'Catatan belum diisi'
  return `${firstLine.slice(0, 99).trimEnd()}…`
}

export function TileMustinRecap({ monthLabel, rows, grouped = false }: Props) {
  const sortedRows = [...rows].sort(
    (a, b) =>
      a.kelompokName.localeCompare(b.kelompokName, 'id') ||
      a.sortOrder - b.sortOrder
  )
  const groupedRows = grouped
    ? (() => {
        const byKelompok = new Map<string, MustinRecapRow[]>()
        for (const row of sortedRows) {
          const list = byKelompok.get(row.kelompokName)
          if (list) list.push(row)
          else byKelompok.set(row.kelompokName, [row])
        }
        return [...byKelompok]
      })()
    : []

  return (
    <section className='flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <div className='mb-3 flex items-start justify-between gap-4'>
        <div>
          <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Resume
          </div>
          <h3 className='mt-1 text-base font-semibold tracking-tight'>
            Resume Mustin
          </h3>
          <p className='mt-1 text-xs text-muted-foreground'>{monthLabel}</p>
        </div>
        <div className='inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground'>
          <NotebookPen className='size-3.5' aria-hidden='true' />
          {rows.length} catatan
        </div>
      </div>

      {sortedRows.length === 0 ? (
        <div className='flex min-h-28 flex-1 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground'>
          Belum ada resume Mustin untuk bulan ini.
        </div>
      ) : grouped ? (
        <div className='divide-y divide-border/70'>
          {groupedRows.map(([kelompokName, notes]) => (
            <details
              key={kelompokName}
              className='group py-2 first:pt-0 last:pb-0'
            >
              <summary className='flex cursor-pointer list-none items-center gap-3 rounded-md py-2 transition-colors outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
                <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                  {kelompokName}
                </span>
                <span className='shrink-0 text-xs text-muted-foreground'>
                  {notes.length} catatan
                </span>
                <ChevronDown
                  className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180'
                  aria-hidden='true'
                />
              </summary>
              <div className='divide-y divide-border/70 rounded-lg bg-muted/20 p-3 sm:p-4'>
                {notes.map((row) => (
                  <div
                    key={row.id}
                    className='grid gap-4 py-3 text-sm first:pt-0 last:pb-0 sm:grid-cols-2'
                  >
                    <div>
                      <h4 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                        Pokok Masalah
                      </h4>
                      <p className='mt-1.5 leading-relaxed whitespace-pre-wrap'>
                        {row.pokokMasalah.trim() || 'Belum ada detail.'}
                      </p>
                    </div>
                    <div>
                      <h4 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                        Keputusan / Rencana
                      </h4>
                      <p className='mt-1.5 leading-relaxed whitespace-pre-wrap'>
                        {row.keputusanRencana.trim() || 'Belum ada rencana.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className='divide-y divide-border/70'>
          {sortedRows.map((row) => (
            <details key={row.id} className='group py-2 first:pt-0 last:pb-0'>
              <summary className='flex cursor-pointer list-none items-center gap-3 rounded-md py-2 transition-colors outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
                <span className='w-24 shrink-0 truncate text-xs font-medium text-muted-foreground sm:w-32'>
                  {row.kelompokName}
                </span>
                <span className='min-w-0 flex-1 truncate text-sm'>
                  {shortTopic(row.pokokMasalah)}
                </span>
                {row.status != null && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium sm:px-2.5',
                      STATUS_CLASS[row.status] ??
                        'bg-muted text-muted-foreground'
                    )}
                  >
                    {statusLabel(row.status)}
                  </span>
                )}
                <ChevronDown
                  className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180'
                  aria-hidden='true'
                />
              </summary>
              <div className='grid gap-4 rounded-lg bg-muted/20 p-3 text-sm sm:grid-cols-2 sm:p-4'>
                <div>
                  <h4 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                    Pokok Masalah
                  </h4>
                  <p className='mt-1.5 leading-relaxed whitespace-pre-wrap'>
                    {row.pokokMasalah.trim() || 'Belum ada detail.'}
                  </p>
                </div>
                <div>
                  <h4 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                    Keputusan / Rencana
                  </h4>
                  <p className='mt-1.5 leading-relaxed whitespace-pre-wrap'>
                    {row.keputusanRencana.trim() || 'Belum ada rencana.'}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
