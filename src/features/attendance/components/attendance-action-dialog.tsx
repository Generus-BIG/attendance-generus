'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Search, UserPlus } from 'lucide-react'
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
import { MultiParticipantInput } from './multi-participant-input'

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
  participantIds: z.array(z.string()).optional(),
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
  const [participantQuery, setParticipantQuery] = useState('')
  const participantSearchRef = useRef<HTMLInputElement>(null)

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
          participantIds: currentRow.participantId ? [currentRow.participantId] : [],
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
          participantIds: [],
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
      // Ensure date is a Date object
      const editDate = currentRow.date instanceof Date ? currentRow.date : new Date(currentRow.date)

      const editParticipantId =
        currentRow.participantId ??
        // Some table rows may include joined participant without mapping participantId
        (currentRow as unknown as { participant?: { id?: string } }).participant?.id ??
        null
      
      form.reset({
        participantId: editParticipantId,
        participantIds: editParticipantId ? [editParticipantId] : [],
        formId: currentRow.formId || null,
        date: editDate,
        status: currentRow.status,
        permissionReason: currentRow.permissionReason,
        notes: currentRow.notes,
        isNewParticipant: !!currentRow.tempName, // If tempName exists, it's a new participant
        tempName: currentRow.tempName,
        tempKelompok: currentRow.tempKelompok,
        tempKategori: currentRow.tempKategori,
        tempGender: currentRow.tempGender,
      })

      // Set new participant form deterministically based on the row being edited
      setShowNewParticipantForm(!!currentRow.tempName)
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
        const fallbackParticipantId =
          values.participantId ??
          currentRow.participantId ??
          (currentRow as unknown as { participant?: { id?: string } }).participant?.id ??
          null

        const fallbackFormId = values.formId ?? currentRow.formId ?? null

        // If this record is actually a pending/new participant row, keep it that way
        const effectiveIsNewParticipant =
          values.isNewParticipant || (!!currentRow.tempName && !fallbackParticipantId)

        // Update existing attendance record in Supabase
        const updatePayload = {
          participant_id: effectiveIsNewParticipant ? null : fallbackParticipantId,
          form_id: fallbackFormId,
          status: values.status.toUpperCase(),
          permission_reason: values.status === 'izin' ? values.permissionReason : null,
          permission_description: values.status === 'izin' ? values.notes : null,
          temp_name: effectiveIsNewParticipant ? values.tempName ?? currentRow.tempName : null,
          temp_group: effectiveIsNewParticipant ? values.tempKelompok ?? currentRow.tempKelompok : null,
          temp_category: effectiveIsNewParticipant ? values.tempKategori ?? currentRow.tempKategori : null,
          temp_gender: effectiveIsNewParticipant ? values.tempGender ?? currentRow.tempGender : null,
          timestamp: timestamp,
        }

        const { error } = await supabase
          .from('attendance')
          .update(updatePayload)
          .eq('id', currentRow.id)

        if (error) throw error
        toast.success('Data absensi berhasil diperbarui')
      } else {
        if (!values.isNewParticipant && (!values.participantIds || values.participantIds.length === 0)) {
          form.setError('participantIds', {
            type: 'manual',
            message: 'Pilih minimal satu peserta',
          })
          setIsSubmitting(false)
          return
        }

        // Create new attendance record in Supabase
        let attendanceData: { id: string } | null = null
        if (values.isNewParticipant) {
          const insertPayload = {
            participant_id: null,
            form_id: values.formId || null, // Link to selected form/event
            status: values.status.toUpperCase(),
            permission_reason: values.status === 'izin' ? values.permissionReason : null,
            permission_description: values.status === 'izin' ? values.notes : null,
            temp_name: values.tempName,
            temp_group: values.tempKelompok,
            temp_category: values.tempKategori,
            temp_gender: values.tempGender,
            timestamp: timestamp,
          }

          const { data: insertedAttendance, error: attendanceError } = await supabase
            .from('attendance')
            .insert(insertPayload)
            .select()
            .single()

          if (attendanceError) throw attendanceError
          attendanceData = insertedAttendance
        } else {
          const insertPayloads = (values.participantIds || []).map((participantId) => ({
            participant_id: participantId,
            form_id: values.formId || null,
            status: values.status.toUpperCase(),
            permission_reason: values.status === 'izin' ? values.permissionReason : null,
            permission_description: values.status === 'izin' ? values.notes : null,
            temp_name: null,
            temp_group: null,
            temp_category: null,
            temp_gender: null,
            timestamp: timestamp,
          }))

          const { error: attendanceError } = await supabase
            .from('attendance')
            .insert(insertPayloads)

          if (attendanceError) throw attendanceError
        }

        // If new participant, create pending participant in Supabase
        if (values.isNewParticipant && values.tempName && values.tempKelompok && values.tempGender && values.tempKategori && attendanceData?.id) {
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
      const participantIds = values.isNewParticipant
        ? []
        : (values.participantIds || [])
      const selectedParticipants = participants.filter((p) => participantIds.includes(p.id))
      const selectedParticipantSummary = selectedParticipants.length === 1 ? selectedParticipants[0] : null

      analytics.submitAttendance({
        status: values.status,
        formId: values.formId || 'unknown',
        formTitle: 'Attendance Record',
        isNewParticipant: values.isNewParticipant,
        kelompok: values.isNewParticipant ? values.tempKelompok : selectedParticipantSummary?.kelompok,
        kategori: values.isNewParticipant ? values.tempKategori : selectedParticipantSummary?.kategori,
        participantCount: values.isNewParticipant ? 1 : participantIds.length || 1,
      })

      refreshData()
      form.reset()
      setShowNewParticipantForm(false)
      form.setValue('participantIds', [])
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
  const filteredParticipants = useMemo(() => {
    const query = participantQuery.trim().toLowerCase()
    if (!query) return participants
    return participants.filter((participant) => {
      const haystack = `${participant.name} ${participant.kelompok} ${participant.kategori}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [participants, participantQuery])

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        // Only reset on close to avoid wiping values unexpectedly
        if (!state) {
          form.reset()
          setShowNewParticipantForm(false)
        }
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
                    isControlled
                    value={field.value || undefined}
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
              isEdit ? (
                <FormField
                  control={form.control}
                  name='participantId'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>Nama Peserta</FormLabel>
                      <Popover
                        open={openCombobox}
                        onOpenChange={(nextOpen) => {
                          setOpenCombobox(nextOpen)
                          if (nextOpen) {
                            queueMicrotask(() => participantSearchRef.current?.focus())
                          } else {
                            setParticipantQuery('')
                          }
                        }}
                      >
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
                          <div className='flex h-10 items-center gap-2 border-b px-3'>
                            <Search className='size-4 shrink-0 opacity-50' />
                            <Input
                              ref={participantSearchRef}
                              value={participantQuery}
                              onChange={(event) => setParticipantQuery(event.target.value)}
                              placeholder='Cari nama peserta...'
                              className='h-8 border-0 px-0 shadow-none focus-visible:ring-0'
                            />
                          </div>
                          <div
                            className='touch-pan-y overscroll-contain p-1'
                            style={{
                              maxHeight: '16rem',
                              overflowY: 'auto',
                              WebkitOverflowScrolling: 'touch',
                            }}
                            role='listbox'
                          >
                            {filteredParticipants.length === 0 ? (
                              <div className='flex flex-col items-center gap-2 py-4'>
                                <span className='text-sm text-muted-foreground'>
                                  Peserta tidak ditemukan
                                </span>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    setShowNewParticipantForm(true)
                                    form.setValue('isNewParticipant', true)
                                    form.setValue('participantIds', [])
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <UserPlus className='mr-2 h-4 w-4' />
                                  Ajukan Peserta Baru
                                </Button>
                              </div>
                            ) : (
                              filteredParticipants.map((participant) => (
                                <button
                                  key={participant.id}
                                  type='button'
                                  role='option'
                                  aria-selected={field.value === participant.id}
                                  onClick={() => {
                                    form.setValue('participantId', participant.id)
                                    form.setValue('isNewParticipant', false)
                                    setOpenCombobox(false)
                                  }}
                                  className={cn(
                                    'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none',
                                    'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground'
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      'mt-0.5 h-4 w-4',
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
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name='participantIds'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>Nama Peserta</FormLabel>
                      <FormControl>
                        <MultiParticipantInput
                          participants={participants}
                          value={field.value || []}
                          onChange={(nextValue) => {
                            field.onChange(nextValue)
                            form.setValue('isNewParticipant', false)
                          }}
                          placeholder='Pilih peserta...'
                        />
                      </FormControl>
                      <FormMessage />
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='mt-2 w-fit'
                        onClick={() => {
                          setShowNewParticipantForm(true)
                          form.setValue('isNewParticipant', true)
                          form.setValue('participantIds', [])
                        }}
                      >
                        <UserPlus className='mr-2 h-4 w-4' />
                        Ajukan Peserta Baru
                      </Button>
                    </FormItem>
                  )}
                />
              )
            ) : (
              <>
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
                    name='tempGender'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Kelamin</FormLabel>
                        <SelectDropdown
                          isControlled
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          placeholder='Pilih'
                          items={[
                            { label: 'Laki-laki', value: 'L' },
                            { label: 'Perempuan', value: 'P' },
                          ]}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='tempKelompok'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kelompok</FormLabel>
                        <SelectDropdown
                          isControlled
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                          placeholder='Pilih kelompok'
                          items={KELOMPOK.map((k) => ({ label: k, value: k }))}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name='tempKategori'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <SelectDropdown
                        isControlled
                        value={field.value || undefined}
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
