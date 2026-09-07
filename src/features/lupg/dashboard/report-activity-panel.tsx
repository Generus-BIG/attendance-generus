import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type MonthlyAuditDashboardRow } from '../types'

const SECTION_LABELS: Record<string, string> = {
  lupg_program_reports: 'Program',
  lupg_metric_reports: 'Metric',
  lupg_sarpras_reports: 'Facilities',
  lupg_shodaqoh: 'Donation',
  lupg_mustin_notes: 'Mustin',
  lupg_character_monitoring_reports: 'Character',
  lupg_character_target_reports: 'Character',
  lupg_activity_photos: 'Activity photos',
  sensus: 'Census',
  report: 'Report',
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Added',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  SUBMIT: 'Confirmed',
  REOPEN: 'Reopened',
}

const timestamp = (value: string | null) =>
  value ? format(parseISO(value), 'd MMM yyyy, HH:mm') : '—'

function statusBadge(report: MonthlyAuditDashboardRow) {
  if (!report.report_id) return <Badge variant='outline'>Not started</Badge>
  return report.status === 'submitted' ? (
    <Badge>Confirmed</Badge>
  ) : (
    <Badge variant='secondary'>Draft</Badge>
  )
}

function AuditGroup({ report }: { report: MonthlyAuditDashboardRow }) {
  const [expanded, setExpanded] = useState(false)
  const historyId = `audit-history-${report.kelompok_id}`
  const history = expanded ? report.history : report.history.slice(0, 10)

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='gap-3 border-b bg-muted/20'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <CardTitle className='text-base text-balance'>
              {report.kelompok_name}
            </CardTitle>
            <CardDescription>
              {report.report_id ? 'Selected-month report' : 'No report yet'}
            </CardDescription>
          </div>
          {statusBadge(report)}
        </div>
        <dl className='grid gap-3 text-sm sm:grid-cols-2'>
          <div className='min-w-0'>
            <dt className='text-xs font-medium text-muted-foreground'>
              Latest editor
            </dt>
            <dd className='mt-0.5 font-medium'>
              {report.last_editor_display_name ?? '—'}
            </dd>
            <dd className='text-xs text-muted-foreground tabular-nums'>
              {timestamp(report.last_edited_at)}
            </dd>
          </div>
          <div className='min-w-0'>
            <dt className='text-xs font-medium text-muted-foreground'>
              Confirmed by
            </dt>
            <dd className='mt-0.5 font-medium'>
              {report.submitted_by_label ?? 'Not confirmed'}
            </dd>
            <dd className='text-xs text-muted-foreground tabular-nums'>
              {timestamp(report.submitted_at)}
            </dd>
          </div>
        </dl>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='px-6 pt-4 text-sm font-medium'>Activity history</div>
        {history.length === 0 ? (
          <p className='px-6 pt-2 pb-5 text-sm text-muted-foreground'>
            No activity recorded.
          </p>
        ) : (
          <div id={historyId} className='overflow-x-auto px-2 pb-2'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className='text-right'>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className='font-medium'>
                      {SECTION_LABELS[entry.source_table] ?? entry.source_table}
                    </TableCell>
                    <TableCell>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </TableCell>
                    <TableCell>
                      {entry.editor_display_name ?? 'Unavailable account'}
                    </TableCell>
                    <TableCell className='text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums'>
                      <time dateTime={entry.edited_at}>
                        {timestamp(entry.edited_at)}
                      </time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {report.history.length > 10 ? (
          <div className='px-6 pb-4'>
            <Button
              type='button'
              variant='outline'
              className='min-h-10 transition-transform active:scale-[0.96]'
              aria-expanded={expanded}
              aria-controls={historyId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show less' : `Show all (${report.history.length})`}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ReportActivityPanel({
  reports,
  isLoading,
  isError,
}: {
  reports: MonthlyAuditDashboardRow[]
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All-group audit history</CardTitle>
          <CardDescription>Loading selected-month activity.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2'>
          <Skeleton className='h-48' />
          <Skeleton className='h-48' />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Alert variant='destructive'>
        <AlertTitle>Audit history could not load</AlertTitle>
        <AlertDescription>Refresh the page and try again.</AlertDescription>
      </Alert>
    )
  }

  return (
    <section className='flex flex-col gap-4'>
      <div>
        <h3 className='text-lg font-semibold text-balance'>
          All-group audit history
        </h3>
        <p className='text-sm text-pretty text-muted-foreground'>
          Report status, confirmation, and activity for the selected month.
        </p>
      </div>
      {reports.length === 0 ? (
        <Alert>
          <AlertTitle>No groups available</AlertTitle>
          <AlertDescription>There are no groups to display.</AlertDescription>
        </Alert>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {reports.map((report) => (
            <AuditGroup key={report.kelompok_id} report={report} />
          ))}
        </div>
      )}
    </section>
  )
}
