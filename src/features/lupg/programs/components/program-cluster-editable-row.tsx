import { useEffect, useState } from 'react'
import { Lock, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useUpsertProgramMonth } from '../../hooks/use-lupg-queries'
import { type ProgramReportRow } from '../../types'
import { parseNikahClusterExtras } from '../types'
import { type EditabilityResult } from '../utils/editability'

interface Props {
  rowLabel: string
  kelompokId: string
  monthKey: string
  programCode: string
  existing: ProgramReportRow | undefined
  editability: EditabilityResult
  layout?: 'row' | 'card'
}

export function ProgramClusterEditableRow({
  rowLabel,
  kelompokId,
  monthKey,
  programCode,
  existing,
  editability,
  layout = 'row',
}: Props) {
  const upsert = useUpsertProgramMonth()
  const initExtras = parseNikahClusterExtras(existing?.extras)
  const [denominator, setDenominator] = useState(
    existing?.denominator?.toString() ?? ''
  )
  const [notReady, setNotReady] = useState(initExtras.not_ready.toString())
  const [ready, setReady] = useState(initExtras.ready.toString())
  const [married, setMarried] = useState(initExtras.married.toString())
  const [notes, setNotes] = useState(existing?.notes ?? '')

  useEffect(() => {
    // Sync local form state to server row when the row identity or revision
    // changes. Intentional "form mirrors server data" pattern.
    const e = parseNikahClusterExtras(existing?.extras)

    setDenominator(existing?.denominator?.toString() ?? '')
    setNotReady(e.not_ready.toString())
    setReady(e.ready.toString())
    setMarried(e.married.toString())
    setNotes(existing?.notes ?? '')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at])

  const denomNum = parseInt(denominator, 10) || 0
  const notReadyNum = parseInt(notReady, 10) || 0
  const readyNum = parseInt(ready, 10) || 0
  const marriedNum = parseInt(married, 10) || 0
  const clusterTotal = notReadyNum + readyNum + marriedNum
  const overflow = clusterTotal > denomNum && denomNum > 0

  const pctOf = (v: number) =>
    denomNum > 0 ? Math.round((v / denomNum) * 100) : null

  const save = (includeNotes: boolean) => {
    if (!editability.editable) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        month: monthKey,
        program_code: programCode,
        denominator: denomNum,
        count_this_month: marriedNum,
        extras: {
          not_ready: notReadyNum,
          ready: readyNum,
          married: marriedNum,
        },
        ...(includeNotes ? { notes } : {}),
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const disabled = !editability.editable

  if (layout === 'card') {
    const clusters = [
      {
        label: 'Belum Siap',
        value: notReady,
        setValue: setNotReady,
        count: notReadyNum,
      },
      { label: 'Siap', value: ready, setValue: setReady, count: readyNum },
      {
        label: 'Menikah',
        value: married,
        setValue: setMarried,
        count: marriedNum,
      },
    ]
    return (
      <div className='flex flex-col gap-3 rounded-md border border-border/70 bg-background p-3'>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <div className='flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase'>
              {rowLabel}
              {disabled ? (
                <Lock className='size-3' aria-label={editability.reason} />
              ) : null}
            </div>
            {disabled && editability.reason ? (
              <p className='mt-1 text-xs text-muted-foreground'>
                {editability.reason}
              </p>
            ) : null}
          </div>
          <span className='text-xs text-muted-foreground tabular-nums'>
            Total {clusterTotal}/{denomNum}
          </span>
        </div>
        <label className='flex flex-col gap-1 text-xs'>
          <span className='text-muted-foreground'>Sensus</span>
          <Input
            type='number'
            min={0}
            value={denominator}
            onChange={(event) => setDenominator(event.target.value)}
            onBlur={() => save(false)}
            disabled={disabled}
            className='min-h-10 w-full'
            inputMode='numeric'
          />
        </label>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
          {clusters.map((cluster) => (
            <label key={cluster.label} className='flex flex-col gap-1 text-xs'>
              <span className='flex justify-between gap-2 text-muted-foreground'>
                {cluster.label}
                <span className='tabular-nums'>
                  {pctOf(cluster.count) != null
                    ? `${pctOf(cluster.count)}%`
                    : '—'}
                </span>
              </span>
              <Input
                type='number'
                min={0}
                value={cluster.value}
                onChange={(event) => cluster.setValue(event.target.value)}
                onBlur={() => save(false)}
                disabled={disabled}
                className='min-h-10 w-full'
                inputMode='numeric'
              />
            </label>
          ))}
        </div>
        <label className='flex flex-col gap-1 text-xs'>
          <span className='text-muted-foreground'>Hasil Temuan</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => save(true)}
            disabled={disabled}
            rows={2}
            placeholder='Tulis hasil temuan (opsional)'
            className='min-h-20 resize-y'
          />
        </label>
        {overflow ? (
          <p className='flex items-start gap-1 text-xs text-amber-600'>
            <TriangleAlert className='mt-0.5 size-3 shrink-0' />
            Total cluster ({clusterTotal}) &gt; Sensus ({denomNum}). Silakan
            periksa kembali.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <TableRow>
        <TableCell className='font-medium'>
          <div className='flex items-center gap-2'>
            {rowLabel}
            {disabled && (
              <Lock
                className='h-3 w-3 text-muted-foreground'
                aria-label={editability.reason}
              />
            )}
          </div>
          {disabled && editability.reason && (
            <div className='text-xs text-muted-foreground'>
              {editability.reason}
            </div>
          )}
        </TableCell>
        <TableCell>
          <Input
            type='number'
            min={0}
            value={denominator}
            onChange={(e) => setDenominator(e.target.value)}
            onBlur={() => save(false)}
            disabled={disabled}
            className='w-20'
            inputMode='numeric'
          />
        </TableCell>
        <TableCell>
          <Input
            type='number'
            min={0}
            value={notReady}
            onChange={(e) => setNotReady(e.target.value)}
            onBlur={() => save(false)}
            disabled={disabled}
            className='w-20'
            inputMode='numeric'
          />
        </TableCell>
        <TableCell className='text-right text-muted-foreground tabular-nums'>
          {pctOf(notReadyNum) != null ? `${pctOf(notReadyNum)}%` : '-'}
        </TableCell>
        <TableCell>
          <Input
            type='number'
            min={0}
            value={ready}
            onChange={(e) => setReady(e.target.value)}
            onBlur={() => save(false)}
            disabled={disabled}
            className='w-20'
            inputMode='numeric'
          />
        </TableCell>
        <TableCell className='text-right text-muted-foreground tabular-nums'>
          {pctOf(readyNum) != null ? `${pctOf(readyNum)}%` : '-'}
        </TableCell>
        <TableCell>
          <Input
            type='number'
            min={0}
            value={married}
            onChange={(e) => setMarried(e.target.value)}
            onBlur={() => save(false)}
            disabled={disabled}
            className='w-20'
            inputMode='numeric'
          />
        </TableCell>
        <TableCell className='text-right text-muted-foreground tabular-nums'>
          {pctOf(marriedNum) != null ? `${pctOf(marriedNum)}%` : '-'}
        </TableCell>
        <TableCell>
          <Textarea
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save(true)}
            disabled={disabled}
            rows={2}
            placeholder='Tulis hasil temuan (opsional)'
            className='min-w-40 resize-y'
          />
        </TableCell>
      </TableRow>
      {overflow && (
        <TableRow>
          <TableCell
            colSpan={9}
            className='py-1 text-xs text-amber-600 dark:text-amber-400'
          >
            <span className='inline-flex items-center gap-1'>
              <TriangleAlert className='h-3 w-3' />
              Total cluster ({clusterTotal}) &gt; Sensus ({denomNum}). Silakan
              periksa kembali angka.
            </span>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
