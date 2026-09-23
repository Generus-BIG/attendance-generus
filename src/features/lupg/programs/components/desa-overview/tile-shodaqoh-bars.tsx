import { Link } from '@tanstack/react-router'
import { formatRupiahShort } from '../../../utils/format-currency'
import { type ShodaqohPerKelompokRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ShodaqohPerKelompokRow[]
  year: number
  readOnly?: boolean
}

export function TileShodaqohBars({ rows, year, readOnly }: Props) {
  const sortedRows = [...rows].sort(
    (a, b) => (b.nominal ?? -1) - (a.nominal ?? -1)
  )
  const values = rows.flatMap((row) =>
    row.nominal == null ? [] : [row.nominal]
  )
  const total = values.length
    ? values.reduce((sum, value) => sum + value, 0)
    : null
  const maximum = Math.max(...values, 0)

  return (
    <section className='flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            Shodaqah PPG per Kelompok
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>
            Total Desa MTD{' '}
            <span className='font-mono font-semibold text-foreground'>
              {total == null ? '—' : formatRupiahShort(total)}
            </span>
          </p>
        </div>
        <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='size-2 rounded-full bg-chart-1' aria-hidden='true' />
          Nominal (Rp)
        </span>
      </div>
      {sortedRows.length === 0 ? (
        <div className='flex min-h-24 flex-1 items-center justify-center text-sm text-muted-foreground'>
          Belum ada data shodaqah.
        </div>
      ) : (
        <ol className='flex flex-col gap-2'>
          {sortedRows.map((row) => {
            const content = (
              <div className='grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)_5rem] items-center gap-3 rounded-md px-2 py-1.5'>
                <span
                  className='truncate text-sm font-medium'
                  title={row.kelompokName}
                >
                  {row.kelompokName}
                </span>
                <div
                  className='h-3 overflow-hidden rounded-full bg-muted'
                  role='progressbar'
                  aria-label={`${row.kelompokName}: ${row.nominal == null ? 'tidak ada data' : formatRupiahShort(row.nominal)}`}
                  aria-valuemin={0}
                  aria-valuemax={maximum || undefined}
                  aria-valuenow={row.nominal ?? undefined}
                >
                  <div
                    className='h-full rounded-full bg-chart-1 transition-[width]'
                    style={{
                      width: `${maximum > 0 && row.nominal != null ? (row.nominal / maximum) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className='text-right font-mono text-xs tabular-nums'>
                  {row.nominal == null ? '—' : formatRupiahShort(row.nominal)}
                </span>
              </div>
            )
            return (
              <li key={row.kelompokId}>
                {readOnly ? (
                  content
                ) : (
                  <Link
                    to='/admin/lupg/programs'
                    search={{
                      tab: 'kelompok',
                      kelompok: row.kelompokId,
                      year: String(year),
                    }}
                    className='block rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    title={`Buka laporan ${row.kelompokName}`}
                  >
                    {content}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
