'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Check, X, Merge, Link2 } from 'lucide-react'
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
import { type PendingParticipant, type Participant } from '@/lib/schema'
import {
  pendingParticipantService,
  participantService,
  attendanceService,
} from '@/lib/storage'
import { useApprovals } from './approvals-provider'
import { ChevronsUpDown } from 'lucide-react'

export function PendingParticipantsTab() {
  const { refreshData, setRefreshData } = useApprovals()
  const [pendingList, setPendingList] = useState<PendingParticipant[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedPending, setSelectedPending] = useState<PendingParticipant | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)

  const loadData = () => {
    setPendingList(pendingParticipantService.getPending())
    setParticipants(participantService.getActive())
  }

  useEffect(() => {
    loadData()
    setRefreshData(() => loadData)
  }, [setRefreshData])

  const handleApproveNew = (pending: PendingParticipant) => {
    pendingParticipantService.approve(pending.id, true)
    toast.success(`Peserta "${pending.name}" berhasil ditambahkan`)
    loadData()
  }

  const handleApproveMerge = () => {
    if (!selectedPending || !mergeTarget) return

    pendingParticipantService.approve(selectedPending.id, false, mergeTarget)
    const targetParticipant = participants.find((p) => p.id === mergeTarget)
    toast.success(`Absensi berhasil dihubungkan ke "${targetParticipant?.name}"`)
    setApproveDialogOpen(false)
    setSelectedPending(null)
    setMergeTarget(null)
    loadData()
  }

  const handleReject = (pending: PendingParticipant) => {
    pendingParticipantService.reject(pending.id)
    toast.success(`Pengajuan "${pending.name}" ditolak`)
    loadData()
  }

  const openMergeDialog = (pending: PendingParticipant) => {
    setSelectedPending(pending)
    setApproveDialogOpen(true)
  }

  if (pendingList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Participants</CardTitle>
          <CardDescription>
            Peserta baru yang menunggu persetujuan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-center justify-center text-muted-foreground'>
            Tidak ada pengajuan peserta baru
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Participants</CardTitle>
          <CardDescription>
            {pendingList.length} peserta baru menunggu persetujuan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Jumlah Absensi</TableHead>
                <TableHead>Diajukan</TableHead>
                <TableHead className='text-right'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingList.map((pending) => (
                <TableRow key={pending.id}>
                  <TableCell className='font-medium'>{pending.name}</TableCell>
                  <TableCell>{pending.suggestedKelompok}</TableCell>
                  <TableCell>
                    <Badge variant='outline'>Kategori {pending.suggestedKategori}</Badge>
                  </TableCell>
                  <TableCell>
                    {pending.suggestedGender === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </TableCell>
                  <TableCell>{pending.attendanceRefIds.length}</TableCell>
                  <TableCell>
                    {format(new Date(pending.createdAt), 'dd MMM yyyy', { locale: idLocale })}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-green-600 hover:text-green-700'
                        onClick={() => handleApproveNew(pending)}
                        title='Setujui sebagai peserta baru'
                      >
                        <Check className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-blue-600 hover:text-blue-700'
                        onClick={() => openMergeDialog(pending)}
                        title='Gabungkan ke peserta yang ada'
                      >
                        <Merge className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='text-red-600 hover:text-red-700'
                        onClick={() => handleReject(pending)}
                        title='Tolak pengajuan'
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

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gabungkan ke Peserta yang Ada</DialogTitle>
            <DialogDescription>
              Hubungkan absensi dari "{selectedPending?.name}" ke peserta yang sudah terdaftar.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={openCombobox}
                  className='w-full justify-between'
                >
                  {mergeTarget
                    ? participants.find((p) => p.id === mergeTarget)?.name
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
                            setMergeTarget(participant.id)
                            setOpenCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              mergeTarget === participant.id ? 'opacity-100' : 'opacity-0'
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
            <Button variant='outline' onClick={() => setApproveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleApproveMerge} disabled={!mergeTarget}>
              Gabungkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
