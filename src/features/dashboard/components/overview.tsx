import { type BarDatum, HighlightedBar } from '@/components/charts/highlighted-bar'

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const data: BarDatum[] = months.map((name) => ({
  label: name,
  value: Math.floor(Math.random() * 5000) + 1000,
}))

export function Overview() {
  return <HighlightedBar data={data} height={350} />
}
