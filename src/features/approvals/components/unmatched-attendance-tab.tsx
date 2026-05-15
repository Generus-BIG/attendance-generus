'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Check, X, Link2, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { type Attendance, type Participant } from '@/lib/schema'
import { attendanceService, participantService } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/permission-gate'
import { useApprovals } from './approvals-provider'

export function UnmatchedAttendanceTab() {
  const { setRefreshData } = useApprovals()
  const { can } = usePermissions()
  const [unmatchedList, setUnmatchedList] = useState<Attendance[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] =
    useState<Attendance | null>(null)
  const [linkTarget, setLinkTarget] = useState<string | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)

  const loadData = () => {
    setUnmatchedList(attendanceService.getUnmatched())
    setParticipants(participantService.getActive())
  }

  useEffect(() => {
    // Initial load + register refresh callback with parent. The setState calls
    // are the intended sync from the local service layer to component state;
    // not a candidate for the lift-state-up refactor.
    /* eslint-disable react-hooks/set-state-in-effect */
    loadData()
    setRefreshData(() => loadData)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [setRefreshData])

  const handleLink = () => {
    if (!selectedAttendance || !linkTarget) return

    attendanceService.linkToParticipant(selectedAttendance.id, linkTarget)
    const targetParticipant = participants.find((p) => p.id === linkTarget)
    toast.success(
      `Absensi berhasil dihubungkan ke "${targetParticipant?.name}"`
    )
    setLinkDialogOpen(false)
    setSelectedAttendance(null)
    setLinkTarget(null)
    loadData()
  }

  const handleDelete = (attendance: Attendance) => {
    attendanceService.delete(attendance.id)
    toast.success('Data absensi dihapus')
    loadData()
  }

  const openLinkDialog = (attendance: Attendance) => {
    setSelectedAttendance(attendance)
    setLinkDialogOpen(true)
  }

  if (unmatchedList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Attendance</CardTitle>
          <CardDescription>
            Absensi yang belum terhubung ke peserta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-center justify-center text-muted-foreground'>
            Semua data absensi sudah terhubung ke peserta
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Attendance</CardTitle>
          <CardDescription>
            {unmatchedList.length} absensi belum terhubung ke peserta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama (Sementara)</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unmatchedList.map((attendance) => (
                <TableRow key={attendance.id}>
                  <TableCell>
                    {format(new Date(attendance.date), 'dd MMM yyyy', {
                      locale: idLocale,
                    })}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {attendance.tempName || '-'}
                  </TableCell>
                  <TableCell>{attendance.tempKelompok || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className='text-[0.6875rem] tracking-[0.08em] uppercase'
                    >
                      {attendance.status === 'hadir' ? 'Hadir' : 'Izin'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <PermissionGate allowed={can.approveParticipant}>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-11 w-11'
                          onClick={() => openLinkDialog(attendance)}
                          title='Hubungkan ke peserta'
                          aria-label='Hubungkan ke peserta'
                        >
                          <Link2 className='h-4 w-4' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-11 w-11 text-destructive hover:text-destructive'
                          onClick={() => handleDelete(attendance)}
                          title='Hapus absensi'
                          aria-label='Hapus absensi'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan ke Peserta</DialogTitle>
            <DialogDescription>
              Hubungkan absensi ini ke peserta yang sudah terdaftar.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <div className='mb-4 rounded-md border p-3 text-sm'>
              <p>
                <strong>Nama:</strong> {selectedAttendance?.tempName || '-'}
              </p>
              <p>
                <strong>Tanggal:</strong>{' '}
                {selectedAttendance &&
                  format(new Date(selectedAttendance.date), 'dd MMM yyyy', {
                    locale: idLocale,
                  })}
              </p>
              <p>
                <strong>Status:</strong> {selectedAttendance?.status}
              </p>
            </div>
            <Popover modal={true} open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={openCombobox}
                  className='w-full justify-between'
                >
                  {linkTarget
                    ? participants.find((p) => p.id === linkTarget)?.name
                    : 'Pilih peserta...'}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0' align='start'>
                <Command>
                  <CommandInput placeholder='Cari peserta...' />
                  <CommandList>
                    <CommandEmpty>Peserta tidak ditemukan</CommandEmpty>
                    <CommandGroup>
                      {participants.map((participant) => (
                        <CommandItem
                          key={participant.id}
                          value={`${participant.name} ${participant.kelompok}`}
                          onSelect={() => {
                            setLinkTarget(participant.id)
                            setOpenCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              linkTarget === participant.id
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className='flex flex-col'>
                            <span>{participant.name}</span>
                            <span className='text-xs text-muted-foreground'>
                              {participant.kelompok} - Kategori{' '}
                              {participant.kategori}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setLinkDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleLink} disabled={!linkTarget}>
              Hubungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
