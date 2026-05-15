import { useEffect, useState } from 'react'
import { CheckSquare, Loader2, Square } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  LUPG_QUERY_KEYS,
  useActiveSarprasItems,
  useSarprasReports,
  useUpsertSarprasReport,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow, type SarprasReportRow } from '../../types'
import { SectionHeading } from '../components/section-heading'

async function batchUpsertSarpras(
  monthlyReportId: string,
  items: { id: string }[],
  isFulfilled: boolean
): Promise<void> {
  if (items.length === 0) return
  const rows = items.map((item) => ({
    monthly_report_id: monthlyReportId,
    item_id: item.id,
    is_fulfilled: isFulfilled,
  }))
  const { error } = await supabase
    .from('lupg_sarpras_reports')
    .upsert(rows, { onConflict: 'monthly_report_id,item_id' })
  if (error) throw error
}

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function SarprasSection({ report, readOnly }: Props) {
  const { data: items = [] } = useActiveSarprasItems()
  const { data: reports = [] } = useSarprasReports(report.id)
  const qc = useQueryClient()
  const [bulkPending, setBulkPending] = useState<'check' | 'uncheck' | null>(
    null
  )

  const fulfilledCount = reports.filter((r) => r.is_fulfilled).length
  const activeCount = items.length
  const pct =
    activeCount > 0 ? Math.round((fulfilledCount / activeCount) * 100) : 0

  const handleBulk = async (mode: 'check' | 'uncheck') => {
    setBulkPending(mode)
    try {
      await batchUpsertSarpras(report.id, items, mode === 'check')
      qc.invalidateQueries({
        queryKey: LUPG_QUERY_KEYS.sarprasReports(report.id),
      })
      toast.success(
        mode === 'check'
          ? `${items.length} item dicentang`
          : `${items.length} item di-uncheck`
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal batch update')
    } finally {
      setBulkPending(null)
    }
  }

  const bulkDisabled = readOnly || bulkPending !== null

  return (
    <section
      id='section-sarpras'
      className='bg-card text-card-foreground scroll-mt-24 flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Sarpras'
        description='Checklist kelengkapan sarana dan prasarana.'
        action={
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleBulk('check')}
                disabled={bulkDisabled}
              >
                {bulkPending === 'check' ? (
                  <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                ) : (
                  <CheckSquare className='mr-1 h-4 w-4' />
                )}
                Check All
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleBulk('uncheck')}
                disabled={bulkDisabled}
              >
                {bulkPending === 'uncheck' ? (
                  <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                ) : (
                  <Square className='mr-1 h-4 w-4' />
                )}
                Uncheck All
              </Button>
            </div>
            <div className='text-right'>
              <div className='text-2xl font-bold tabular-nums'>{pct}%</div>
              <div className='text-xs text-muted-foreground'>
                {fulfilledCount}/{activeCount} item
              </div>
            </div>
          </div>
        }
      />
      <div className='grid gap-2 sm:grid-cols-2'>
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
      </div>
    </section>
  )
}

interface RowProps {
  report: MonthlyReportRow
  item: { id: string; name: string }
  existing: SarprasReportRow | undefined
  readOnly: boolean
}

function SarprasRow({ report, item, existing, readOnly }: RowProps) {
  const upsert = useUpsertSarprasReport()
  const [isFulfilled, setIsFulfilled] = useState(
    existing?.is_fulfilled ?? false
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  useEffect(() => {
    setIsFulfilled(existing?.is_fulfilled ?? false)
  }, [existing?.id, existing?.updated_at, existing?.is_fulfilled])

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
