import { useMemo } from 'react'
import { Flag } from 'lucide-react'
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
  type CharacterTargetItemRow,
  type CharacterTargetReportRow,
  type MonthlyReportRow,
} from '../../types'

type KelompokLite = { id: string; value: string }

interface Props {
  kelompokList: KelompokLite[]
  reports: MonthlyReportRow[]
  items: CharacterTargetItemRow[]
  rows: CharacterTargetReportRow[]
}

export function CharacterTargetRecap({
  kelompokList,
  reports,
  items,
  rows,
}: Props) {
  const kelompokById = useMemo(
    () =>
      new Map(kelompokList.map((kelompok) => [kelompok.id, kelompok.value])),
    [kelompokList]
  )

  const reportRows = useMemo(() => {
    const rowByReportItem = new Map(
      rows.map((row) => [`${row.monthly_report_id}_${row.target_item_id}`, row])
    )
    return reports.flatMap((report) =>
      items.map((item) => ({
        report,
        item,
        row: rowByReportItem.get(`${report.id}_${item.id}`),
        kelompokName:
          kelompokById.get(report.kelompok_id) ?? report.kelompok_id,
      }))
    )
  }, [items, kelompokById, reports, rows])

  const agendaRows = useMemo(() => {
    return reportRows
      .filter(({ row }) => {
        if (!row) return true
        const realization = row.realization_percent
        return (
          row.discussion_flag ||
          realization === null ||
          realization === undefined ||
          realization < 100 ||
          !!row.material_gap
        )
      })
      .sort((a, b) => {
        const flagA = a.row?.discussion_flag ?? false
        const flagB = b.row?.discussion_flag ?? false
        if (flagA !== flagB) return flagA ? -1 : 1
        if (a.kelompokName !== b.kelompokName) {
          return a.kelompokName.localeCompare(b.kelompokName)
        }
        return a.item.sort_order - b.item.sort_order
      })
  }, [reportRows])

  const summaryRows = useMemo(() => {
    const map = new Map<
      string,
      {
        level: string
        category: string
        total: number
        filled: number
        realizationSum: number
        discussion: number
      }
    >()
    for (const { item, row } of reportRows) {
      const key = `${item.level_code}__${item.category_label}`
      const summary = map.get(key) ?? {
        level: item.level_code,
        category: item.category_label,
        total: 0,
        filled: 0,
        realizationSum: 0,
        discussion: 0,
      }
      summary.total += 1
      if (
        row?.realization_percent !== null &&
        row?.realization_percent !== undefined
      ) {
        summary.filled += 1
        summary.realizationSum += row.realization_percent
      }
      if (row?.discussion_flag) summary.discussion += 1
      map.set(key, summary)
    }
    return [...map.values()].sort((a, b) => {
      if (a.level !== b.level) return a.level.localeCompare(b.level)
      return a.category.localeCompare(b.category)
    })
  }, [reportRows])

  const filledRows = reportRows.filter(
    ({ row }) =>
      row?.realization_percent !== null &&
      row?.realization_percent !== undefined
  )
  const averageRealization =
    filledRows.length > 0
      ? Math.round(
          filledRows.reduce(
            (sum, { row }) => sum + (row?.realization_percent ?? 0),
            0
          ) / filledRows.length
        )
      : null
  const discussionCount = rows.filter((row) => row.discussion_flag).length

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>Target Capaian Materi</CardTitle>
        <CardDescription>
          Rekap realisasi target materi, kekurangan materi, dan flag musyawarah.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        {items.length === 0 ? (
          <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
            Belum ada template materi aktif untuk bulan ini.
          </div>
        ) : (
          <>
            <section className='grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]'>
              <div className='rounded-md border border-border/70'>
                <div className='border-b border-border/70 px-4 py-3'>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Agenda Materi Belum Tuntas
                  </h3>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {discussionCount} item di-flag untuk musyawarah.
                  </p>
                </div>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kelompok</TableHead>
                        <TableHead>Materi</TableHead>
                        <TableHead>Realisasi</TableHead>
                        <TableHead>Kurang Materi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendaRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className='text-center text-sm text-muted-foreground'
                          >
                            Tidak ada materi prioritas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        agendaRows.map(
                          ({ row, item, kelompokName, report }) => (
                            <TableRow key={`${report.id}_${item.id}`}>
                              <TableCell className='max-w-[14ch] font-medium wrap-break-word whitespace-normal'>
                                {kelompokName}
                              </TableCell>
                              <TableCell className='max-w-[32ch] wrap-break-word whitespace-normal'>
                                <div className='flex items-start gap-2'>
                                  {row?.discussion_flag ? (
                                    <Flag className='mt-1 h-3.5 w-3.5 shrink-0 text-rose-600' />
                                  ) : null}
                                  <div>
                                    <p className='font-medium'>
                                      {item.material_label}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                      {item.level_code} · {item.category_label}
                                    </p>
                                    {row?.notes ? (
                                      <p className='mt-1 text-xs text-muted-foreground'>
                                        {row.notes}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className='font-semibold tabular-nums'>
                                {row?.realization_percent !== null &&
                                row?.realization_percent !== undefined ? (
                                  <span
                                    className={
                                      row.realization_percent < 100
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }
                                  >
                                    {row.realization_percent}%
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell className='max-w-[34ch] text-sm wrap-break-word whitespace-normal text-muted-foreground'>
                                {row?.material_gap || '—'}
                              </TableCell>
                            </TableRow>
                          )
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className='rounded-md border border-border/70'>
                <div className='border-b border-border/70 px-4 py-3'>
                  <h3 className='text-sm font-semibold tracking-tight'>
                    Ringkasan Realisasi
                  </h3>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Rata-rata desa:{' '}
                    {averageRealization === null
                      ? '—'
                      : `${averageRealization}%`}
                  </p>
                </div>
                <div className='divide-y divide-border/70'>
                  {summaryRows.map((summary) => {
                    const average =
                      summary.filled > 0
                        ? Math.round(summary.realizationSum / summary.filled)
                        : null
                    return (
                      <div
                        key={`${summary.level}_${summary.category}`}
                        className='group grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/30'
                      >
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-foreground/80 transition-colors duration-150 group-hover:text-foreground'>
                            {summary.category}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {summary.level} · {summary.filled}/{summary.total}{' '}
                            terisi
                            {summary.discussion > 0
                              ? ` · ${summary.discussion} musyawarah`
                              : ''}
                          </p>
                          <div className='mt-2 h-2 overflow-hidden rounded-full bg-muted/70'>
                            <div
                              className='h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300 group-hover:brightness-105'
                              style={{
                                width: `${average ?? 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className='text-right text-xl font-bold text-foreground/80 tabular-nums transition-colors duration-150 group-hover:text-foreground'>
                          {average === null ? '—' : `${average}%`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
