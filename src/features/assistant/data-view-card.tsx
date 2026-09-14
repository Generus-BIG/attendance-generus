import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseDataView, type AssistantDataResult } from './data-view'

const labels = {
  en: {
    running: 'Retrieving data…',
    error: 'Could not retrieve this source. Please retry.',
    cancelled: 'Cancelled',
    invalid: 'Invalid result. Please retry.',
    chart: 'Chart',
    table: 'Table',
    fallback: 'Chart unavailable',
    empty: 'No data for this scope.',
    source: 'Open source',
    current: 'Current data',
  },
  id: {
    running: 'Mengambil data…',
    error: 'Sumber belum dapat diambil. Silakan coba lagi.',
    cancelled: 'Dibatalkan',
    invalid: 'Hasil tidak valid. Silakan coba lagi.',
    chart: 'Grafik',
    table: 'Tabel',
    fallback: 'Grafik tidak tersedia',
    empty: 'Tidak ada data untuk cakupan ini.',
    source: 'Buka sumber',
    current: 'Data terkini',
  },
}

export function DataViewCard({
  result,
  state = 'complete',
  language = 'en',
}: {
  result?: unknown
  state?: 'running' | 'complete' | 'query-error' | 'cancelled'
  language?: 'id' | 'en'
}) {
  const t = labels[language]
  if (state === 'running')
    return (
      <div role='status' className='flex flex-col gap-2'>
        <span>{t.running}</span>
        <Skeleton className='h-24 w-full' />
      </div>
    )
  if (state !== 'complete')
    return (
      <Alert>
        <AlertDescription>
          {state === 'cancelled' ? t.cancelled : t.error}
        </AlertDescription>
      </Alert>
    )
  const parsed = parseDataView(result)
  if (parsed.status === 'validation-error')
    return (
      <Alert variant='destructive'>
        <AlertDescription>{t.invalid}</AlertDescription>
      </Alert>
    )
  const { data } = parsed
  const table = (
    <Table>
      <TableCaption>{data.summary}</TableCaption>
      <TableHeader>
        <TableRow>
          {data.columns.map((column) => (
            <TableHead key={column.key} scope='col'>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row, index) => (
          <TableRow key={index}>
            {data.columns.map((column) => (
              <TableCell
                key={column.key}
                className='max-w-80 wrap-break-word whitespace-normal'
              >
                {typeof row[column.key] === 'number'
                  ? `${(row[column.key] as number).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 2 })}${column.format === 'percent' ? '%' : ''}`
                  : (row[column.key] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
  return (
    <Card
      className='w-full min-w-0 gap-4'
      data-assistant-result={parsed.status}
    >
      <CardHeader>
        <CardTitle>{data.source.section}</CardTitle>
        <CardDescription className='wrap-break-word whitespace-normal'>
          {data.source.workspace.toUpperCase()} ·{' '}
          {data.source.month ?? t.current} · {data.source.scope}
        </CardDescription>
      </CardHeader>
      <CardContent className='min-w-0'>
        <p className='mb-3 text-sm wrap-break-word whitespace-pre-wrap'>
          {data.summary}
        </p>
        {parsed.status === 'empty' ? (
          <p role='status'>{t.empty}</p>
        ) : data.presentation.kind === 'table' ? (
          <>
            {parsed.status === 'chart-unavailable' && (
              <p role='status' className='mb-2 text-sm text-muted-foreground'>
                {t.fallback}
              </p>
            )}
            {table}
          </>
        ) : (
          <Tabs defaultValue='chart'>
            <TabsList
              aria-label={`${data.source.section}: ${t.chart} / ${t.table}`}
            >
              <TabsTrigger value='chart'>{t.chart}</TabsTrigger>
              <TabsTrigger value='table'>{t.table}</TabsTrigger>
            </TabsList>
            <TabsContent value='chart'>
              <ResultChart data={data} />
            </TabsContent>
            <TabsContent value='table'>{table}</TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant='link' className='px-0'>
          <a href={data.source.route}>{t.source}</a>
        </Button>
      </CardFooter>
    </Card>
  )
}

// Adapted from @tool-ui/chart's registry source; fixed props consume only validated Data Views.
function ResultChart({ data }: { data: AssistantDataResult }) {
  const p = data.presentation
  if (p.kind === 'table') return null
  const color = (index: number) => `var(--chart-${(index % 5) + 1})`
  const config: ChartConfig = Object.fromEntries(
    (p.kind === 'pie'
      ? data.rows.map((row, index) => ({
          key: `slice${index}`,
          label: String(row[p.categoryKey]),
        }))
      : p.series
    ).map((series, index) => [
      series.key,
      { label: series.label, color: color(index) },
    ])
  )
  if (p.kind === 'pie')
    return (
      <ChartContainer
        config={config}
        className='h-64 w-full'
        aria-label={data.summary}
      >
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={data.rows}
            dataKey={p.valueKey}
            nameKey={p.categoryKey}
            label={({ name, value }) => `${name}: ${value}`}
            isAnimationActive={false}
          >
            {data.rows.map((_, index) => (
              <Cell key={index} fill={color(index)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  const Chart =
    p.chartType === 'line'
      ? LineChart
      : p.chartType === 'area'
        ? AreaChart
        : BarChart
  return (
    <ChartContainer
      config={config}
      className='h-64 w-full'
      aria-label={data.summary}
    >
      <Chart data={data.rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={p.xKey}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {p.series.length > 1 && (
          <ChartLegend content={<ChartLegendContent className='flex-wrap' />} />
        )}
        {p.series.map((series, index) =>
          p.chartType === 'line' ? (
            <Line
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stroke={color(index)}
              strokeWidth={2}
              strokeDasharray={index > 4 ? '6 3' : undefined}
              isAnimationActive={false}
            />
          ) : p.chartType === 'area' ? (
            <Area
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId='total'
              stroke={color(index)}
              fill={color(index)}
              isAnimationActive={false}
            />
          ) : (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId={p.chartType === 'stacked-bar' ? 'total' : undefined}
              fill={color(index)}
              stroke='var(--background)'
              isAnimationActive={false}
            />
          )
        )}
      </Chart>
    </ChartContainer>
  )
}
