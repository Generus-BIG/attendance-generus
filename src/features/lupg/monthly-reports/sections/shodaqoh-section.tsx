import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  useUpsertShodaqohMonth,
  useYearlyShodaqohData,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow, type ShodaqohRow } from '../../types'
import { currentMonthKey, monthKeyFromDate } from '../../utils/month-utils'
import { allMonthKeysForYear, monthNameFromKey } from '../../programs/utils/editability'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

interface ShodaqohMonthRowProps {
  monthKey: string
  kelompokId: string
  existing: ShodaqohRow | undefined
  readOnly: boolean
  layout?: 'row' | 'card'
}

function formatNominal(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits ? parseInt(digits, 10).toLocaleString('id-ID') : ''
}

function ShodaqohMonthRow({
  monthKey,
  kelompokId,
  existing,
  readOnly,
  layout = 'row',
}: ShodaqohMonthRowProps) {
  const upsert = useUpsertShodaqohMonth()
  const [nominal, setNominal] = useState(() => existing?.nominal?.toString() ?? '')
  const [jumlahKk, setJumlahKk] = useState(() => existing?.jumlah_kk?.toString() ?? '')
  const [notes, setNotes] = useState(() => existing?.notes ?? '')

  const nominalValue = parseInt(nominal.replace(/\D/g, ''), 10) || 0
  const jumlahKkValue = parseInt(jumlahKk, 10) || 0
  const average = jumlahKkValue > 0 ? Math.round(nominalValue / jumlahKkValue) : 0

  const save = () => {
    if (readOnly) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        month: monthKey,
        nominal: nominalValue,
        jumlah_kk: jumlahKkValue,
        notes: notes || null,
      },
      {
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const nominalInput = (
    <Input
      type='text'
      value={formatNominal(nominal)}
      onChange={(event) => setNominal(event.target.value.replace(/\D/g, ''))}
      onBlur={save}
      disabled={readOnly}
      inputMode='numeric'
      placeholder='0'
    />
  )
  const jumlahKkInput = (
    <Input
      type='number'
      min={0}
      value={jumlahKk}
      onChange={(event) => setJumlahKk(event.target.value)}
      onBlur={save}
      disabled={readOnly}
      inputMode='numeric'
      placeholder='0'
    />
  )
  const notesInput = (
    <Textarea
      value={notes}
      onChange={(event) => setNotes(event.target.value)}
      onBlur={save}
      disabled={readOnly}
      placeholder='Catatan (opsional)'
      rows={2}
    />
  )
  const averageDisplay = `Rp ${average.toLocaleString('id-ID')}`

  if (layout === 'card') {
    return (
      <div className='flex flex-col gap-3 rounded-md border border-border/70 bg-background p-3'>
        <div className='flex items-center justify-between text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase'>
          <span>{monthNameFromKey(monthKey)}</span>
          {readOnly && <Lock className='h-3 w-3' aria-label='Laporan terkunci' />}
        </div>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='text-xs text-muted-foreground'>Nominal (Rp)</span>
          {nominalInput}
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='text-xs text-muted-foreground'>Jumlah KK</span>
          {jumlahKkInput}
        </label>
        <div className='flex flex-col gap-1 text-sm'>
          <span className='text-xs text-muted-foreground'>Rata-rata / KK</span>
          <div className='rounded-md border bg-muted px-3 py-2 tabular-nums'>
            {averageDisplay}
          </div>
        </div>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='text-xs text-muted-foreground'>Catatan</span>
          {notesInput}
        </label>
      </div>
    )
  }

  return (
    <TableRow>
      <TableCell className='font-medium'>{monthNameFromKey(monthKey)}</TableCell>
      <TableCell>{nominalInput}</TableCell>
      <TableCell>{jumlahKkInput}</TableCell>
      <TableCell className='text-right tabular-nums'>{averageDisplay}</TableCell>
      <TableCell>{notesInput}</TableCell>
    </TableRow>
  )
}

export function ShodaqohSection({ report, readOnly }: Props) {
  const year = parseInt(report.month.slice(0, 4), 10)
  const { data } = useYearlyShodaqohData(report.kelompok_id, year)
  const maxMonthKey =
    year < parseInt(currentMonthKey().slice(0, 4), 10)
      ? `${year}-12`
      : currentMonthKey()
  const monthKeys = useMemo(
    () => allMonthKeysForYear(year).filter((monthKey) => monthKey <= maxMonthKey),
    [maxMonthKey, year]
  )
  const rowsByMonth = useMemo(() => {
    const reportsByMonth = new Map(
      (data?.monthlyReports ?? []).map((monthlyReport) => [
        monthKeyFromDate(monthlyReport.month),
        monthlyReport.id,
      ])
    )
    const shodaqohByReport = new Map(
      (data?.shodaqohRows ?? []).map((shodaqoh) => [
        shodaqoh.monthly_report_id,
        shodaqoh,
      ])
    )
    return new Map(
      monthKeys.map((monthKey) => [
        monthKey,
        shodaqohByReport.get(reportsByMonth.get(monthKey) ?? ''),
      ])
    )
  }, [data?.monthlyReports, data?.shodaqohRows, monthKeys])

  return (
    <section
      id='section-shodaqoh'
      className='flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Shodaqoh PPG'
        description='Rincian nominal dan KK penyumbang dari Januari hingga bulan berjalan.'
      />
      <div className='flex flex-col gap-2 md:hidden'>
        {monthKeys.map((monthKey) => (
          <ShodaqohMonthRow
            key={`card-${monthKey}-${rowsByMonth.get(monthKey)?.updated_at ?? 'new'}`}
            monthKey={monthKey}
            kelompokId={report.kelompok_id}
            existing={rowsByMonth.get(monthKey)}
            readOnly={readOnly}
            layout='card'
          />
        ))}
      </div>
      <div className='hidden overflow-x-auto md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bulan</TableHead>
              <TableHead>Nominal (Rp)</TableHead>
              <TableHead>Jumlah KK</TableHead>
              <TableHead className='text-right'>Rata-rata / KK</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthKeys.map((monthKey) => (
              <ShodaqohMonthRow
                key={`${monthKey}-${rowsByMonth.get(monthKey)?.updated_at ?? 'new'}`}
                monthKey={monthKey}
                kelompokId={report.kelompok_id}
                existing={rowsByMonth.get(monthKey)}
                readOnly={readOnly}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
