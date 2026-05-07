import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Role } from '@/lib/rbac'
import { useAuthStore } from '@/stores/auth-store'
import {
  type MetricReportRow,
  type MonthlyReportRow,
} from '../../types'
import {
  useYearlyMatrixData,
  useUpsertMetricMonth,
} from '../../hooks/use-lupg-queries'
import { currentMonthKey } from '../../utils/month-utils'
import {
  allMonthKeysForYear,
  isMonthEditable,
  monthNameFromKey,
} from '../../programs/utils/editability'
import { SectionHeading } from '../components/section-heading'

const CATEGORIES = [
  { code: 'ACR', label: 'ACR' },
  { code: 'APR', label: 'APR' },
  { code: 'AR', label: 'AR' },
  { code: 'GPN_A', label: 'GPN A' },
  { code: 'GPN_B', label: 'GPN B' },
] as const

const attendanceMetricCode = (cat: string) => `ATT_PCT_${cat}`
const piketMetricCode = (cat: string) => `ATT_PCT_PIKET_${cat}`

type MatrixView = 'kehadiran' | 'piket'

interface Props {
  report: MonthlyReportRow
  readOnly?: boolean
}

export function AttendanceMatrixSection({ report, readOnly = false }: Props) {
  const role = useAuthStore((s) => s.auth.role)
  const kelompok = useAuthStore((s) => s.auth.kelompok)
  const typedRole = role as Role
  const isTeamManager = typedRole === 'team_manager'
  const [view, setView] = useState<MatrixView>('kehadiran')

  const year = parseInt(report.month.slice(0, 4), 10)
  const kelompokId = report.kelompok_id
  const monthKeys = useMemo(() => allMonthKeysForYear(year), [year])
  const current = currentMonthKey()

  const { data, isLoading } = useYearlyMatrixData(kelompokId, year)

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data: lv, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return lv as { id: string; value: string }[]
    },
  })

  const userOwnsKelompok = useMemo(() => {
    if (!isTeamManager) return true
    return kelompokOptions.some(
      (o) => o.id === kelompokId && o.value === kelompok
    )
  }, [isTeamManager, kelompok, kelompokOptions, kelompokId])

  const reportByMonthKey = useMemo(() => {
    const m = new Map<string, MonthlyReportRow>()
    for (const r of data?.monthlyReports ?? []) {
      m.set(r.month.slice(0, 7), r)
    }
    return m
  }, [data])

  const metricByKey = useMemo(() => {
    const m = new Map<string, MetricReportRow>()
    for (const r of data?.metricReports ?? []) {
      m.set(`${r.monthly_report_id}__${r.metric_code}`, r)
    }
    return m
  }, [data])

  return (
    <section id='section-attendance' className='scroll-mt-24 flex flex-col gap-4'>
      <SectionHeading
        kicker='Kehadiran'
        title='Attendance Matrix'
        description='Kehadiran dan Piket LUPG per bulan. Toggle view di atas tabel.'
        action={
          <div className='flex gap-2'>
            <Button
              variant={view === 'kehadiran' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setView('kehadiran')}
            >
              Kehadiran
            </Button>
            <Button
              variant={view === 'piket' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setView('piket')}
            >
              Piket LUPG
            </Button>
          </div>
        }
      />
      <div>
        {isLoading ? (
          <div className='text-muted-foreground py-8 text-center'>
            Memuat...
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[960px] table-fixed text-sm'>
              <colgroup>
                <col className='w-28' />
                {monthKeys.map((mk) => (
                  <col key={mk} />
                ))}
              </colgroup>
              <thead>
                <tr className='border-b'>
                  <th className='bg-background sticky left-0 z-10 px-2 py-2 text-left font-medium'>
                    Kategori
                  </th>
                  {monthKeys.map((mk) => (
                    <th
                      key={mk}
                      className='text-muted-foreground px-1 py-2 text-center text-xs font-medium'
                    >
                      {monthNameFromKey(mk).slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => (
                  <MatrixRow
                    key={cat.code}
                    category={cat}
                    monthKeys={monthKeys}
                    currentMonthKeyValue={current}
                    kelompokId={kelompokId}
                    reportByMonthKey={reportByMonthKey}
                    metricByKey={metricByKey}
                    userRole={typedRole}
                    userOwnsKelompok={userOwnsKelompok}
                    readOnly={readOnly}
                    view={view}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

interface MatrixRowProps {
  category: (typeof CATEGORIES)[number]
  monthKeys: string[]
  currentMonthKeyValue: string
  kelompokId: string
  reportByMonthKey: Map<string, MonthlyReportRow>
  metricByKey: Map<string, MetricReportRow>
  userRole: Role
  userOwnsKelompok: boolean
  readOnly: boolean
  view: MatrixView
}

function MatrixRow({
  category,
  monthKeys,
  currentMonthKeyValue,
  kelompokId,
  reportByMonthKey,
  metricByKey,
  userRole,
  userOwnsKelompok,
  readOnly,
  view,
}: MatrixRowProps) {
  return (
    <tr className='border-b'>
      <td className='bg-background sticky left-0 z-10 px-2 py-1.5 font-medium'>
        {category.label}
      </td>
      {monthKeys.map((mk) => {
        const report = reportByMonthKey.get(mk)
        const metricCode =
          view === 'kehadiran'
            ? attendanceMetricCode(category.code)
            : piketMetricCode(category.code)
        const row = report
          ? metricByKey.get(`${report.id}__${metricCode}`)
          : undefined
        const editability = isMonthEditable(
          mk,
          currentMonthKeyValue,
          report,
          userRole,
          userOwnsKelompok
        )
        const disabled = readOnly || !editability.editable
        return (
          <td key={mk} className='px-1 py-1.5 align-middle'>
            <MatrixCell
              kelompokId={kelompokId}
              monthKey={mk}
              metricCode={metricCode}
              existing={row}
              disabled={disabled}
              reason={editability.reason}
              showLock={disabled && !!editability.reason}
            />
          </td>
        )
      })}
    </tr>
  )
}

interface MatrixCellProps {
  kelompokId: string
  monthKey: string
  metricCode: string
  existing: MetricReportRow | undefined
  disabled: boolean
  reason: string | undefined
  showLock: boolean
}

function MatrixCell({
  kelompokId,
  monthKey,
  metricCode,
  existing,
  disabled,
  reason,
  showLock,
}: MatrixCellProps) {
  const upsert = useUpsertMetricMonth()
  const [val, setVal] = useState(existing?.current_value?.toString() ?? '')

  useEffect(() => {
    setVal(existing?.current_value?.toString() ?? '')
  }, [existing?.id, existing?.updated_at])

  const save = () => {
    if (disabled) return
    const num = parseFloat(val)
    if (isNaN(num)) return
    upsert.mutate(
      {
        kelompok_id: kelompokId,
        month: monthKey,
        metric_code: metricCode,
        current_value: num,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  if (disabled) {
    return (
      <div
        className='text-muted-foreground flex h-7 items-center justify-center gap-1 text-xs tabular-nums'
        title={reason}
      >
        <span>{val ? `${val}%` : '-'}</span>
        {showLock && <Lock className='h-3 w-3' aria-label={reason} />}
      </div>
    )
  }

  return (
    <Input
      type='number'
      min={0}
      max={100}
      step='0.1'
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      className='mx-auto block h-7 w-full max-w-18 text-center text-xs tabular-nums'
      inputMode='decimal'
    />
  )
}
