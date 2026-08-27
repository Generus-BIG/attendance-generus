import { statusBg } from '../../../utils/heatmap-buckets'
import { PROGRAM_STATUS_BANDS } from '../../constants'

export function StatusLegend() {
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
      {PROGRAM_STATUS_BANDS.map((band) => (
        <span
          key={band.status}
          className='inline-flex items-center gap-1.5 text-muted-foreground'
        >
          <span
            className={`inline-block h-2 w-2 rounded-sm ${statusBg(band.status)}`}
            aria-hidden='true'
          />
          {band.label}
        </span>
      ))}
      <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
        <span
          className='inline-block h-2 w-2 rounded-sm bg-muted/60'
          aria-hidden='true'
        />
        tidak ada data
      </span>
    </div>
  )
}
