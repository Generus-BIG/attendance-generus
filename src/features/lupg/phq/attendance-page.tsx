import { useState } from 'react'
import { format, parse } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  usePhqAttendance,
  useDeletePhqAttendance,
  usePhqMeetings,
  usePhqParticipants,
  useUpsertPhqAttendance,
} from '../hooks/use-lupg-queries'
import { type AttendanceStatus } from '../types'
import { calculateAttendancePercent } from '../utils/program-attendance'
import { PhqScopeControls } from './components/phq-scope-controls'
import { usePhqKelompokScope } from './components/use-phq-kelompok-scope'

const statuses: { value: AttendanceStatus; label: string }[] = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
]

interface Props {
  initialMonthKey: string
  initialKelompokId?: string
}

export function PhqAttendancePage({
  initialMonthKey,
  initialKelompokId,
}: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const [kelompokId, setKelompokId] = useState<string | undefined>(
    initialKelompokId
  )
  const [meetingId, setMeetingId] = useState<string>()
  const scope = usePhqKelompokScope(kelompokId)
  const { data: participants = [] } = usePhqParticipants(scope.kelompokId)
  const { data: meetings = [] } = usePhqMeetings(scope.kelompokId, monthKey)
  const { data: attendance = [] } = usePhqAttendance(
    scope.kelompokId,
    monthKey,
    meetings.map((meeting) => meeting.id)
  )
  const saveAttendance = useUpsertPhqAttendance()
  const deleteAttendance = useDeletePhqAttendance()
  const activeParticipants = participants.filter(
    (participant) => participant.status_active
  )

  const byParticipantMeeting = new Map(
    attendance.map((row) => [`${row.participant_id}:${row.meeting_id}`, row])
  )
  const selectedMeeting =
    meetings.find((meeting) => meeting.id === meetingId) ?? meetings[0]

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
          title='Kehadiran PHQ'
          description='Persentase bulanan hanya menghitung status Hadir.'
          actions={
            <PhqScopeControls
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              kelompokId={kelompokId}
              onKelompokChange={setKelompokId}
            />
          }
        />
        {scope.isResolving ? (
          <Empty message='Memuat kelompok PHQ...' />
        ) : !scope.kelompokId ? (
          <Empty message='Pilih kelompok untuk mencatat kehadiran PHQ.' />
        ) : meetings.length === 0 ? (
          <Empty message='Belum ada pertemuan PHQ pada bulan ini.' />
        ) : (
          <>
            <Select value={selectedMeeting?.id} onValueChange={setMeetingId}>
              <SelectTrigger className='w-full sm:w-72'>
                <SelectValue placeholder='Pilih pertemuan' />
              </SelectTrigger>
              <SelectContent>
                {meetings.map((meeting, index) => (
                  <SelectItem key={meeting.id} value={meeting.id}>
                    M{index + 1} ·{' '}
                    {format(
                      parse(meeting.activity_date, 'yyyy-MM-dd', new Date()),
                      'dd MMM yyyy'
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMeeting ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peserta</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Kehadiran</TableHead>
                    <TableHead className='text-end'>Hadir bulan ini</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeParticipants.map((participant) => {
                    const current = byParticipantMeeting.get(
                      `${participant.id}:${selectedMeeting.id}`
                    )
                    const monthlyStatuses = meetings.map(
                      (meeting) =>
                        (byParticipantMeeting.get(
                          `${participant.id}:${meeting.id}`
                        )?.status as AttendanceStatus | undefined) ?? 'alpa'
                    )
                    return (
                      <TableRow key={participant.id}>
                        <TableCell className='font-medium'>
                          {participant.name}
                        </TableCell>
                        <TableCell>{participant.category_code}</TableCell>
                        <TableCell>
                          <Select
                            value={current?.status}
                            onValueChange={async (value) => {
                              const status = value as AttendanceStatus
                              if (
                                !scope.kelompokId ||
                                status === current?.status
                              )
                                return
                              try {
                                await saveAttendance.mutateAsync({
                                  participant_id: participant.id,
                                  meeting_id: selectedMeeting.id,
                                  status,
                                  kelompokId: scope.kelompokId,
                                  month: monthKey,
                                })
                                toast.success('Kehadiran disimpan.')
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : 'Gagal menyimpan kehadiran.'
                                )
                              }
                            }}
                          >
                            <SelectTrigger className='w-32'>
                              <SelectValue placeholder='Pilih' />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className='text-end'>
                          {calculateAttendancePercent(
                            monthlyStatuses,
                            meetings.length
                          ).toFixed(1)}
                          %
                        </TableCell>
                        <TableCell className='w-12'>
                          {current ? (
                            <Button
                              variant='ghost'
                              size='icon'
                              aria-label={`Hapus kehadiran ${participant.name}`}
                              onClick={async () => {
                                if (
                                  !scope.kelompokId ||
                                  !confirm(
                                    `Hapus kehadiran ${participant.name}?`
                                  )
                                )
                                  return
                                try {
                                  await deleteAttendance.mutateAsync({
                                    id: current.id,
                                    kelompokId: scope.kelompokId,
                                    month: monthKey,
                                  })
                                  toast.success('Kehadiran dihapus.')
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Gagal menghapus kehadiran.'
                                  )
                                }
                              }}
                            >
                              <Trash2 />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : null}
          </>
        )}
      </Main>
    </>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
      {message}
    </div>
  )
}
