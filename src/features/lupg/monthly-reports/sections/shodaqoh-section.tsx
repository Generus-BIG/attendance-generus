import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  useShodaqoh,
  useUpsertShodaqoh,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow } from '../../types'
import { getPrevMonthShodaqoh } from '../../services/shodaqoh-report.service'
import { monthKeyFromDate } from '../../utils/month-utils'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function ShodaqohSection({ report, readOnly }: Props) {
  const { data: existing } = useShodaqoh(report.id)
  const upsert = useUpsertShodaqoh()

  const [nominal, setNominal] = useState<string>('')
  const [jumlahKK, setJumlahKK] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (!existing) {
      // Try prefill from prev month
      if (readOnly) return
      let cancelled = false
      ;(async () => {
        try {
          const prev = await getPrevMonthShodaqoh(
            report.kelompok_id,
            monthKeyFromDate(report.month)
          )
          if (cancelled || !prev) return
          setJumlahKK(prev.jumlah_kk.toString())
          // nominal NOT prefilled — new month, new contribution
        } catch {
          // best effort
        }
      })()
      return () => {
        cancelled = true
      }
    }
    setNominal(existing.nominal?.toString() ?? '')
    setJumlahKK(existing.jumlah_kk?.toString() ?? '')
    setNotes(existing.notes ?? '')
  }, [existing?.id, existing?.updated_at, report.kelompok_id, report.month, readOnly])

  const save = () => {
    const nomVal = parseInt(nominal, 10) || 0
    const kkVal = parseInt(jumlahKK, 10) || 0
    upsert.mutate(
      {
        monthly_report_id: report.id,
        nominal: nomVal,
        jumlah_kk: kkVal,
        notes: notes || null,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const nomNum = parseInt(nominal, 10) || 0
  const kkNum = parseInt(jumlahKK, 10) || 0
  const rataPerKk = kkNum > 0 ? Math.round(nomNum / kkNum) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shodaqoh PPG</CardTitle>
        <CardDescription>
          Total nominal shodaqoh bulan ini dan jumlah KK penyumbang.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 sm:grid-cols-3'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='shodaqoh-nominal'>Nominal (Rp)</Label>
          <Input
            id='shodaqoh-nominal'
            type='number'
            min={0}
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            onBlur={save}
            disabled={readOnly}
            inputMode='numeric'
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='shodaqoh-kk'>Jumlah KK</Label>
          <Input
            id='shodaqoh-kk'
            type='number'
            min={0}
            value={jumlahKK}
            onChange={(e) => setJumlahKK(e.target.value)}
            onBlur={save}
            disabled={readOnly}
            inputMode='numeric'
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label>Rata-rata per KK</Label>
          <div className='rounded-md border bg-muted px-3 py-2 text-sm tabular-nums'>
            Rp {rataPerKk.toLocaleString('id-ID')}
          </div>
        </div>
        <div className='sm:col-span-3'>
          <Label htmlFor='shodaqoh-notes'>Catatan</Label>
          <Textarea
            id='shodaqoh-notes'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={save}
            disabled={readOnly}
            placeholder='Catatan (opsional)'
            className='mt-1'
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  )
}
