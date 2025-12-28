'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Check, X, Link2, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { type Attendance, type Participant } from '@/lib/schema'
import {
  attendanceService,
  participantService,
} from '@/lib/storage'
import { useApprovals } from './approvals-provider'

export function UnmatchedAttendanceTab() {
  const { setRefreshData } = useApprovals()
  const [unmatchedList, setUnmatchedList] = useState<Attendance[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null)
  const [linkTarget, setLinkTarget] = useState<string | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)

  const loadData = () => {
    setUnmatchedList(attendanceService.getUnmatched())
    setParticipants(participantService.getActive())
  }

  useEffect(() => {
    loadData()
    setRefreshData(() => loadData)
  }, [setRefreshData])

  const handleLink = () => {
    if (!selectedAttendance || !linkTarget) return

    attendanceService.linkToParticipant(selectedAttendance.id, linkTarget)
    const targetParticipant = participants.find((p) => p.id === linkTarget)
    toast.success(`Absensi berhasil dihubungkan ke "${targetParticipant?.name}"`)
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
                    {format(new Date(attendance.date), 'dd MMM yyyy', { locale: idLocale })}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {attendance.tempName || '-'}
                  </TableCell>
                  <TableCell>{attendance.tempKelompok || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={cn(
                        attendance.status === 'hadir'
                          ? 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'
                          : 'bg-amber-100/30 text-amber-900 dark:text-amber-200 border-amber-200'
                      )}
                    >
                      {attendance.status === 'hadir' ? 'Hadir' : 'Izin'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-blue-600 hover:text-blue-700'
                        onClick={() => openLinkDialog(attendance)}
                        title='Hubungkan ke peserta'
                      >
                        <Link2 className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-red-600 hover:text-red-700'
                        onClick={() => handleDelete(attendance)}
                        title='Hapus absensi'
                      >
                        <X className='h-4 w-4' />
                      </Button>
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
              <p><strong>Nama:</strong> {selectedAttendance?.tempName || '-'}</p>
              <p><strong>Tanggal:</strong> {selectedAttendance && format(new Date(selectedAttendance.date), 'dd MMM yyyy', { locale: idLocale })}</p>
              <p><strong>Status:</strong> {selectedAttendance?.status}</p>
            </div>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
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
                              linkTarget === participant.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className='flex flex-col'>
                            <span>{participant.name}</span>
                            <span className='text-muted-foreground text-xs'>
                              {participant.kelompok} - Kategori {participant.kategori}
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
