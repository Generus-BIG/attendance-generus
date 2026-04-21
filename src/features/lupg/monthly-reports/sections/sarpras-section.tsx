import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  useActiveSarprasItems,
  useSarprasReports,
  useUpsertSarprasReport,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow } from '../../types'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function SarprasSection({ report, readOnly }: Props) {
  const { data: items = [] } = useActiveSarprasItems()
  const { data: reports = [] } = useSarprasReports(report.id)

  const fulfilledCount = reports.filter((r) => r.is_fulfilled).length
  const activeCount = items.length
  const pct =
    activeCount > 0 ? Math.round((fulfilledCount / activeCount) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>Sarpras</CardTitle>
            <CardDescription>
              Checklist kelengkapan sarana dan prasarana.
            </CardDescription>
          </div>
          <div className='text-right'>
            <div className='text-2xl font-bold tabular-nums'>{pct}%</div>
            <div className='text-xs text-muted-foreground'>
              {fulfilledCount}/{activeCount} item
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='grid gap-2 sm:grid-cols-2'>
        {items.map((item) => {
          const existing = reports.find((r) => r.item_id === item.id)
          return (
            <SarprasRow
              key={item.id}
              report={report}
              item={item}
              existing={existing}
              readOnly={readOnly}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}

interface RowProps {
  report: MonthlyReportRow
  item: { id: string; name: string }
  existing: { is_fulfilled: boolean; notes: string | null } | undefined
  readOnly: boolean
}

function SarprasRow({ report, item, existing, readOnly }: RowProps) {
  const upsert = useUpsertSarprasReport()
  const [isFulfilled, setIsFulfilled] = useState(
    existing?.is_fulfilled ?? false
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const save = (newValue?: boolean) => {
    const fulfilled = newValue ?? isFulfilled
    upsert.mutate(
      {
        monthly_report_id: report.id,
        item_id: item.id,
        is_fulfilled: fulfilled,
        notes: notes || null,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const handleCheckedChange = (checked: boolean) => {
    setIsFulfilled(checked)
    save(checked)
  }

  return (
    <div className='flex items-start gap-2 rounded-md border p-2'>
      <Checkbox
        checked={isFulfilled}
        onCheckedChange={handleCheckedChange}
        disabled={readOnly}
        className='mt-1'
      />
      <div className='flex-1'>
        <div className='text-sm font-medium'>{item.name}</div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save()}
          disabled={readOnly}
          placeholder='Catatan (opsional)'
          className='mt-1 h-8 text-xs'
        />
      </div>
    </div>
  )
}
