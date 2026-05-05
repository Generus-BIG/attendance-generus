import { formatRupiahShort } from '../../../utils/format-currency'
import { type ShodaqohPerKelompokRow } from '../../hooks/use-desa-overview'

interface Props {
  rows: ShodaqohPerKelompokRow[]
}

export function TileShodaqohBars({ rows }: Props) {
  const total = rows.reduce((a, b) => a + b.nominal, 0)
  const maxNominal = Math.max(1, ...rows.map((r) => r.nominal))
  return (
    <div className='bg-card flex h-full flex-col rounded-lg border p-4'>
      <div className='text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide'>
        Shodaqoh PPG per Kelompok
      </div>
      <div className='flex flex-1 items-end gap-2'>
        {rows.length === 0 ? (
          <div className='text-muted-foreground text-sm'>
            Tidak ada data shodaqoh.
          </div>
        ) : (
          rows.map((r) => {
            const h = Math.max(4, Math.round((r.nominal / maxNominal) * 100))
            return (
              <div
                key={r.kelompokId}
                className='flex min-w-0 flex-1 flex-col items-center gap-1'
              >
                <div className='text-muted-foreground font-mono text-[10px] tabular-nums'>
                  Rp {formatRupiahShort(r.nominal, false)}
                </div>
                <div
                  className='bg-emerald-500 dark:bg-emerald-400 w-full rounded-t'
                  style={{ height: `${h}%` }}
                />
                <div className='w-full truncate text-center text-[10px]'>
                  {r.kelompokName}
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className='text-muted-foreground mt-2 text-right text-[10px]'>
        Total Desa MTD {formatRupiahShort(total)}
      </div>
    </div>
  )
}
