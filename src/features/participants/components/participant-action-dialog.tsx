'use client'

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
import { SelectDropdown } from '@/components/select-dropdown'
import { type Participant, KELOMPOK, KATEGORI, GENDER, PARTICIPANT_STATUS } from '@/lib/schema'
import { useParticipantsCRUD } from '../context/participants-context'

const formSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.'),
  kelompok: z.enum(KELOMPOK, { message: 'Kelompok wajib dipilih.' }),
  kategori: z.enum(KATEGORI, { message: 'Kategori wajib dipilih.' }),
  gender: z.enum(GENDER, { message: 'Jenis kelamin wajib dipilih.' }),
  status: z.enum(PARTICIPANT_STATUS),
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

  const form = useForm<ParticipantForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: currentRow?.name ?? '',
      kelompok: currentRow?.kelompok ?? 'BIG 1',
      kategori: currentRow?.kategori ?? 'A',
      gender: currentRow?.gender ?? 'L',
      status: currentRow?.status ?? 'active',
    },
  })

  const onSubmit = async (values: ParticipantForm) => {
    try {
      if (isEdit) {
        await updateParticipant(currentRow.id, values)
      } else {
        await createParticipant(values)
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
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih kelompok'
                    className='col-span-4'
                    items={KELOMPOK.map((k) => ({ label: k, value: k }))}
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
                    items={KATEGORI.map((k) => ({ label: `GPN ${k}`, value: k }))}
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
          <Button type='submit' form='participant-form'>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
