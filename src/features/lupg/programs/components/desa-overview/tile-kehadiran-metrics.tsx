import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KEHADIRAN_STATUS_THRESHOLDS } from '../../constants'
import {
  type AttendanceCategory,
  type AttendanceSeries,
} from '../../utils/attendance-aggregate'

interface Props {
  generus: AttendanceSeries
  piket: AttendanceSeries
}

function barColor(pct: number | null): string {
  if (pct == null) return 'bg-muted-foreground/20'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.ok) return 'bg-success'
  if (pct >= KEHADIRAN_STATUS_THRESHOLDS.warn) return 'bg-warning'
  return 'bg-destructive'
}

function AttendanceRows({ rows }: { rows: AttendanceCategory[] }) {
  return (
    <ul className='flex flex-col gap-3'>
      {rows.map((row) => {
        const Icon =
          row.trend === 'up'
            ? ArrowUp
            : row.trend === 'down'
              ? ArrowDown
              : row.trend === 'flat'
                ? Minus
                : null
        const trendLabel =
          row.trend === 'up'
            ? 'Naik dibanding bulan lalu'
            : row.trend === 'down'
              ? 'Turun dibanding bulan lalu'
              : row.trend === 'flat'
                ? 'Sama dengan bulan lalu'
                : null

        return (
          <li
            key={row.code}
            className='grid grid-cols-[minmax(0,1fr)_minmax(5rem,8rem)_3.5rem_1rem] items-center gap-3'
          >
            <span className='truncate text-sm'>{row.name}</span>
            <div
              className='h-2 overflow-hidden rounded-full bg-muted'
              role='progressbar'
              aria-label={`${row.name}: ${row.pct == null ? 'tidak ada data' : `${row.pct}%`}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={row.pct ?? undefined}
              aria-valuetext={
                row.pct == null ? 'Tidak ada data' : `${row.pct}%`
              }
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width]',
                  barColor(row.pct)
                )}
                style={{
                  width: `${Math.max(0, Math.min(100, row.pct ?? 0))}%`,
                }}
              />
            </div>
            <span className='text-right font-mono text-sm tabular-nums'>
              {row.pct == null ? '—' : `${row.pct}%`}
            </span>
            {Icon && trendLabel ? (
              <Icon
                className={cn(
                  'size-4',
                  row.trend === 'up'
                    ? 'text-success'
                    : row.trend === 'down'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
                aria-label={trendLabel}
                role='img'
              />
            ) : (
              <span className='sr-only'>Belum ada perbandingan</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function AttendancePanel({
  title,
  series,
}: {
  title: string
  series: AttendanceSeries
}) {
  const delta =
    series.average != null && series.previousAverage != null
      ? series.average - series.previousAverage
      : null

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-3 rounded-lg bg-muted/30 px-4 py-3'>
        <div>
          <div className='text-xs font-medium text-muted-foreground'>
            {title}
          </div>
          {delta != null && (
            <div
              className={cn(
                'mt-1 text-xs tabular-nums',
                delta > 0
                  ? 'text-success'
                  : delta < 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              )}
            >
              {delta > 0 ? '+' : delta < 0 ? '−' : ''}
              {Math.abs(delta)} poin dari bulan lalu
            </div>
          )}
        </div>
        <span className='font-mono text-3xl font-semibold tracking-tight tabular-nums'>
          {series.average == null ? '—' : `${series.average}%`}
        </span>
      </div>
      {series.categories.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          Belum ada data kehadiran.
        </p>
      ) : (
        <AttendanceRows rows={series.categories} />
      )}
    </div>
  )
}

export function TileKehadiranMetrics({ generus, piket }: Props) {
  return (
    <section className='flex h-full flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground sm:p-5'>
      <Tabs defaultValue='kehadiran'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              Kehadiran
            </div>
            <h3 className='mt-1 text-base font-semibold tracking-tight'>
              Persentase Berdasarkan Kategori
            </h3>
            <p className='mt-1 max-w-md text-xs leading-relaxed text-muted-foreground'>
              Rata-rata kehadiran Generus dan jadwal piket untuk bulan terpilih.
            </p>
          </div>
          <TabsList className='h-9'>
            <TabsTrigger value='kehadiran'>Kehadiran</TabsTrigger>
            <TabsTrigger value='piket'>Piket LUPG</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='kehadiran' className='mt-0'>
          <AttendancePanel title='Kehadiran Average Generus' series={generus} />
        </TabsContent>
        <TabsContent value='piket' className='mt-0'>
          <AttendancePanel title='Rata-rata Kehadiran Piket' series={piket} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
