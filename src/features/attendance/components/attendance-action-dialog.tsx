'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
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
import { supabase } from '@/lib/supabase'
import { useAttendance } from './attendance-provider'

// Fetch active participants from Supabase
async function getActiveParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      id,
      name,
      gender,
      groups:group_id(value),
      categories:category_id(value),
      status_active,
      created_at
    `)
    .eq('status_active', true)
    .order('name')

  if (error) throw error

  type ParticipantRow = {
    id: string
    name: string
    gender: 'L' | 'P'
    groups: { value: string } | null
    categories: { value: string } | null
    status_active: boolean | null
    created_at: string
  }

  function mapDbCategoryToInternal(dbCategory: string): Participant['kategori'] {
    if (dbCategory === 'GPN A') return 'A'
    if (dbCategory === 'GPN B') return 'B'
    if (dbCategory === 'AR') return 'AR'
    if (dbCategory === 'A' || dbCategory === 'B' || dbCategory === 'AR') return dbCategory
    return 'AR'
  }

  return (data as unknown as ParticipantRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    gender: p.gender,
    kelompok: (p.groups?.value || 'BIG 1') as Participant['kelompok'],
    kategori: mapDbCategoryToInternal(p.categories?.value || ''),
    status: p.status_active ? 'active' : 'inactive',
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.created_at),
  }))
}

// Fetch active forms from Supabase
async function getActiveForms() {
  const { data, error } = await supabase
    .from('attendance_forms')
    .select('id, title, date')
    .eq('is_active', true)
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

const formSchema = z.object({
  participantId: z.string().nullable(),
  formId: z.string().nullable().optional(),
  date: z.date({ message: 'Tanggal absensi wajib diisi' }),
  status: z.enum(ATTENDANCE_STATUS),
  permissionReason: z.enum(PERMISSION_REASONS).nullable().optional(),
  notes: z.string().nullable().optional(),
  // New participant fields
  isNewParticipant: z.boolean(),
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
  const [openCombobox, setOpenCombobox] = useState(false)
  const [showNewParticipantForm, setShowNewParticipantForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch participants from Supabase
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ['active_participants_for_dialog'],
    queryFn: getActiveParticipants,
    enabled: open, // Only fetch when dialog is open
  })

  // Fetch active forms for lookup
  const { data: activeForms = [] } = useQuery({
    queryKey: ['active_attendance_forms'],
    queryFn: getActiveForms,
    enabled: open,
  })

  const form = useForm<AttendanceForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          participantId: currentRow.participantId,
          formId: currentRow.formId || null,
          date: currentRow.date,
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
          formId: null,
          date: new Date(),
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

  const watchStatus = useWatch({ control: form.control, name: 'status' })
  const watchParticipantId = useWatch({ control: form.control, name: 'participantId' })

  // Update form values whenever currentRow changes (when dialog opens with edit data)
  useEffect(() => {
    if (isEdit && currentRow && open) {
      form.reset({
        participantId: currentRow.participantId,
        formId: currentRow.formId || null,
        date: currentRow.date,
        status: currentRow.status,
        permissionReason: currentRow.permissionReason,
        notes: currentRow.notes,
        isNewParticipant: !!currentRow.tempName, // If tempName exists, it's a new participant
        tempName: currentRow.tempName,
        tempKelompok: currentRow.tempKelompok,
        tempKategori: currentRow.tempKategori,
        tempGender: currentRow.tempGender,
      })
      // Show new participant form if editing a new participant record
      if (currentRow.tempName) {
        setShowNewParticipantForm(true)
      }
    }
  }, [isEdit, currentRow, open, form])

  const onSubmit = async (values: AttendanceForm) => {
    setIsSubmitting(true)
    try {
      // Construct timestamp: selected date at 00:00 UTC
      const selectedDate = values.date
      const timestamp = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0, 0, 0, 0
      )).toISOString()

      if (isEdit) {
        // Update existing attendance record in Supabase
        const updatePayload = {
          participant_id: values.isNewParticipant ? null : values.participantId,
          form_id: values.formId || null,
          status: values.status.toUpperCase(),
          permission_reason: values.status === 'izin' ? values.permissionReason : null,
          permission_description: values.status === 'izin' ? values.notes : null,
          temp_name: values.isNewParticipant ? values.tempName : null,
          temp_group: values.isNewParticipant ? values.tempKelompok : null,
          temp_category: values.isNewParticipant ? values.tempKategori : null,
          temp_gender: values.isNewParticipant ? values.tempGender : null,
          timestamp: timestamp,
        }

        const { error } = await supabase
          .from('attendance')
          .update(updatePayload)
          .eq('id', currentRow.id)

        if (error) throw error
        toast.success('Data absensi berhasil diperbarui')
      } else {
        // Create new attendance record in Supabase
        const insertPayload = {
          participant_id: values.isNewParticipant ? null : values.participantId,
          form_id: values.formId || null, // Link to selected form/event
          status: values.status.toUpperCase(),
          permission_reason: values.status === 'izin' ? values.permissionReason : null,
          permission_description: values.status === 'izin' ? values.notes : null,
          temp_name: values.isNewParticipant ? values.tempName : null,
          temp_group: values.isNewParticipant ? values.tempKelompok : null,
          temp_category: values.isNewParticipant ? values.tempKategori : null,
          temp_gender: values.isNewParticipant ? values.tempGender : null,
          timestamp: timestamp,
        }

        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .insert(insertPayload)
          .select()
          .single()

        if (attendanceError) throw attendanceError

        // If new participant, create pending participant in Supabase
        if (values.isNewParticipant && values.tempName && values.tempKelompok && values.tempGender && values.tempKategori) {
          const pendingPayload = {
            name: values.tempName,
            suggested_group: values.tempKelompok,
            suggested_gender: values.tempGender,
            suggested_category: values.tempKategori,
            attendance_ref_ids: [attendanceData.id],
            status: 'pending',
          }

          const { error: pendingError } = await supabase
            .from('pending_participants')
            .insert(pendingPayload)

          if (pendingError) {
            // Don't fail the whole operation, just log it
            // eslint-disable-next-line no-console
            console.error('Error creating pending participant:', pendingError)
          }
        }

        toast.success('Absensi berhasil dicatat')
      }

      // Track attendance submission with form details
      analytics.submitAttendance({
        status: values.status,
        formId: values.formId || 'unknown',
        formTitle: 'Attendance Record',
        isNewParticipant: values.isNewParticipant,
        kelompok: values.isNewParticipant ? values.tempKelompok : selectedParticipant?.kelompok,
        kategori: values.isNewParticipant ? values.tempKategori : selectedParticipant?.kategori,
        participantCount: 1, // Single attendance record per submission
      })

      refreshData()
      form.reset()
      setShowNewParticipantForm(false)
      onOpenChange(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving attendance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Track failed attendance submission
      analytics.submitAttendanceFailed(
        errorMessage,
        values.status,
        'Attendance Record'
      )
      
      toast.error('Gagal menyimpan absensi: ' + errorMessage)
    } finally {
      setIsSubmitting(false)
    }
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
            <FormField
              control={form.control}
              name='date'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Tanggal Absensi</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value}
                      onSelect={field.onChange}
                      placeholder='Pilih tanggal...'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='formId'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Pilih Kegiatan (Opsional)</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value || undefined}
                    onValueChange={field.onChange}
                    placeholder='Pilih kegiatan/form...'
                    items={activeForms.map((f) => ({
                      label: `${f.title} (${new Date(f.date).toLocaleDateString('id-ID')})`,
                      value: f.id,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

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
                                      {participant.kelompok} - {participant.kategori === 'A' ? 'GPN A' : participant.kategori === 'B' ? 'GPN B' : `Kategori ${participant.kategori}`}
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
                          items={KATEGORI.map((k) => ({
                            label: k === 'A' ? 'GPN A' : k === 'B' ? 'GPN B' : 'AR',
                            value: k,
                          }))}
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
          <Button type='submit' form='attendance-form' disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
