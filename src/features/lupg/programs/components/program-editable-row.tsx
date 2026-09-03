import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useUpsertProgramMonth } from '../../hooks/use-lupg-queries'
import { type ProgramReportRow } from '../../types'
import { type EditabilityResult } from '../utils/editability'

interface Props {
  rowLabel: string
  kelompokId: string
  monthKey: string // 'YYYY-MM' — target month for upsert
  programCode: string
  existing: ProgramReportRow | undefined
  editability: EditabilityResult
  layout?: 'row' | 'card'
}

export function ProgramEditableRow({
  rowLabel,
  kelompokId,
  monthKey,
  programCode,
  existing,
  editability,
  layout = 'row',
}: Props) {
  const upsert = useUpsertProgramMonth()
  const [denominator, setDenominator] = useState(
    () => existing?.denominator?.toString() ?? ''
  )
  const [count, setCount] = useState(
    () => existing?.count_this_month?.toString() ?? ''
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  useEffect(() => {
    // Sync local form state to server row when the row identity or revision
    // changes. Intentional "form mirrors server data" pattern.

    setDenominator(existing?.denominator?.toString() ?? '')
    setCount(existing?.count_this_month?.toString() ?? '')
    setNotes(existing?.notes ?? '')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at])

  const saveNumeric = () => {
    if (!editability.editable) return
    const denomVal = parseInt(denominator, 10) || 0
    const countVal = parseInt(count, 10) || 0
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        month: monthKey,
        program_code: programCode,
        denominator: denomVal,
        count_this_month: countVal,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const saveNotes = () => {
    if (!editability.editable) return
    if ((notes ?? '') === (existing?.notes ?? '')) return
    const denomVal = parseInt(denominator, 10) || 0
    const countVal = parseInt(count, 10) || 0
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        month: monthKey,
        program_code: programCode,
        denominator: denomVal,
        count_this_month: countVal,
        notes: notes,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const denomNum = parseInt(denominator, 10) || 0
  const countNum = parseInt(count, 10) || 0
  const pct = denomNum > 0 ? Math.round((countNum / denomNum) * 100) : null

  const disabled = !editability.editable
  const notesLabel =
    programCode === 'SHOLAT_ACR' || programCode === 'GMKM'
      ? 'Keterangan'
      : 'Hasil Temuan'

  const sensusInput = (
    <Input
      type='number'
      min={0}
      value={denominator}
      onChange={(e) => setDenominator(e.target.value)}
      onBlur={saveNumeric}
      disabled={disabled}
      className='w-24'
      inputMode='numeric'
    />
  )

  const countInput = (
    <Input
      type='number'
      min={0}
      value={count}
      onChange={(e) => setCount(e.target.value)}
      onBlur={saveNumeric}
      disabled={disabled}
      className='w-24'
      inputMode='numeric'
    />
  )

  const notesInput = (
    <Textarea
      value={notes ?? ''}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={saveNotes}
      disabled={disabled}
      rows={2}
      placeholder='Tulis temuan / keterangan (opsional)'
      className='min-w-40 resize-y'
    />
  )

  const pctDisplay = pct != null ? `${pct}%` : '-'

  if (layout === 'card') {
    return (
      <div className='flex flex-col gap-2 rounded-md border border-border/70 bg-background p-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
            <span>{rowLabel}</span>
            {disabled && (
              <Lock className='h-3 w-3' aria-label={editability.reason} />
            )}
          </div>
          <div className='text-sm font-semibold tabular-nums'>{pctDisplay}</div>
        </div>
        {disabled && editability.reason && (
          <div className='text-xs text-muted-foreground'>
            {editability.reason}
          </div>
        )}
        <div className='grid grid-cols-2 gap-2 text-sm'>
          <label className='flex flex-col gap-1'>
            <span className='text-xs text-muted-foreground'>Sensus</span>
            {sensusInput}
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-xs text-muted-foreground'>Jumlah</span>
            {countInput}
          </label>
        </div>
        <label className='flex flex-col gap-1'>
          <span className='text-xs text-muted-foreground'>{notesLabel}</span>
          {notesInput}
        </label>
      </div>
    )
  }

  return (
    <TableRow>
      <TableCell className='border-b'>
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
      <TableCell className='border-b text-right'>{sensusInput}</TableCell>
      <TableCell className='border-b text-right'>{countInput}</TableCell>
      <TableCell className='border-b text-right text-muted-foreground tabular-nums'>
        {pctDisplay}
      </TableCell>
      <TableCell className='border-b'>{notesInput}</TableCell>
    </TableRow>
  )
}
