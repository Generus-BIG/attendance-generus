import { useEffect, useState } from 'react'
import { Lock, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TableCell, TableRow } from '@/components/ui/table'
import { useUpsertProgramMonth } from '../../hooks/use-lupg-queries'
import { type ProgramReportRow } from '../../types'
import { type EditabilityResult } from '../utils/editability'
import { parseNikahClusterExtras } from '../types'

interface Props {
  rowLabel: string
  kelompokId: string
  monthKey: string
  programCode: string
  existing: ProgramReportRow | undefined
  editability: EditabilityResult
}

export function ProgramClusterEditableRow({
  rowLabel,
  kelompokId,
  monthKey,
  programCode,
  existing,
  editability,
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
    const e = parseNikahClusterExtras(existing?.extras)
    setDenominator(existing?.denominator?.toString() ?? '')
    setNotReady(e.not_ready.toString())
    setReady(e.ready.toString())
    setMarried(e.married.toString())
    setNotes(existing?.notes ?? '')
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
        <TableCell className='text-right tabular-nums text-muted-foreground'>
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
        <TableCell className='text-right tabular-nums text-muted-foreground'>
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
        <TableCell className='text-right tabular-nums text-muted-foreground'>
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
          <TableCell colSpan={9} className='py-1 text-xs text-amber-600 dark:text-amber-400'>
            <span className='inline-flex items-center gap-1'>
              <TriangleAlert className='h-3 w-3' />
              Total cluster ({clusterTotal}) &gt; Sensus ({denomNum}). Silakan periksa kembali angka.
            </span>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
