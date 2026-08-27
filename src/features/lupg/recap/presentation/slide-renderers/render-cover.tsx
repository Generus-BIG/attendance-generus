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
  const titleLines = ['LAPORAN PEMBINAAN', 'GENERUS']
  const scopePeriodLabel = `${scope} — ${monthLabel}`
  const tagline = 'Sukseskan Gerakan Menanamkan 29 Karakter Luhur Jamaah'
  const metaLines =
    pertemuanCount !== undefined ? [`${pertemuanCount} PERTEMUAN`] : []

  return {
    key: 'cover',
    title: 'Cover',
    render: () => (
      <Cover
        modeLabel={modeLabel}
        titleLines={titleLines}
        scopePeriodLabel={scopePeriodLabel}
        tagline={tagline}
        metaLines={metaLines}
      />
    ),
  }
}
