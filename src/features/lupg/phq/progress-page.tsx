import { useState } from 'react'
import { format, parse } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  useCreatePhqMeeting,
  useDeletePhqProgress,
  useDeletePhqMeeting,
  usePhqMeetings,
  usePhqParticipants,
  usePhqProgress,
  useUpdatePhqMeeting,
  useUpsertPhqProgress,
} from '../hooks/use-lupg-queries'
import {
  type PhqMeetingRow,
  type PhqParticipantRow,
  type PhqProgressRow,
} from '../types'
import { getHafalanPredicate } from '../utils/program-attendance'
import { PhqScopeControls } from './components/phq-scope-controls'
import { usePhqKelompokScope } from './components/use-phq-kelompok-scope'

interface Props {
  initialMonthKey: string
  initialKelompokId?: string
}
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Gagal menyimpan data PHQ.'
const progressLabel = (row: PhqProgressRow | undefined) =>
  row ? `${row.score} · ${getHafalanPredicate(row.score)}` : 'Isi'

export function PhqProgressPage({ initialMonthKey, initialKelompokId }: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const [kelompokId, setKelompokId] = useState<string | undefined>(
    initialKelompokId
  )
  const [meetingDialog, setMeetingDialog] = useState<
    PhqMeetingRow | null | undefined
  >(undefined)
  const [cell, setCell] = useState<{
    participant: PhqParticipantRow
    meeting: PhqMeetingRow
    progress?: PhqProgressRow
  } | null>(null)
  const scope = usePhqKelompokScope(kelompokId)
  const { data: participants = [] } = usePhqParticipants(scope.kelompokId)
  const { data: meetings = [], isLoading } = usePhqMeetings(
    scope.kelompokId,
    monthKey
  )
  const { data: progress = [] } = usePhqProgress(
    scope.kelompokId,
    monthKey,
    meetings.map((meeting) => meeting.id)
  )
  const createMeeting = useCreatePhqMeeting()
  const updateMeeting = useUpdatePhqMeeting()
  const deleteMeeting = useDeletePhqMeeting()
  const saveProgress = useUpsertPhqProgress()
  const deleteProgress = useDeletePhqProgress()
  const byCell = new Map(
    progress.map((item) => [`${item.participant_id}:${item.meeting_id}`, item])
  )
  const saveMeeting = async (date: string) => {
    if (!scope.kelompokId) return
    try {
      if (meetingDialog)
        await updateMeeting.mutateAsync({
          id: meetingDialog.id,
          patch: { activity_date: parse(date, 'yyyy-MM-dd', new Date()) },
          kelompokId: scope.kelompokId,
          month: monthKey,
        })
      else
        await createMeeting.mutateAsync({
          kelompok_id: scope.kelompokId,
          activity_date: parse(date, 'yyyy-MM-dd', new Date()),
          month: monthKey,
        })
      toast.success('Pertemuan disimpan.')
      setMeetingDialog(undefined)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }
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
          title='Progres Hafalan'
          description='Nilai hafalan per pertemuan, diurutkan berdasarkan tanggal pertemuan.'
          actions={
            <>
              <PhqScopeControls
                monthKey={monthKey}
                onMonthChange={setMonthKey}
                kelompokId={kelompokId}
                onKelompokChange={setKelompokId}
              />
              <Button
                onClick={() => setMeetingDialog(null)}
                disabled={!scope.kelompokId || meetings.length >= 4}
              >
                <Plus data-icon='inline-start' />
                Tambah pertemuan
              </Button>
            </>
          }
        />
        {scope.isResolving ? (
          <Empty message='Memuat kelompok PHQ...' />
        ) : !scope.kelompokId ? (
          <Empty message='Pilih kelompok untuk melihat progres hafalan.' />
        ) : isLoading ? (
          <Empty message='Memuat pertemuan PHQ...' />
        ) : meetings.length === 0 ? (
          <Empty message='Belum ada pertemuan pada bulan ini. Tambahkan maksimal empat pertemuan.' />
        ) : participants.length === 0 ? (
          <Empty message='Belum ada roster PHQ. Tambahkan peserta terlebih dahulu.' />
        ) : (
          <>
            <div className='flex flex-wrap gap-2'>
              {meetings.map((meeting, index) => (
                <div
                  key={meeting.id}
                  className='flex items-center gap-1 rounded-md border px-2 py-1 text-sm'
                >
                  <span>
                    M{index + 1}:{' '}
                    {format(
                      parse(meeting.activity_date, 'yyyy-MM-dd', new Date()),
                      'dd MMM'
                    )}
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Edit pertemuan ${index + 1}`}
                    onClick={() => setMeetingDialog(meeting)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Hapus pertemuan ${index + 1}`}
                    onClick={async () => {
                      if (
                        !confirm('Hapus pertemuan dan progres terkait?') ||
                        !scope.kelompokId
                      )
                        return
                      try {
                        await deleteMeeting.mutateAsync({
                          id: meeting.id,
                          kelompokId: scope.kelompokId,
                          month: monthKey,
                        })
                        toast.success('Pertemuan dihapus.')
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Table className='min-w-200'>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  {meetings.map((meeting, index) => (
                    <TableHead key={meeting.id}>
                      M{index + 1} ·{' '}
                      {format(
                        parse(meeting.activity_date, 'yyyy-MM-dd', new Date()),
                        'dd MMM'
                      )}
                    </TableHead>
                  ))}
                  <TableHead>Rata-rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.flatMap((participant) => {
                  if (!participant.status_active) return []
                  const scores = meetings
                    .map(
                      (meeting) =>
                        byCell.get(`${participant.id}:${meeting.id}`)?.score
                    )
                    .filter((score): score is number => score !== undefined)
                  const average = scores.length
                    ? scores.reduce((sum, score) => sum + score, 0) /
                      scores.length
                    : null
                  return [
                    <TableRow key={participant.id}>
                      <TableCell className='font-medium'>
                        {participant.name}
                      </TableCell>
                      <TableCell>{participant.category_code}</TableCell>
                      {meetings.map((meeting) => {
                        const item = byCell.get(
                          `${participant.id}:${meeting.id}`
                        )
                        return (
                          <TableCell key={meeting.id}>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                setCell({
                                  participant,
                                  meeting,
                                  progress: item,
                                })
                              }
                            >
                              {progressLabel(item)}
                            </Button>
                          </TableCell>
                        )
                      })}
                      <TableCell>
                        {average === null ? '-' : average.toFixed(1)}
                      </TableCell>
                    </TableRow>,
                  ]
                })}
              </TableBody>
            </Table>
          </>
        )}
        {meetingDialog !== undefined && (
          <MeetingDialog
            row={meetingDialog}
            monthKey={monthKey}
            onClose={() => setMeetingDialog(undefined)}
            onSave={saveMeeting}
            pending={createMeeting.isPending || updateMeeting.isPending}
          />
        )}
        {cell && (
          <ProgressDialog
            cell={cell}
            onClose={() => setCell(null)}
            onSave={async (values) => {
              if (!scope.kelompokId || !cell.participant.status_active) return
              try {
                await saveProgress.mutateAsync({
                  participant_id: cell.participant.id,
                  meeting_id: cell.meeting.id,
                  kelompokId: scope.kelompokId,
                  month: monthKey,
                  ...values,
                })
                toast.success('Progres hafalan disimpan.')
                setCell(null)
              } catch (error) {
                toast.error(errorMessage(error))
              }
            }}
            pending={saveProgress.isPending}
            onDelete={
              cell.progress
                ? async () => {
                    if (
                      !scope.kelompokId ||
                      !confirm('Hapus progres hafalan ini?')
                    )
                      return
                    try {
                      await deleteProgress.mutateAsync({
                        id: cell.progress!.id,
                        kelompokId: scope.kelompokId,
                        month: monthKey,
                      })
                      toast.success('Progres hafalan dihapus.')
                      setCell(null)
                    } catch (error) {
                      toast.error(errorMessage(error))
                    }
                  }
                : undefined
            }
            deleting={deleteProgress.isPending}
          />
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
function MeetingDialog({
  row,
  monthKey,
  onClose,
  onSave,
  pending,
}: {
  row: PhqMeetingRow | null
  monthKey: string
  onClose: () => void
  onSave: (date: string) => void
  pending: boolean
}) {
  const [date, setDate] = useState(row?.activity_date ?? `${monthKey}-01`)
  const lastDate = format(
    new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0),
    'yyyy-MM-dd'
  )
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? 'Edit pertemuan' : 'Tambah pertemuan'}
          </DialogTitle>
          <DialogDescription>
            Tanggal menentukan urutan M1 sampai M4.
          </DialogDescription>
        </DialogHeader>
        <form
          id='phq-meeting-form'
          onSubmit={(event) => {
            event.preventDefault()
            onSave(date)
          }}
        >
          <label className='grid gap-2'>
            Tanggal pertemuan
            <Input
              type='date'
              min={`${monthKey}-01`}
              max={lastDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button type='submit' form='phq-meeting-form' disabled={pending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function ProgressDialog({
  cell,
  onClose,
  onSave,
  pending,
  onDelete,
  deleting,
}: {
  cell: {
    participant: PhqParticipantRow
    meeting: PhqMeetingRow
    progress?: PhqProgressRow
  }
  onClose: () => void
  onSave: (values: {
    score: number
    juz: number | null
    juz_mastery_percent: number | null
    surat: string | null
    ayat_from: number | null
    ayat_to: number | null
  }) => void
  pending: boolean
  onDelete?: () => void
  deleting: boolean
}) {
  const [score, setScore] = useState(String(cell.progress?.score ?? ''))
  const [juz, setJuz] = useState(String(cell.progress?.juz ?? ''))
  const [mastery, setMastery] = useState(
    String(cell.progress?.juz_mastery_percent ?? '')
  )
  const [surat, setSurat] = useState(cell.progress?.surat ?? '')
  const [from, setFrom] = useState(String(cell.progress?.ayat_from ?? ''))
  const [to, setTo] = useState(String(cell.progress?.ayat_to ?? ''))
  const value = Number(score)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{cell.participant.name}</DialogTitle>
          <DialogDescription>
            Isi progres hafalan untuk pertemuan ini. Predikat:{' '}
            {score === '' ? '-' : getHafalanPredicate(value)}.
          </DialogDescription>
        </DialogHeader>
        <form
          id='phq-progress-form'
          className='grid gap-4 sm:grid-cols-2'
          onSubmit={(event) => {
            event.preventDefault()
            if (!Number.isFinite(value) || value < 0 || value > 100)
              return toast.error('Nilai harus antara 0 sampai 100.')
            const masteryValue = mastery === '' ? null : Number(mastery)
            if (
              masteryValue !== null &&
              (!Number.isInteger(masteryValue) ||
                masteryValue < 0 ||
                masteryValue > 100)
            )
              return toast.error(
                'Penguasaan juz harus bilangan bulat 0 sampai 100.'
              )
            onSave({
              score: value,
              juz: juz ? Number(juz) : null,
              juz_mastery_percent: masteryValue,
              surat: surat || null,
              ayat_from: from ? Number(from) : null,
              ayat_to: to ? Number(to) : null,
            })
          }}
        >
          <label className='grid gap-2 sm:col-span-2'>
            Nilai (0-100)
            <Input
              type='number'
              min='0'
              max='100'
              step='0.01'
              value={score}
              onChange={(event) => setScore(event.target.value)}
              required
            />
          </label>
          <label className='grid gap-2'>
            Juz
            <Input
              type='number'
              min='1'
              max='30'
              value={juz}
              onChange={(event) => setJuz(event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Surat
            <Input
              value={surat}
              onChange={(event) => setSurat(event.target.value)}
            />
          </label>
          <label className='grid gap-2 sm:col-span-2'>
            Penguasaan juz (0-100%)
            <Input
              type='number'
              min='0'
              max='100'
              step='1'
              value={mastery}
              onChange={(event) => setMastery(event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Ayat awal
            <Input
              type='number'
              min='1'
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Ayat akhir
            <Input
              type='number'
              min='1'
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </form>
        <DialogFooter>
          {onDelete ? (
            <Button
              variant='destructive'
              onClick={onDelete}
              disabled={deleting}
            >
              Hapus
            </Button>
          ) : null}
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button type='submit' form='phq-progress-form' disabled={pending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
