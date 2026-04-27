import {
  type AreaRow,
  type AreaSeriesDef,
  HighlightedArea,
} from '@/components/charts/highlighted-area'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const data: AreaRow[] = DAYS.map((name) => ({
  label: name,
  clicks: Math.floor(Math.random() * 900) + 100,
  uniques: Math.floor(Math.random() * 700) + 80,
}))

const SERIES: AreaSeriesDef[] = [
  { key: 'clicks', label: 'Clicks', colorToken: 'var(--chart-1)' },
  { key: 'uniques', label: 'Uniques', colorToken: 'var(--chart-2)' },
]

export function AnalyticsChart() {
  return <HighlightedArea data={data} series={SERIES} height={300} />
}
