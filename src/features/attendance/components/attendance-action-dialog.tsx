'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
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
import {
  type Attendance,
  type Participant,
  ATTENDANCE_STATUS,
  PERMISSION_REASONS,
  KELOMPOK,
  KATEGORI,
  GENDER,
} from '@/lib/schema'
import { attendanceService, participantService, pendingParticipantService, generateId } from '@/lib/storage'
import { useAttendance } from './attendance-provider'

const formSchema = z.object({
  participantId: z.string().nullable(),
  status: z.enum(ATTENDANCE_STATUS),
  permissionReason: z.enum(PERMISSION_REASONS).nullable().optional(),
  notes: z.string().nullable().optional(),
  // New participant fields
  isNewParticipant: z.boolean().default(false),
  tempName: z.string().nullable().optional(),
  tempKelompok: z.enum(KELOMPOK).nullable().optional(),
  tempKategori: z.enum(KATEGORI).nullable().optional(),
  tempGender: z.enum(GENDER).nullable().optional(),
})

type AttendanceForm = z.infer<typeof formSchema>

type AttendanceActionDialogProps = {
  currentRow?: Attendance
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceActionDialog({
  currentRow,
  open,
  onOpenChange,
}: AttendanceActionDialogProps) {
  const isEdit = !!currentRow
  const { refreshData } = useAttendance()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [showNewParticipantForm, setShowNewParticipantForm] = useState(false)

  useEffect(() => {
    setParticipants(participantService.getActive())
  }, [open])

  const form = useForm<AttendanceForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          participantId: currentRow.participantId,
          status: currentRow.status,
          permissionReason: currentRow.permissionReason,
          notes: currentRow.notes,
          isNewParticipant: false,
          tempName: currentRow.tempName,
          tempKelompok: currentRow.tempKelompok,
          tempKategori: currentRow.tempKategori,
          tempGender: currentRow.tempGender,
        }
      : {
          participantId: null,
          status: 'hadir',
          permissionReason: null,
          notes: null,
          isNewParticipant: false,
          tempName: null,
          tempKelompok: null,
          tempKategori: null,
          tempGender: null,
        },
  })

  const watchStatus = form.watch('status')
  const watchParticipantId = form.watch('participantId')

  const onSubmit = (values: AttendanceForm) => {
    const now = new Date()

    if (isEdit) {
      attendanceService.update(currentRow.id, {
        participantId: values.participantId,
        status: values.status,
        permissionReason: values.status === 'izin' ? values.permissionReason : null,
        notes: values.status === 'izin' ? values.notes : null,
        tempName: values.isNewParticipant ? values.tempName : null,
        tempKelompok: values.isNewParticipant ? values.tempKelompok : null,
        tempKategori: values.isNewParticipant ? values.tempKategori : null,
        tempGender: values.isNewParticipant ? values.tempGender : null,
      })
      toast.success('Data absensi berhasil diperbarui')
    } else {
      // Create attendance record
      const attendance = attendanceService.create({
        participantId: values.isNewParticipant ? null : values.participantId,
        date: now,
        timestamp: now,
        status: values.status,
        permissionReason: values.status === 'izin' ? values.permissionReason : null,
        notes: values.status === 'izin' ? values.notes : null,
        tempName: values.isNewParticipant ? values.tempName : null,
        tempKelompok: values.isNewParticipant ? values.tempKelompok : null,
        tempKategori: values.isNewParticipant ? values.tempKategori : null,
        tempGender: values.isNewParticipant ? values.tempGender : null,
      })

      // If new participant, create pending participant
      if (values.isNewParticipant && values.tempName && values.tempKelompok && values.tempGender && values.tempKategori) {
        pendingParticipantService.create({
          name: values.tempName,
          suggestedKelompok: values.tempKelompok,
          suggestedGender: values.tempGender,
          suggestedKategori: values.tempKategori,
          attendanceRefIds: [attendance.id],
        })
      }

      toast.success('Absensi berhasil dicatat')
    }

    refreshData()
    form.reset()
    setShowNewParticipantForm(false)
    onOpenChange(false)
  }

  const selectedParticipant = participants.find((p) => p.id === watchParticipantId)

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        setShowNewParticipantForm(false)
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>{isEdit ? 'Edit Absensi' : 'Input Absensi'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui data absensi yang sudah ada.'
              : 'Catat kehadiran peserta.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='attendance-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 p-0.5'
          >
            {!showNewParticipantForm ? (
              <FormField
                control={form.control}
                name='participantId'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Nama Peserta</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={openCombobox}
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedParticipant
                              ? `${selectedParticipant.name} (${selectedParticipant.kelompok})`
                              : 'Pilih peserta...'}
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-full p-0' align='start'>
                        <Command>
                          <CommandInput placeholder='Cari nama peserta...' />
                          <CommandList>
                            <CommandEmpty>
                              <div className='flex flex-col items-center gap-2 py-4'>
                                <span>Peserta tidak ditemukan</span>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    setShowNewParticipantForm(true)
                                    form.setValue('isNewParticipant', true)
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <UserPlus className='mr-2 h-4 w-4' />
                                  Ajukan Peserta Baru
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {participants.map((participant) => (
                                <CommandItem
                                  key={participant.id}
                                  value={`${participant.name} ${participant.kelompok}`}
                                  onSelect={() => {
                                    form.setValue('participantId', participant.id)
                                    form.setValue('isNewParticipant', false)
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === participant.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <div className='rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                      Mengajukan Peserta Baru
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setShowNewParticipantForm(false)
                        form.setValue('isNewParticipant', false)
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name='tempName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Peserta Baru</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Masukkan nama peserta'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='tempKelompok'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kelompok</FormLabel>
                        <SelectDropdown
                          defaultValue={field.value || undefined}
                          onValueChange={field.onChange}
                          placeholder='Pilih kelompok'
                          items={KELOMPOK.map((k) => ({ label: k, value: k }))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='tempKategori'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <SelectDropdown
                          defaultValue={field.value || undefined}
                          onValueChange={field.onChange}
                          placeholder='Pilih kategori'
                          items={KATEGORI.map((k) => ({ label: `Kategori ${k}`, value: k }))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name='tempGender'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin</FormLabel>
                      <SelectDropdown
                        defaultValue={field.value || undefined}
                        onValueChange={field.onChange}
                        placeholder='Pilih jenis kelamin'
                        items={[
                          { label: 'Laki-laki', value: 'L' },
                          { label: 'Perempuan', value: 'P' },
                        ]}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Kehadiran</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih status'
                    items={[
                      { label: 'Hadir', value: 'hadir' },
                      { label: 'Izin', value: 'izin' },
                    ]}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchStatus === 'izin' && (
              <>
                <FormField
                  control={form.control}
                  name='permissionReason'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alasan Izin</FormLabel>
                      <SelectDropdown
                        defaultValue={field.value || undefined}
                        onValueChange={field.onChange}
                        placeholder='Pilih alasan'
                        items={PERMISSION_REASONS.map((r) => ({ label: r, value: r }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keterangan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Tambahkan keterangan jika perlu'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='attendance-form'>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
