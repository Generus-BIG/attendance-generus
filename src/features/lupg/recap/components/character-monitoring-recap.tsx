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



const PRIORITY_STATUSES = ['needs_discussion', 'needs_guidance'] as const

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
      if (status !== PRIORITY_STATUSES[0] && status !== PRIORITY_STATUSES[1]) {
        continue
      }

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
          status: CharacterMonitoringStatus
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
    const observedCells = new Set(
      activeRows.map((row) => `${row.monthly_report_id}_${row.activity_id}`)
    )

    let missing = 0
    for (const report of reports) {
      for (const activity of sortedActivities) {
        if (!observedCells.has(`${report.id}_${activity.id}`)) missing += 1
      }
    }

    const unopened = Math.max(
      0,
      (kelompokList.length - reports.length) * sortedActivities.length
    )
    counts.not_observed += missing + unopened
    return counts
  }, [kelompokList.length, reports, rows, sortedActivities])

  const totalCells = CHARACTER_STATUS_CODES.reduce(
    (sum, status) => sum + statusCounts[status],
    0
  )

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Monitoring Target 29 Karakter</CardTitle>
        <CardDescription>
          Agenda musyawarah, matriks penerapan, dan jumlah status per kelompok.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <section className='grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]'>
          <div className='rounded-md border border-border/70'>
            <div className='border-b border-border/70 px-4 py-3'>
              <h3 className='text-sm font-semibold tracking-tight'>
                Agenda Musyawarah
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
                Total {totalCells} pantauan.
              </p>
            </div>
            <div className='divide-y divide-border/70'>
              {CHARACTER_STATUS_CODES.map((status) => {
                const count = statusCounts[status]
                const max = Math.max(
                  ...CHARACTER_STATUS_CODES.map((code) => statusCounts[code]),
                  1
                )
                return (
                  <div
                    key={status}
                    className='grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/30 group'
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
                              : status === 'in_progress'
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                : status === 'needs_discussion'
                                  ? 'bg-gradient-to-r from-rose-400 to-rose-600'
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
                    <div className='text-right text-xl font-semibold tabular-nums text-foreground/80 group-hover:text-foreground transition-colors duration-150'>
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className='rounded-md border border-border/70 overflow-hidden shadow-sm'>
          <div className='border-b border-border/70 px-4 py-3 bg-muted/20'>
            <h3 className='text-sm font-semibold tracking-tight'>
              Matriks Status per Kelompok
            </h3>
          </div>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/5 hover:bg-transparent'>
                  <TableHead className='min-w-[14rem] px-4 py-3'>Aktivitas</TableHead>
                  {kelompokList.map((k) => (
                    <TableHead key={k.id} className='text-center whitespace-nowrap min-w-[7rem] px-4 py-3'>
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
                      className='text-center text-sm text-muted-foreground py-8'
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
                        <TableRow className='bg-muted/15 hover:bg-muted/15 border-y border-border/60'>
                          <TableCell
                            colSpan={kelompokList.length + 1}
                            className='font-bold text-[10px] uppercase tracking-wider text-muted-foreground px-4 py-2'
                          >
                            Jenjang {level}
                          </TableCell>
                        </TableRow>
                        {levelRows.map(({ activity, cells }) => (
                          <TableRow key={activity.id} className='hover:bg-muted/5'>
                            <TableCell className='max-w-[20rem] px-4 py-3 whitespace-normal wrap-break-word'>
                              <div className='flex flex-col gap-0.5'>
                                <span className='font-mono text-[9px] tracking-wider text-muted-foreground uppercase'>
                                  {activity.activity_code}
                                </span>
                                <span className='text-xs font-semibold leading-tight text-foreground'>
                                  {activity.activity_label}
                                </span>
                              </div>
                            </TableCell>
                            {cells.map((cell) => {
                              const meta = CHARACTER_STATUS_META[cell.status]
                              const shortLabelMap: Record<string, string> = {
                                needs_discussion: 'Musyawarah',
                                needs_guidance: 'Pembinaan',
                                not_observed: 'Belum',
                                in_progress: 'Mulai',
                                established: 'Terbiasa',
                              }
                              const shortLabel = shortLabelMap[cell.status] ?? meta.label

                              return (
                                <TableCell
                                  key={cell.kelompokId}
                                  className='text-center px-2 py-3'
                                  title={
                                    cell.notes
                                      ? `${meta.label}\nCatatan: ${cell.notes}`
                                      : meta.label
                                  }
                                >
                                  <div className='inline-flex items-center justify-center gap-1'>
                                    <span
                                      className={cn(
                                        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold border leading-tight shadow-sm transition-transform duration-100 hover:scale-105',
                                        meta.className
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
