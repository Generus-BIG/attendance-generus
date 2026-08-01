import { Fragment, useMemo } from 'react'
import { MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  type CharacterMonitoringActivityRow,
  type CharacterMonitoringReportRow,
  type MonthlyReportRow,
} from '../../types'
import {
  CHARACTER_LEVELS,
  CHARACTER_STATUS_CODES,
  CHARACTER_STATUS_META,
  type CharacterMonitoringJoinedRow,
  type CharacterMonitoringStatus,
  countCharacterStatuses,
  normalizeCharacterStatus,
  sortCharacterActivities,
  sortCharacterAgendaRows,
  statusBadgeClassName,
} from '../../utils/character-monitoring'

type KelompokLite = { id: string; value: string }

interface Props {
  kelompokList: KelompokLite[]
  reports: MonthlyReportRow[]
  activities: CharacterMonitoringActivityRow[]
  rows: CharacterMonitoringReportRow[]
}
const PRIORITY_STATUS: CharacterMonitoringStatus = 'needs_guidance'

export function CharacterMonitoringRecap({
  kelompokList,
  reports,
  activities,
  rows,
}: Props) {
  const sortedActivities = useMemo(
    () => sortCharacterActivities(activities),
    [activities]
  )

  const reportByKelompok = useMemo(() => {
    const map = new Map<string, MonthlyReportRow>()
    for (const report of reports) map.set(report.kelompok_id, report)
    return map
  }, [reports])

  const rowByReportActivity = useMemo(() => {
    const activeActivityIds = new Set(activities.map((activity) => activity.id))
    const map = new Map<string, CharacterMonitoringReportRow>()
    for (const row of rows) {
      if (!activeActivityIds.has(row.activity_id)) continue
      map.set(`${row.monthly_report_id}_${row.activity_id}`, row)
    }
    return map
  }, [activities, rows])

  const agendaRows = useMemo(() => {
    const activityById = new Map(
      activities.map((activity) => [activity.id, activity])
    )
    const monthlyReportById = new Map(
      reports.map((report) => [report.id, report])
    )
    const kelompokById = new Map(kelompokList.map((k) => [k.id, k.value]))

    const joined: CharacterMonitoringJoinedRow[] = []
    for (const row of rows) {
      const status = normalizeCharacterStatus(row.status)
      if (status !== PRIORITY_STATUS) continue

      const activity = activityById.get(row.activity_id)
      const monthlyReport = monthlyReportById.get(row.monthly_report_id)
      if (!activity || !monthlyReport) continue

      joined.push({
        report: row,
        activity,
        monthlyReport,
        kelompokName:
          kelompokById.get(monthlyReport.kelompok_id) ??
          monthlyReport.kelompok_id,
      })
    }

    return sortCharacterAgendaRows(joined)
  }, [activities, kelompokList, reports, rows])

  const pivotedRows = useMemo(() => {
    return sortedActivities.map((activity) => {
      const kelompokCells = kelompokList.map((kelompok) => {
        const report = reportByKelompok.get(kelompok.id)
        const row = report
          ? rowByReportActivity.get(`${report.id}_${activity.id}`)
          : undefined
        return {
          kelompokId: kelompok.id,
          kelompokName: kelompok.value,
          status: normalizeCharacterStatus(row?.status),
          notes: row?.notes || '',
        }
      })
      return {
        activity,
        cells: kelompokCells,
      }
    })
  }, [sortedActivities, kelompokList, reportByKelompok, rowByReportActivity])

  const pivotedGroupedByLevel = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        activity: CharacterMonitoringActivityRow
        cells: Array<{
          kelompokId: string
          kelompokName: string
          status: CharacterMonitoringStatus | null
          notes: string
        }>
      }>
    >()
    for (const row of pivotedRows) {
      const level = row.activity.level_code
      const list = map.get(level) ?? []
      list.push(row)
      map.set(level, list)
    }
    return map
  }, [pivotedRows])

  const statusCounts = useMemo(() => {
    const activeActivityIds = new Set(
      sortedActivities.map((activity) => activity.id)
    )
    const activeRows = rows.filter((row) =>
      activeActivityIds.has(row.activity_id)
    )
    const counts = countCharacterStatuses(activeRows)
    const assessedCells = new Set(
      activeRows
        .filter((row) => normalizeCharacterStatus(row.status) !== null)
        .map((row) => `${row.monthly_report_id}_${row.activity_id}`)
    )
    const totalPossible = kelompokList.length * sortedActivities.length
    return {
      counts,
      unassessed: Math.max(0, totalPossible - assessedCells.size),
    }
  }, [kelompokList.length, rows, sortedActivities])

  const totalCells = CHARACTER_STATUS_CODES.reduce(
    (sum, status) => sum + statusCounts.counts[status],
    0
  )

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Penerapan 29 Karakter</CardTitle>
        <CardDescription>
          Kebutuhan pembinaan, matriks penerapan, dan jumlah status per
          kelompok.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <section className='grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]'>
          <div className='rounded-md border border-border/70'>
            <div className='border-b border-border/70 px-4 py-3'>
              <h3 className='text-sm font-semibold tracking-tight'>
                Perlu Pembinaan
              </h3>
            </div>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelompok</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendaRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center text-sm text-muted-foreground'
                      >
                        Tidak ada item prioritas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    agendaRows.map((row) => {
                      const status = normalizeCharacterStatus(row.report.status)
                      if (!status) return null
                      return (
                        <TableRow key={row.report.id}>
                          <TableCell className='max-w-[14ch] font-medium wrap-break-word whitespace-normal'>
                            {row.kelompokName}
                          </TableCell>
                          <TableCell className='text-xs font-semibold text-muted-foreground'>
                            {row.activity.level_code}
                          </TableCell>
                          <TableCell className='max-w-[28ch] wrap-break-word whitespace-normal'>
                            {row.activity.activity_label}
                          </TableCell>
                          <TableCell>
                            <span className={statusBadgeClassName(status)}>
                              {CHARACTER_STATUS_META[status].label}
                            </span>
                          </TableCell>
                          <TableCell className='max-w-[34ch] text-sm wrap-break-word whitespace-normal text-muted-foreground'>
                            {row.report.notes || '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className='rounded-md border border-border/70'>
            <div className='border-b border-border/70 px-4 py-3'>
              <h3 className='text-sm font-semibold tracking-tight'>
                Distribusi Status
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                {totalCells} dinilai · {statusCounts.unassessed} belum dinilai.
              </p>
            </div>
            <div className='divide-y divide-border/70'>
              {CHARACTER_STATUS_CODES.map((status) => {
                const count = statusCounts.counts[status]
                const max = Math.max(
                  ...CHARACTER_STATUS_CODES.map(
                    (code) => statusCounts.counts[code]
                  ),
                  1
                )
                return (
                  <div
                    key={status}
                    className='group grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/30'
                  >
                    <div className='min-w-0'>
                      <span className={statusBadgeClassName(status)}>
                        {CHARACTER_STATUS_META[status].label}
                      </span>
                      <div className='mt-2 h-2 overflow-hidden rounded-full bg-muted/70'>
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300 group-hover:brightness-105',
                            status === 'established'
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                              : status === 'consistent'
                                ? 'bg-gradient-to-r from-sky-400 to-sky-600'
                                : status === 'in_progress'
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                  : status === 'needs_guidance'
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                    : 'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/60'
                          )}
                          style={{
                            width: `${Math.round((count / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className='text-right text-xl font-semibold text-foreground/80 tabular-nums transition-colors duration-150 group-hover:text-foreground'>
                      {count}
                    </div>
                  </div>
                )
              })}
              <div className='grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 px-4 py-3'>
                <span className='text-sm font-medium text-muted-foreground'>
                  Belum dinilai
                </span>
                <span className='text-right text-xl font-semibold text-muted-foreground tabular-nums'>
                  {statusCounts.unassessed}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className='overflow-hidden rounded-md border border-border/70 shadow-sm'>
          <div className='border-b border-border/70 bg-muted/20 px-4 py-3'>
            <h3 className='text-sm font-semibold tracking-tight'>
              Matriks Status per Kelompok
            </h3>
          </div>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/5 hover:bg-transparent'>
                  <TableHead className='min-w-[14rem] px-4 py-3'>
                    Aktivitas
                  </TableHead>
                  {kelompokList.map((k) => (
                    <TableHead
                      key={k.id}
                      className='min-w-[7rem] px-4 py-3 text-center whitespace-nowrap'
                    >
                      {k.value}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActivities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={kelompokList.length + 1}
                      className='py-8 text-center text-sm text-muted-foreground'
                    >
                      Belum ada aktivitas monitoring aktif.
                    </TableCell>
                  </TableRow>
                ) : (
                  (CHARACTER_LEVELS as readonly string[]).map((level) => {
                    const levelRows = pivotedGroupedByLevel.get(level) ?? []
                    if (levelRows.length === 0) return null
                    return (
                      <Fragment key={level}>
                        {/* Group Header Row */}
                        <TableRow className='border-y border-border/60 bg-muted/15 hover:bg-muted/15'>
                          <TableCell
                            colSpan={kelompokList.length + 1}
                            className='px-4 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase'
                          >
                            Jenjang {level}
                          </TableCell>
                        </TableRow>
                        {levelRows.map(({ activity, cells }) => (
                          <TableRow
                            key={activity.id}
                            className='hover:bg-muted/5'
                          >
                            <TableCell className='max-w-[20rem] px-4 py-3 wrap-break-word whitespace-normal'>
                              <div className='flex flex-col gap-0.5'>
                                <span className='font-mono text-[9px] tracking-wider text-muted-foreground uppercase'>
                                  {activity.activity_code}
                                </span>
                                <span className='text-xs leading-tight font-semibold text-foreground'>
                                  {activity.activity_label}
                                </span>
                              </div>
                            </TableCell>
                            {cells.map((cell) => {
                              const meta = cell.status
                                ? CHARACTER_STATUS_META[cell.status]
                                : null
                              const shortLabel =
                                meta?.shortLabel ?? 'Belum dinilai'

                              return (
                                <TableCell
                                  key={cell.kelompokId}
                                  className='px-2 py-3 text-center'
                                  title={
                                    cell.notes
                                      ? `${meta?.label ?? 'Belum dinilai'}\nCatatan: ${cell.notes}`
                                      : (meta?.label ?? 'Belum dinilai')
                                  }
                                >
                                  <div className='inline-flex items-center justify-center gap-1'>
                                    <span
                                      className={cn(
                                        'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] leading-tight font-semibold shadow-sm transition-transform duration-100 hover:scale-105',
                                        meta?.className ??
                                          'border-border bg-background text-muted-foreground'
                                      )}
                                    >
                                      {shortLabel}
                                      {cell.notes && (
                                        <MessageSquareText className='ml-1 h-3 w-3 shrink-0 opacity-80' />
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
