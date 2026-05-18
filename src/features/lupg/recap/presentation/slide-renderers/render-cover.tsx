// Renderer wrapper that composes Cover slide inputs from data-context args.
import { Cover } from '../components/cover'
import { type Slide } from '../slides'

export function renderCoverSlide(args: {
  monthKey: string
  monthLabel: string
  isSingleKelompok: boolean
  scope: string
  pertemuanCount?: number
}): Slide {
  const { monthLabel, isSingleKelompok, scope, pertemuanCount } = args

  const modeLabel = `LAPORAN BULANAN — ${isSingleKelompok ? 'KELOMPOK' : 'DESA'}`
  const titleLines = ['LAPORAN', 'PEMBINAAN', 'GENERUS']
  const tagline = 'Generus Sukses, kita semua Sukses.'
  const metaLines =
    pertemuanCount !== undefined
      ? [scope, `${pertemuanCount} PERTEMUAN`]
      : [scope]

  return {
    key: 'cover',
    title: 'Cover',
    render: () => (
      <Cover
        modeLabel={modeLabel}
        titleLines={titleLines}
        monthLabel={monthLabel}
        tagline={tagline}
        metaLines={metaLines}
      />
    ),
  }
}
