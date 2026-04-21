import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  useActiveMetrics,
  useMetricReports,
  useUpsertMetricReport,
} from '../../hooks/use-lupg-queries'
import {
  type MonthlyReportRow,
  type MetricDefinitionRow,
  type MetricReportRow,
} from '../../types'
import { getPrevMonthMetricValues } from '../../services/metric-report.service'
import { monthKeyFromDate } from '../../utils/month-utils'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function MetricSection({ report, readOnly }: Props) {
  const { data: metrics = [] } = useActiveMetrics()
  const { data: reports = [] } = useMetricReports(report.id)
  const upsert = useUpsertMetricReport()

  // Prefill prev-month values
  useEffect(() => {
    if (readOnly) return
    if (metrics.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        const prev = await getPrevMonthMetricValues(
          report.kelompok_id,
          monthKeyFromDate(report.month)
        )
        if (cancelled) return
        for (const m of metrics) {
          const existing = reports.find((r) => r.metric_code === m.code)
          if (existing && existing.prev_value == null && prev[m.code] != null) {
            upsert.mutate({
              monthly_report_id: report.id,
              metric_code: m.code,
              denominator: existing.denominator,
              current_value: existing.current_value,
              prev_value: prev[m.code],
              notes: existing.notes,
            })
          }
        }
      } catch {
        // best-effort
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.length, reports.length, report.id])

  // Group by category_label
  const grouped = metrics.reduce<Record<string, MetricDefinitionRow[]>>(
    (acc, m) => {
      const key = m.category_label ?? 'Lainnya'
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    },
    {}
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metrics</CardTitle>
        <CardDescription>
          Input metrik terstruktur (mis. % kehadiran per kategori).
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className='flex flex-col gap-2'>
            <div className='text-sm font-semibold text-muted-foreground'>
              {group}
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              {items.map((m) => {
                const existing = reports.find((r) => r.metric_code === m.code)
                return (
                  <MetricRow
                    key={m.code}
                    report={report}
                    metric={m}
                    existing={existing}
                    readOnly={readOnly}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface RowProps {
  report: MonthlyReportRow
  metric: MetricDefinitionRow
  existing: MetricReportRow | undefined
  readOnly: boolean
}

function MetricRow({ report, metric, existing, readOnly }: RowProps) {
  const upsert = useUpsertMetricReport()
  const [currentValue, setCurrentValue] = useState(
    existing?.current_value?.toString() ?? '0'
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  useEffect(() => {
    setCurrentValue(existing?.current_value?.toString() ?? '0')
    setNotes(existing?.notes ?? '')
  }, [existing?.id, existing?.updated_at])

  const save = () => {
    const val = parseFloat(currentValue)
    if (isNaN(val)) return
    upsert.mutate(
      {
        monthly_report_id: report.id,
        metric_code: metric.code,
        denominator: existing?.denominator ?? null,
        current_value: val,
        prev_value: existing?.prev_value ?? null,
        notes: notes || null,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const suffix = metric.value_format === 'percent' ? '%' : ''

  return (
    <div className='rounded-md border p-3'>
      <div className='text-sm font-medium'>{metric.name}</div>
      <div className='mt-2 flex items-center gap-2'>
        <div className='flex items-center gap-1 text-sm text-muted-foreground'>
          Bulan lalu:{' '}
          <span className='tabular-nums'>
            {existing?.prev_value != null
              ? `${existing.prev_value}${suffix}`
              : '-'}
          </span>
        </div>
      </div>
      <div className='mt-2 flex items-center gap-2'>
        <Input
          type='number'
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={save}
          disabled={readOnly}
          className='w-28'
          inputMode='decimal'
        />
        {suffix && <span className='text-sm'>{suffix}</span>}
      </div>
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        disabled={readOnly}
        placeholder='Catatan (opsional)'
        className='mt-2'
      />
    </div>
  )
}
