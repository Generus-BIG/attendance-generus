'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { DatePicker } from '@/components/date-picker'
import { SelectDropdown } from '@/components/select-dropdown'
import { type Participant, KELOMPOK, KATEGORI, GENDER, PARTICIPANT_STATUS } from '@/lib/schema'
import { useAuthStore } from '@/stores/auth-store'
import { useParticipantsCRUD } from '../context/participants-context'

const formSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.'),
  kelompok: z.enum(KELOMPOK, { message: 'Kelompok wajib dipilih.' }),
  kategori: z.enum(KATEGORI, { message: 'Kategori wajib dipilih.' }),
  gender: z.enum(GENDER, { message: 'Jenis kelamin wajib dipilih.' }),
  status: z.enum(PARTICIPANT_STATUS),
  birthPlace: z.string().trim().max(100, 'Maksimal 100 karakter').optional().nullable(),
  birthDate: z
    .date()
    .refine((d) => d <= new Date(), {
      message: 'Tanggal lahir tidak boleh di masa depan',
    })
    .optional()
    .nullable(),
})

type ParticipantForm = z.infer<typeof formSchema>

type ParticipantActionDialogProps = {
  currentRow?: Participant
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ParticipantActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ParticipantActionDialogProps) {
  const isEdit = !!currentRow
  const { createParticipant, updateParticipant } = useParticipantsCRUD()
  const role = useAuthStore((s) => s.auth.role)
  const userKelompok = useAuthStore((s) => s.auth.kelompok)
  const isTeamManager = role === 'team_manager'
  const scopedKelompok = KELOMPOK.find((kelompok) => kelompok === userKelompok)
  const kelompokOptions = isTeamManager
    ? scopedKelompok
      ? [scopedKelompok]
      : []
    : KELOMPOK
  const defaultKelompok = currentRow?.kelompok ?? scopedKelompok ?? 'BIG 1'

  const form = useForm<ParticipantForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentRow?.name ?? '',
      kelompok: defaultKelompok,
      kategori: currentRow?.kategori ?? 'A',
      gender: currentRow?.gender ?? 'L',
      status: currentRow?.status ?? 'active',
      birthPlace: currentRow?.birthPlace ?? '',
      birthDate: currentRow?.birthDate ?? null,
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      name: currentRow?.name ?? '',
      kelompok: defaultKelompok,
      kategori: currentRow?.kategori ?? 'A',
      gender: currentRow?.gender ?? 'L',
      status: currentRow?.status ?? 'active',
      birthPlace: currentRow?.birthPlace ?? '',
      birthDate: currentRow?.birthDate ?? null,
    })
  }, [
    open,
    form,
    currentRow?.name,
    currentRow?.kategori,
    currentRow?.gender,
    currentRow?.status,
    currentRow?.birthPlace,
    currentRow?.birthDate,
    defaultKelompok,
  ])

  const onSubmit = async (values: ParticipantForm) => {
    let submittedValues: ParticipantForm = values

    if (isTeamManager) {
      if (!scopedKelompok) return
      submittedValues = { ...values, kelompok: scopedKelompok }
    }

    try {
      if (isEdit) {
        await updateParticipant(currentRow.id, submittedValues)
      } else {
        await createParticipant(submittedValues)
      }
      form.reset()
      onOpenChange(false)
    } catch {
      // Error is already handled by the mutation's onError
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>{isEdit ? 'Edit Peserta' : 'Tambah Peserta'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui informasi peserta yang sudah ada.'
              : 'Tambahkan peserta baru ke dalam sistem.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='participant-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 p-0.5'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Nama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama peserta'
                      className='col-span-4'
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='kelompok'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Kelompok</FormLabel>
                  <SelectDropdown
                    isControlled
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih kelompok'
                    className='col-span-4'
                    items={kelompokOptions.map((k) => ({ label: k, value: k }))}
                    disabled={isTeamManager && !scopedKelompok}
                  />
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='kategori'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Kategori</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih kategori'
                    className='col-span-4'
                    items={KATEGORI.map((k) => ({
                      label: k === 'AR' || k === 'APR' ? k : `GPN ${k}`,
                      value: k,
                    }))}
                  />
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='gender'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Jenis Kelamin</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih jenis kelamin'
                    className='col-span-4'
                    items={[
                      { label: 'Laki-laki', value: 'L' },
                      { label: 'Perempuan', value: 'P' },
                    ]}
                  />
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='birthPlace'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Tempat Lahir</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan tempat lahir (opsional)'
                      className='col-span-4'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='birthDate'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                  <FormLabel className='col-span-2 text-right'>Tanggal Lahir</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value ?? undefined}
                      onSelect={(d) => field.onChange(d ?? null)}
                      placeholder='Pilih tanggal lahir'
                      className='col-span-4 w-full'
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
                    <FormLabel className='col-span-2 text-right'>Status</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Pilih status'
                      className='col-span-4'
                      items={[
                        { label: 'Aktif', value: 'active' },
                        { label: 'Nonaktif', value: 'inactive' },
                      ]}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='participant-form' disabled={isTeamManager && !scopedKelompok}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
