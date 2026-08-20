import { useState } from 'react'
import { differenceInYears, format, parse } from 'date-fns'
import { useQueries } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/rbac'
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
import { KelompokSelector } from '../components/kelompok-selector'
import { MonthPicker } from '../components/month-picker'
import {
  useCreateIntensifActivity,
  useDeleteIntensifActivity,
  useDeleteIntensifAttendance,
  useIntensifActivities,
  useIntensifAttendance,
  useIntensifCandidates,
  useUpdateIntensifActivity,
  useUpdateIntensifParticipant,
  useUpsertIntensifAttendance,
} from '../hooks/use-lupg-queries'
import { usePhqKelompokScope } from '../phq/components/use-phq-kelompok-scope'
import * as intensifSvc from '../services/intensif.service'
import {
  type AttendanceStatus,
  type IntensifActivityRow,
  type IntensifProgramCode,
} from '../types'
import { calculateAttendancePercent } from '../utils/program-attendance'

const statuses: { value: AttendanceStatus; label: string }[] = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'alpa', label: 'Alpa' },
]

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Gagal menyimpan data Intensif.'

interface Props {
  program: IntensifProgramCode
  initialMonthKey: string
  initialKelompokId?: string
}

type IntensifParticipantDialogRow = {
  id: string
  name: string
  kelompok_id: string
  kelompok_name: string
  gender: string
  birth_date: string | null
  birth_place: string | null
  category_code: string
  status_active: boolean
}

export function IntensifPage({
  program,
  initialMonthKey,
  initialKelompokId,
}: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const [selectedKelompokId, setSelectedKelompokId] = useState<
    string | undefined
  >(initialKelompokId)
  const [activityDialog, setActivityDialog] = useState<
    IntensifActivityRow | null | undefined
  >(undefined)
  const [activityId, setActivityId] = useState<string>()
  const [participantDialog, setParticipantDialog] =
    useState<IntensifParticipantDialogRow>()
  const { role } = useAuthStore((state) => state.auth)
  const scope = usePhqKelompokScope(selectedKelompokId)
  const isMt = (role as Role) === 'mt'
  const isDesa = !isMt && selectedKelompokId === 'all'
  const queryKelompokId = isDesa ? undefined : scope.kelompokId
  const title = program === 'APR_INTENSIF' ? 'APR Intensif' : 'AR Intensif'
  const { data: activities = [] } = useIntensifActivities(
    program,
    queryKelompokId,
    monthKey
  )
  const selectedActivity =
    activities.find((activity) => activity.id === activityId) ?? activities[0]
  const { data: attendance = [] } = useIntensifAttendance(
    program,
    queryKelompokId,
    monthKey,
    activities.map((activity) => activity.id)
  )
  const { data: scopedCandidates = [] } = useIntensifCandidates(
    program,
    queryKelompokId
  )
  const desaCandidateQueries = useQueries({
    queries: (isDesa ? scope.groups : []).map((group) => ({
      queryKey: ['lupg', 'intensif', program, 'candidates', group.id],
      queryFn: () => intensifSvc.listIntensifCandidates(program, group.id),
    })),
  })
  const createActivity = useCreateIntensifActivity()
  const updateActivity = useUpdateIntensifActivity()
  const deleteActivity = useDeleteIntensifActivity()
  const saveAttendance = useUpsertIntensifAttendance()
  const deleteAttendance = useDeleteIntensifAttendance()
  const updateParticipant = useUpdateIntensifParticipant()
  const byCell = new Map(
    attendance.map((row) => [`${row.participant_id}:${row.activity_id}`, row])
  )
  const groupNameById = new Map(
    scope.groups.map((group) => [group.id, group.value])
  )
  const groupIdByActivity = new Map(
    activities.map((activity) => [activity.id, activity.kelompok_id])
  )
  // Keep snapshots visible even if the current main-participant roster changes.
  const participants = new Map<
    string,
    {
      id: string
      name: string
      gender: string
      kelompokId?: string
      birthDate?: string | null
      birthPlace?: string | null
      categoryCode?: string
      statusActive?: boolean
    }
  >(
    scopedCandidates.map((candidate) => [
      candidate.id,
      {
        id: candidate.id,
        name: candidate.name,
        gender: candidate.gender,
        kelompokId: candidate.kelompok_id,
        birthDate: candidate.birth_date,
        birthPlace: candidate.birth_place,
        categoryCode: candidate.category_code,
        statusActive: candidate.status_active,
      },
    ])
  )
  if (isDesa) {
    desaCandidateQueries.forEach((query, index) => {
      const kelompokId = scope.groups[index]?.id
      query.data?.forEach((candidate) =>
        participants.set(candidate.id, {
          id: candidate.id,
          name: candidate.name,
          gender: candidate.gender,
          kelompokId,
          birthDate: candidate.birth_date,
          birthPlace: candidate.birth_place,
          categoryCode: candidate.category_code,
          statusActive: candidate.status_active,
        })
      )
    })
  }
  attendance.forEach((row) =>
    participants.set(row.participant_id, {
      id: row.participant_id,
      name: row.participant_name,
      gender: row.participant_gender ?? '',
      kelompokId: groupIdByActivity.get(row.activity_id),
      birthDate: participants.get(row.participant_id)?.birthDate,
      birthPlace: participants.get(row.participant_id)?.birthPlace,
      categoryCode: participants.get(row.participant_id)?.categoryCode,
      statusActive: participants.get(row.participant_id)?.statusActive,
    })
  )
  const roster = [...participants.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'id')
  )

  const saveActivity = async (values: { date: string; notes: string }) => {
    if (!scope.kelompokId || !values.date)
      return toast.error('Tanggal wajib diisi.')
    try {
      const activityDate = parse(values.date, 'yyyy-MM-dd', new Date())
      if (activityDialog) {
        await updateActivity.mutateAsync({
          id: activityDialog.id,
          patch: { activity_date: activityDate, notes: values.notes || null },
          program,
          kelompokId: scope.kelompokId,
          month: monthKey,
        })
      } else {
        await createActivity.mutateAsync({
          program_code: program,
          kelompok_id: scope.kelompokId,
          activity_date: activityDate,
          notes: values.notes || null,
          month: monthKey,
        })
      }
      setActivityDialog(undefined)
      toast.success('Kegiatan disimpan.')
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
          kicker='LUPG · INTENSIF'
          title={title}
          description='Kehadiran tersimpan sebagai snapshot pada setiap tanggal kegiatan.'
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              <MonthPicker monthKey={monthKey} onChange={setMonthKey} />
              {!isMt ? (
                <KelompokSelector
                  value={selectedKelompokId}
                  onChange={setSelectedKelompokId}
                  allOption={{ value: 'all', label: 'Semua kelompok' }}
                />
              ) : null}
              <Button
                onClick={() => setActivityDialog(null)}
                disabled={!scope.kelompokId || isDesa}
              >
                <Plus /> Tambah kegiatan
              </Button>
            </div>
          }
        />
        {scope.isResolving ? (
          <Empty message='Memuat kelompok Intensif...' />
        ) : !queryKelompokId && !isDesa ? (
          <Empty message='Pilih kelompok untuk mencatat Intensif.' />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className='text-end'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className='font-medium'>
                      {format(
                        parse(activity.activity_date, 'yyyy-MM-dd', new Date()),
                        'dd MMM yyyy'
                      )}
                    </TableCell>
                    <TableCell>{activity.notes || '-'}</TableCell>
                    <TableCell className='text-end'>
                      {!isDesa ? (
                        <>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setActivityDialog(activity)}
                            aria-label='Edit kegiatan'
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={async () => {
                              if (
                                !confirm(
                                  'Hapus kegiatan ini beserta seluruh kehadiran yang tersimpan?'
                                )
                              )
                                return
                              try {
                                await deleteActivity.mutateAsync({
                                  id: activity.id,
                                  program,
                                  kelompokId: scope.kelompokId!,
                                  month: monthKey,
                                })
                                toast.success('Kegiatan dihapus.')
                              } catch (error) {
                                toast.error(errorMessage(error))
                              }
                            }}
                            aria-label='Hapus kegiatan'
                          >
                            <Trash2 />
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {!activities.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className='text-center text-muted-foreground'
                    >
                      Belum ada kegiatan pada bulan ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {selectedActivity ? (
              <>
                <Select
                  value={selectedActivity.id}
                  onValueChange={setActivityId}
                >
                  <SelectTrigger className='w-full sm:w-72'>
                    <SelectValue placeholder='Pilih kegiatan' />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {format(
                          parse(
                            activity.activity_date,
                            'yyyy-MM-dd',
                            new Date()
                          ),
                          'dd MMM yyyy'
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peserta</TableHead>
                      <TableHead>Kelompok</TableHead>
                      <TableHead>Jenis Kelamin</TableHead>
                      <TableHead>Tgl Lahir</TableHead>
                      <TableHead>Usia</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Kehadiran</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((participant) => {
                      const current = byCell.get(
                        `${participant.id}:${selectedActivity.id}`
                      )
                      return (
                        <TableRow key={participant.id}>
                          <TableCell className='font-medium'>
                            {participant.name}
                          </TableCell>
                          <TableCell>
                            {groupNameById.get(participant.kelompokId ?? '') ??
                              '-'}
                          </TableCell>
                          <TableCell>
                            {participant.gender === 'L'
                              ? 'Laki-laki'
                              : participant.gender === 'P'
                                ? 'Perempuan'
                                : '-'}
                          </TableCell>
                          <TableCell className='tabular-nums'>
                            {participant.birthDate
                              ? format(
                                  parse(
                                    participant.birthDate,
                                    'yyyy-MM-dd',
                                    new Date()
                                  ),
                                  'dd MMM yyyy',
                                  { locale: idLocale }
                                )
                              : '-'}
                          </TableCell>
                          <TableCell className='tabular-nums'>
                            {participant.birthDate
                              ? `${differenceInYears(
                                  new Date(),
                                  parse(
                                    participant.birthDate,
                                    'yyyy-MM-dd',
                                    new Date()
                                  )
                                )} tahun`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {participant.statusActive === undefined
                              ? 'Snapshot'
                              : participant.statusActive
                                ? 'Aktif'
                                : 'Nonaktif'}
                          </TableCell>
                          <TableCell>
                            {!isDesa ? (
                              <Select
                                value={current?.status}
                                onValueChange={async (value) => {
                                  const status = value as AttendanceStatus
                                  if (status === current?.status) return
                                  try {
                                    await saveAttendance.mutateAsync({
                                      activity_id: selectedActivity.id,
                                      participant_id: participant.id,
                                      status,
                                      program,
                                      kelompokId: scope.kelompokId!,
                                      month: monthKey,
                                    })
                                    toast.success('Kehadiran disimpan.')
                                  } catch (error) {
                                    toast.error(errorMessage(error))
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
                            ) : (
                              (current?.status ?? '-')
                            )}
                          </TableCell>
                          <TableCell className='w-12'>
                            {!isDesa &&
                            participant.statusActive !== undefined ? (
                              <Button
                                variant='ghost'
                                size='icon'
                                aria-label={`Edit ${participant.name}`}
                                onClick={() =>
                                  setParticipantDialog({
                                    id: participant.id,
                                    name: participant.name,
                                    kelompok_id: participant.kelompokId ?? '',
                                    kelompok_name:
                                      groupNameById.get(
                                        participant.kelompokId ?? ''
                                      ) ?? '-',
                                    gender: participant.gender,
                                    birth_date: participant.birthDate ?? null,
                                    birth_place: participant.birthPlace ?? null,
                                    category_code:
                                      participant.categoryCode ?? '',
                                    status_active:
                                      participant.statusActive ?? false,
                                  })
                                }
                              >
                                <Pencil />
                              </Button>
                            ) : null}
                          </TableCell>
                          <TableCell className='w-12'>
                            {!isDesa && current ? (
                              <Button
                                variant='ghost'
                                size='icon'
                                aria-label={`Hapus kehadiran ${participant.name}`}
                                onClick={async () => {
                                  if (
                                    !queryKelompokId ||
                                    !confirm(
                                      `Hapus kehadiran ${participant.name}?`
                                    )
                                  )
                                    return
                                  try {
                                    await deleteAttendance.mutateAsync({
                                      id: current.id,
                                      program,
                                      kelompokId: queryKelompokId,
                                      month: monthKey,
                                    })
                                    toast.success('Kehadiran dihapus.')
                                  } catch (error) {
                                    toast.error(errorMessage(error))
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
                    {!roster.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className='text-center text-muted-foreground'
                        >
                          Belum ada kandidat aktif untuk program ini.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelompok</TableHead>
                  <TableHead>Jenis Kelamin</TableHead>
                  <TableHead>Tgl Lahir</TableHead>
                  <TableHead>Usia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-end'>Aksi</TableHead>
                  <TableHead className='text-end'>Hadir / kegiatan</TableHead>
                  <TableHead className='text-end'>Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((participant) => {
                  const participantActivities = isDesa
                    ? activities.filter(
                        (activity) =>
                          activity.kelompok_id === participant.kelompokId
                      )
                    : activities
                  const statuses = participantActivities.map(
                    (activity) =>
                      (byCell.get(`${participant.id}:${activity.id}`)
                        ?.status as AttendanceStatus | undefined) ?? 'alpa'
                  )
                  return (
                    <TableRow key={participant.id}>
                      <TableCell className='font-medium'>
                        {participant.name}
                      </TableCell>
                      <TableCell>
                        {groupNameById.get(participant.kelompokId ?? '') ?? '-'}
                      </TableCell>
                      <TableCell>
                        {participant.gender === 'L'
                          ? 'Laki-laki'
                          : participant.gender === 'P'
                            ? 'Perempuan'
                            : '-'}
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {participant.birthDate
                          ? format(
                              parse(
                                participant.birthDate,
                                'yyyy-MM-dd',
                                new Date()
                              ),
                              'dd MMM yyyy',
                              { locale: idLocale }
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className='tabular-nums'>
                        {participant.birthDate
                          ? `${differenceInYears(
                              new Date(),
                              parse(
                                participant.birthDate,
                                'yyyy-MM-dd',
                                new Date()
                              )
                            )} tahun`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {participant.statusActive === undefined
                          ? 'Snapshot'
                          : participant.statusActive
                            ? 'Aktif'
                            : 'Nonaktif'}
                      </TableCell>
                      <TableCell className='text-end'>
                        {!isDesa && participant.statusActive !== undefined ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`Edit ${participant.name}`}
                            onClick={() =>
                              setParticipantDialog({
                                id: participant.id,
                                name: participant.name,
                                kelompok_id: participant.kelompokId ?? '',
                                kelompok_name:
                                  groupNameById.get(
                                    participant.kelompokId ?? ''
                                  ) ?? '-',
                                gender: participant.gender,
                                birth_date: participant.birthDate ?? null,
                                birth_place: participant.birthPlace ?? null,
                                category_code: participant.categoryCode ?? '',
                                status_active:
                                  participant.statusActive ?? false,
                              })
                            }
                          >
                            <Pencil />
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className='text-end'>
                        {statuses.filter((status) => status === 'hadir').length}{' '}
                        / {participantActivities.length}
                      </TableCell>
                      <TableCell className='text-end'>
                        {participantActivities.length
                          ? `${calculateAttendancePercent(
                              statuses,
                              participantActivities.length
                            ).toFixed(1)}%`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!roster.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className='text-center text-muted-foreground'
                    >
                      Belum ada peserta untuk direkap.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </>
        )}
      </Main>
      {activityDialog !== undefined ? (
        <ActivityDialog
          activity={activityDialog}
          pending={createActivity.isPending || updateActivity.isPending}
          onClose={() => setActivityDialog(undefined)}
          onSave={saveActivity}
        />
      ) : null}
      {participantDialog ? (
        <IntensifParticipantDialog
          participant={participantDialog}
          pending={updateParticipant.isPending}
          onClose={() => setParticipantDialog(undefined)}
          onSave={async (values) => {
            try {
              await updateParticipant.mutateAsync(values)
              toast.success('Peserta berhasil diperbarui.')
              setParticipantDialog(undefined)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          }}
        />
      ) : null}
    </>
  )
}

function ActivityDialog({
  activity,
  pending,
  onClose,
  onSave,
}: {
  activity: IntensifActivityRow | null
  pending: boolean
  onClose: () => void
  onSave: (values: { date: string; notes: string }) => void
}) {
  const [date, setDate] = useState(activity?.activity_date ?? '')
  const [notes, setNotes] = useState(activity?.notes ?? '')
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Edit kegiatan' : 'Tambah kegiatan'}
          </DialogTitle>
          <DialogDescription>
            Tanggal menentukan kegiatan pada bulan rekap.
          </DialogDescription>
        </DialogHeader>
        <form
          id='intensif-activity-form'
          className='grid gap-4'
          onSubmit={(event) => {
            event.preventDefault()
            onSave({ date, notes })
          }}
        >
          <label className='grid gap-2'>
            Tanggal
            <Input
              type='date'
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className='grid gap-2'>
            Catatan
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button
            type='submit'
            form='intensif-activity-form'
            disabled={pending}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IntensifParticipantDialog({
  participant,
  pending,
  onClose,
  onSave,
}: {
  participant: IntensifParticipantDialogRow
  pending: boolean
  onClose: () => void
  onSave: (values: {
    id: string
    name: string
    gender: string
    categoryCode: string
    birthDate: Date | null
    birthPlace: string
    statusActive: boolean
  }) => void
}) {
  const [name, setName] = useState(participant.name)
  const [gender, setGender] = useState(participant.gender)
  const [categoryCode, setCategoryCode] = useState(participant.category_code)
  const [birthDate, setBirthDate] = useState(participant.birth_date ?? '')
  const [birthPlace, setBirthPlace] = useState(participant.birth_place ?? '')
  const [statusActive, setStatusActive] = useState(participant.status_active)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit peserta</DialogTitle>
          <DialogDescription>
            Perubahan tersinkron ke data Peserta pada workspace Absensi.
            Kelompok tidak dapat diubah dari Intensif.
          </DialogDescription>
        </DialogHeader>
        <form
          id='intensif-participant-form'
          className='grid gap-4 sm:grid-cols-2'
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim()) return toast.error('Nama peserta wajib diisi.')
            onSave({
              id: participant.id,
              name,
              gender,
              categoryCode,
              birthDate: birthDate
                ? parse(birthDate, 'yyyy-MM-dd', new Date())
                : null,
              birthPlace,
              statusActive,
            })
          }}
        >
          <label className='grid gap-2 sm:col-span-2'>
            Nama
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Kelompok
            <Input value={participant.kelompok_name} disabled />
          </label>
          <label className='grid gap-2'>
            Jenis Kelamin
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='L'>Laki-laki</SelectItem>
                <SelectItem value='P'>Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-2'>
            Kategori
            <Select value={categoryCode} onValueChange={setCategoryCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='GPN A'>GPN A</SelectItem>
                <SelectItem value='GPN B'>GPN B</SelectItem>
                <SelectItem value='AR'>AR</SelectItem>
                <SelectItem value='APR'>APR</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-2'>
            Tanggal Lahir
            <Input
              type='date'
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
          <label className='grid gap-2 sm:col-span-2'>
            Tempat Lahir
            <Input
              value={birthPlace}
              onChange={(event) => setBirthPlace(event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Status
            <Select
              value={statusActive ? 'active' : 'inactive'}
              onValueChange={(value) => setStatusActive(value === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='active'>Aktif</SelectItem>
                <SelectItem value='inactive'>Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button
            type='submit'
            form='intensif-participant-form'
            disabled={pending}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
      {message}
    </div>
  )
}
