import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  usePhqMonthlyNote,
  usePhqParticipants,
  useUpsertPhqMonthlyNote,
} from '../hooks/use-lupg-queries'
import * as phqSvc from '../services/phq.service'
import { type AttendanceStatus } from '../types'
import {
  calculateAttendancePercent,
  calculateAverageAttendancePercent,
} from '../utils/program-attendance'
import { PhqScopeControls } from './components/phq-scope-controls'
import { usePhqKelompokScope } from './components/use-phq-kelompok-scope'

interface Props {
  initialMonthKey: string
  initialKelompokId?: string
}

type Group = { id: string; value: string }

export function PhqSummaryPage({ initialMonthKey, initialKelompokId }: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const { role } = useAuthStore((state) => state.auth)
  const isAdmin = role === 'admin' || role === 'super_admin'
  const [kelompokId, setKelompokId] = useState<string | undefined>(
    initialKelompokId ?? (isAdmin ? 'all' : undefined)
  )
  const scope = usePhqKelompokScope(kelompokId)
  const groups = scope.groups as Group[]
  const isDesa = isAdmin && kelompokId === 'all'
  const selectedIds = isDesa
    ? groups.map((group) => group.id)
    : scope.kelompokId
      ? [scope.kelompokId]
      : []
  const scopes = useQueries({
    queries: selectedIds.map((id) => ({
      queryKey: ['lupg', 'phq', 'summary-data', id, monthKey],
      queryFn: async () => {
        const [participants, meetings, note] = await Promise.all([
          phqSvc.listPhqParticipants(id),
          phqSvc.listPhqMeetings(id, monthKey),
          phqSvc.getPhqMonthlyNote(id, monthKey),
        ])
        const meetingIds = meetings.map((meeting) => meeting.id)
        const [attendance, progress] = await Promise.all([
          phqSvc.listPhqAttendance(meetingIds),
          phqSvc.listPhqProgress(meetingIds),
        ])
        return { id, participants, meetings, attendance, progress, note }
      },
      enabled: !!id,
    })),
  })
  const { data: localParticipants = [] } = usePhqParticipants(
    isDesa ? undefined : scope.kelompokId
  )
  const { data: localNote } = usePhqMonthlyNote(
    isDesa ? undefined : scope.kelompokId,
    monthKey
  )
  const saveNote = useUpsertPhqMonthlyNote()
  const [note, setNote] = useState('')
  useEffect(() => setNote(localNote?.notes ?? ''), [localNote?.notes])

  const data = scopes.flatMap((scope) => (scope.data ? [scope.data] : []))
  const nameByGroup = new Map(groups.map((group) => [group.id, group.value]))
  const rows = data.flatMap((scope) =>
    scope.participants
      .filter((participant) => participant.status_active)
      .map((participant) => {
        const statuses = scope.meetings.flatMap((meeting) => {
          const status = scope.attendance.find(
            (row) =>
              row.participant_id === participant.id &&
              row.meeting_id === meeting.id
          )?.status
          return [status as AttendanceStatus | undefined]
        })
        const scores = scope.progress
          .filter((row) => row.participant_id === participant.id)
          .map((row) => row.score)
        return {
          participant,
          kelompok: nameByGroup.get(scope.id) ?? '-',
          attendance: calculateAttendancePercent(
            statuses.map((status) => status ?? 'alpa'),
            scope.meetings.length
          ),
          meetingCount: scope.meetings.length,
          score: scores.length
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : null,
          meetings: scope.meetings,
          progress: scope.progress,
          latestProgress: [...scope.meetings]
            .reverse()
            .map((meeting) =>
              scope.progress.find(
                (row) =>
                  row.participant_id === participant.id &&
                  row.meeting_id === meeting.id
              )
            )
            .find(Boolean),
        }
      })
  )
  const activeCount =
    rows.length ||
    (scope.kelompokId && !isDesa
      ? localParticipants.filter((participant) => participant.status_active)
          .length
      : 0)
  const averageAttendance = calculateAverageAttendancePercent(rows)
  const scoredRows = rows.filter((row) => row.score !== null)
  const averageScore = scoredRows.length
    ? scoredRows.reduce((sum, row) => sum + (row.score ?? 0), 0) /
      scoredRows.length
    : 0
  const meetingTrends = data.flatMap((scope) =>
    scope.meetings.map((meeting, index) => {
      const scores = scope.progress
        .filter((row) => row.meeting_id === meeting.id)
        .map((row) => row.score)
      return {
        label: `${nameByGroup.get(scope.id) ?? '-'} M${index + 1}`,
        score: scores.length
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null,
        attendance: calculateAverageAttendancePercent(
          scope.participants
            .filter((participant) => participant.status_active)
            .map((participant) => ({
              attendance: scope.attendance.some(
                (row) =>
                  row.participant_id === participant.id &&
                  row.meeting_id === meeting.id &&
                  row.status === 'hadir'
              )
                ? 100
                : 0,
              meetingCount: 1,
            }))
        ),
      }
    })
  )
  const juzGroups = rows.reduce<Record<string, typeof rows>>((result, row) => {
    const key = row.participant.highest_juz
      ? `Juz ${row.participant.highest_juz}`
      : 'Belum dicatat'
    ;(result[key] ??= []).push(row)
    return result
  }, {})
  const noteRows = data.flatMap((scope) =>
    scope.note?.notes
      ? [
          <p key={scope.id}>
            <span className='font-medium'>{nameByGroup.get(scope.id)}:</span>{' '}
            {scope.note.notes}
          </p>,
        ]
      : []
  )
  const isLoading =
    scope.isResolving ||
    (isDesa && scope.isLoading) ||
    scopes.some((query) => query.isLoading)
  const error = scope.error ?? scopes.find((query) => query.isError)?.error

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PageHeader
          kicker='LUPG · PHQ'
          title={isDesa ? 'Rekap Desa PHQ' : 'Ringkasan PHQ'}
          description='Kehadiran hanya menghitung status Hadir.'
          actions={
            <PhqScopeControls
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              kelompokId={kelompokId}
              onKelompokChange={setKelompokId}
              allowAll={isAdmin}
            />
          }
        />
        {isLoading ? (
          <Empty message='Memuat ringkasan PHQ...' />
        ) : error ? (
          <Empty message='Gagal memuat seluruh data rekap PHQ.' />
        ) : !scope.kelompokId && !isDesa ? (
          <Empty message='Pilih kelompok untuk melihat ringkasan PHQ.' />
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Metric label='Peserta aktif' value={activeCount} />
              <Metric
                label='Rata-rata hadir'
                value={
                  averageAttendance === null
                    ? '-'
                    : `${averageAttendance.toFixed(1)}%`
                }
              />
              <Metric
                label='Rata-rata nilai'
                value={averageScore ? averageScore.toFixed(1) : '-'}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Tren per pertemuan</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-wrap gap-3'>
                {meetingTrends.length ? (
                  meetingTrends.map((trend) => (
                    <div
                      key={trend.label}
                      className='rounded-md border px-3 py-2 text-sm'
                    >
                      {trend.label}: nilai {trend.score?.toFixed(1) ?? '-'} ·
                      hadir{' '}
                      {trend.attendance === null
                        ? '-'
                        : `${trend.attendance.toFixed(1)}%`}
                    </div>
                  ))
                ) : (
                  <span className='text-muted-foreground'>
                    Belum ada nilai pertemuan.
                  </span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Peserta menurut juz tertinggi</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                {Object.entries(juzGroups).length ? (
                  Object.entries(juzGroups)
                    .sort(([a], [b]) => a.localeCompare(b, 'id'))
                    .map(([juz, participants]) => (
                      <div key={juz}>
                        <p className='mb-2 font-medium'>
                          {juz} ({participants.length}) · rata-rata penguasaan{' '}
                          {(() => {
                            const mastery = participants
                              .map(
                                (row) =>
                                  row.participant.highest_juz_mastery_percent
                              )
                              .filter(
                                (value): value is number => value !== null
                              )
                            return mastery.length
                              ? `${(mastery.reduce((sum, value) => sum + value, 0) / mastery.length).toFixed(1)}%`
                              : '-'
                          })()}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          {participants.map((row) => (
                            <span
                              key={row.participant.id}
                              className='rounded-md border px-2 py-1 text-sm'
                            >
                              {row.participant.name}
                              {isDesa ? ` · ${row.kelompok}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                ) : (
                  <span className='text-muted-foreground'>
                    Belum ada peserta aktif.
                  </span>
                )}
              </CardContent>
            </Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  {isDesa ? <TableHead>Kelompok</TableHead> : null}
                  <TableHead>Progres terakhir bulan ini</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Nilai terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.participant.id}>
                    <TableCell className='font-medium'>
                      {row.participant.name}
                    </TableCell>
                    {isDesa ? <TableCell>{row.kelompok}</TableCell> : null}
                    <TableCell>
                      {row.latestProgress?.juz
                        ? `Juz ${row.latestProgress.juz}${row.latestProgress.surat ? ` · ${row.latestProgress.surat}` : ''}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {row.meetings.length
                        ? `${row.attendance.toFixed(1)}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {row.latestProgress?.score?.toFixed(1) ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isDesa ? (
              <Card>
                <CardHeader>
                  <CardTitle>Catatan kelompok</CardTitle>
                </CardHeader>
                <CardContent className='grid gap-3'>
                  {noteRows.length ? (
                    noteRows
                  ) : (
                    <span className='text-muted-foreground'>
                      Belum ada catatan kelompok.
                    </span>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Catatan bulan ini</CardTitle>
                </CardHeader>
                <CardContent className='flex gap-2'>
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder='Tambahkan catatan PHQ'
                  />
                  <Button
                    onClick={async () => {
                      if (!scope.kelompokId) return
                      try {
                        await saveNote.mutateAsync({
                          kelompok_id: scope.kelompokId,
                          month: monthKey,
                          notes: note,
                        })
                        toast.success('Catatan disimpan.')
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Gagal menyimpan catatan.'
                        )
                      }
                    }}
                    disabled={saveNote.isPending}
                  >
                    Simpan
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Main>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className='p-4'>
        <p className='text-sm text-muted-foreground'>{label}</p>
        <p className='text-2xl font-semibold'>{value}</p>
      </CardContent>
    </Card>
  )
}
function Empty({ message }: { message: string }) {
  return (
    <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
      {message}
    </div>
  )
}
