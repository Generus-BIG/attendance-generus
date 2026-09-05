// Renderer wrapper that composes Closing slide inputs from data-context args.
import { Closing } from '../components/closing'
import { type Slide } from '../slides'

export function renderClosingSlide(args: { monthLabel: string }): Slide {
  const { monthLabel } = args

  const tagline = 'Generus Sukses, kita semua Sukses.'
  const metaLines = ['LAPORAN BULANAN', monthLabel]

  return {
    key: 'closing',
    title: 'Penutup',
    render: () => <Closing tagline={tagline} metaLines={metaLines} />,
  }
}
