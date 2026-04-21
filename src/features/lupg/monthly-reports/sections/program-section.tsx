import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  useActivePrograms,
  useProgramReports,
  useUpsertProgramReport,
} from '../../hooks/use-lupg-queries'
import {
  type MonthlyReportRow,
  type ProgramReportRow,
} from '../../types'
import { getPrevMonthProgramValues } from '../../services/program-report.service'
import { monthKeyFromDate } from '../../utils/month-utils'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function ProgramSection({ report, readOnly }: Props) {
  const { data: programs = [] } = useActivePrograms()
  const { data: reports = [] } = useProgramReports(report.id)
  const upsert = useUpsertProgramReport()

  // Prefill prev-month counts on mount if row has null count_prev_month.
  useEffect(() => {
    if (readOnly) return
    if (programs.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        const prev = await getPrevMonthProgramValues(
          report.kelompok_id,
          monthKeyFromDate(report.month)
        )
        if (cancelled) return
        for (const p of programs) {
          const existing = reports.find((r) => r.program_code === p.code)
          if (existing && existing.count_prev_month == null && prev[p.code]) {
            upsert.mutate({
              monthly_report_id: report.id,
              program_code: p.code,
              denominator: existing.denominator,
              count_this_month: existing.count_this_month,
              count_prev_month: prev[p.code].count,
              notes: existing.notes,
            })
          }
        }
      } catch {
        // prefill is best-effort
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs.length, reports.length, report.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Tracker</CardTitle>
        <CardDescription>
          Isi progress setiap program bulan ini. Bulan lalu di-prefill
          otomatis dari submission sebelumnya.
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Denominator</TableHead>
              <TableHead>Bulan Lalu</TableHead>
              <TableHead>Bulan Ini</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => {
              const existing = reports.find((r) => r.program_code === p.code)
              return (
                <ProgramRow
                  key={p.code}
                  report={report}
                  program={p}
                  existing={existing}
                  readOnly={readOnly}
                />
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface RowProps {
  report: MonthlyReportRow
  program: { code: string; name: string; denominator_label: string; count_label: string }
  existing: ProgramReportRow | undefined
  readOnly: boolean
}

function ProgramRow({ report, program, existing, readOnly }: RowProps) {
  const upsert = useUpsertProgramReport()
  const [denominator, setDenominator] = useState(
    existing?.denominator?.toString() ?? '0'
  )
  const [countNow, setCountNow] = useState(
    existing?.count_this_month?.toString() ?? '0'
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  // Sync with fresh data when existing changes (e.g., after prefill)
  useEffect(() => {
    setDenominator(existing?.denominator?.toString() ?? '0')
    setCountNow(existing?.count_this_month?.toString() ?? '0')
    setNotes(existing?.notes ?? '')
  }, [existing?.id, existing?.updated_at])

  const save = (override?: {
    denominator?: number
    countNow?: number
    notes?: string
  }) => {
    const denomVal = override?.denominator ?? (parseInt(denominator, 10) || 0)
    const countVal = override?.countNow ?? (parseInt(countNow, 10) || 0)
    const notesVal = override?.notes ?? notes
    upsert.mutate(
      {
        monthly_report_id: report.id,
        program_code: program.code,
        denominator: denomVal,
        count_this_month: countVal,
        count_prev_month: existing?.count_prev_month ?? null,
        notes: notesVal || null,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  return (
    <TableRow>
      <TableCell className='align-top'>
        <div className='font-medium'>{program.name}</div>
        <div className='text-xs text-muted-foreground'>
          {program.denominator_label} → {program.count_label}
        </div>
      </TableCell>
      <TableCell className='align-top'>
        <Input
          type='number'
          min={0}
          value={denominator}
          onChange={(e) => setDenominator(e.target.value)}
          onBlur={() => save()}
          disabled={readOnly}
          className='w-24'
          inputMode='numeric'
        />
      </TableCell>
      <TableCell className='align-top tabular-nums text-muted-foreground'>
        {existing?.count_prev_month ?? '-'}
      </TableCell>
      <TableCell className='align-top'>
        <Input
          type='number'
          min={0}
          value={countNow}
          onChange={(e) => setCountNow(e.target.value)}
          onBlur={() => save()}
          disabled={readOnly}
          className='w-24'
          inputMode='numeric'
        />
      </TableCell>
      <TableCell className='align-top'>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save()}
          disabled={readOnly}
          className='min-w-48'
          placeholder='Catatan singkat…'
        />
      </TableCell>
    </TableRow>
  )
}
