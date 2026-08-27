import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AttendanceFormConfig } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { slugify, cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { kategoriOptions } from '../../participants/data/data'
import { useFormsContext } from '../context/forms-context'
import { FormTypeSelector } from './form-type-selector'

// Zod schema for the form creation/editing
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  slug: z.string().min(1, 'Slug is required'),
  isActive: z.boolean(),
  allowedCategories: z.array(z.string()).min(1, 'Select at least one category'),
  formType: z.enum(['desa', 'kelompok']),
  kelompokId: z.string().uuid().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface FormDialogsProps {
  open: boolean
  setOpen: (open: boolean) => void
  formToEdit?: AttendanceFormConfig
}

export function FormDialogs({ open, setOpen, formToEdit }: FormDialogsProps) {
  const { createForm, updateForm } = useFormsContext()
  const { role, kelompok: userKelompok } = usePermissions()
  const isEditing = !!formToEdit
  const isTeamManager = role === 'team_manager'

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      slug: '',
      isActive: true,
      allowedCategories: ['A', 'B', 'AR'],
      formType: 'desa',
      kelompokId: null,
    },
  })

  // Reset or populate form when opening/editing
  useEffect(() => {
    if (open) {
      if (formToEdit) {
        const dateObj = new Date(formToEdit.date)
        form.reset({
          title: formToEdit.title,
          description: formToEdit.description || '',
          date: dateObj.toISOString().split('T')[0],
          time: dateObj.toTimeString().slice(0, 5),
          slug: formToEdit.slug,
          isActive: formToEdit.isActive,
          allowedCategories: formToEdit.allowedCategories || ['A', 'B', 'AR'],
          formType: formToEdit.formType ?? 'desa',
          kelompokId: formToEdit.kelompokId ?? null,
        })
      } else {
        form.reset({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          slug: '',
          isActive: true,
          allowedCategories: ['A', 'B', 'AR'],
          formType: 'desa',
          kelompokId: null,
        })
      }
    }
  }, [open, formToEdit, form])

  // Auto-generate slug from title if not editing
  const title = form.watch('title')
  useEffect(() => {
    if (!isEditing && title) {
      const slug = slugify(title)
      form.setValue('slug', slug, { shouldValidate: true })
    }
  }, [title, isEditing, form])

  const watchFormType = form.watch('formType')

  // Auto-set kelompokId for team_manager when type is 'kelompok'
  useEffect(() => {
    if (
      isTeamManager &&
      watchFormType === 'kelompok' &&
      userKelompok &&
      kelompokOptions.length > 0
    ) {
      const match = kelompokOptions.find((k) => k.value === userKelompok)
      if (match) {
        form.setValue('kelompokId', match.id)
      }
    }
  }, [isTeamManager, watchFormType, userKelompok, kelompokOptions, form])

  const onSubmit = async (values: FormValues) => {
    try {
      // Combine date and time
      const datetime = new Date(`${values.date}T${values.time}`)

      if (isEditing && formToEdit) {
        await updateForm({
          ...formToEdit,
          title: values.title,
          description: values.description,
          date: datetime,
          slug: values.slug,
          isActive: values.isActive,
          allowedCategories: values.allowedCategories as (
            | 'A'
            | 'B'
            | 'AR'
            | 'APR'
          )[],
          formType: values.formType,
          kelompokId: values.formType === 'kelompok' ? values.kelompokId : null,
        })
        toast.success('Form updated successfully')
      } else {
        await createForm({
          title: values.title,
          description: values.description,
          date: datetime,
          slug: values.slug,
          isActive: values.isActive,
          allowedCategories: values.allowedCategories as (
            | 'A'
            | 'B'
            | 'AR'
            | 'APR'
          )[],
          formType: values.formType,
          kelompokId: values.formType === 'kelompok' ? values.kelompokId : null,
        })
        toast.success('Form created successfully')
      }
      setOpen(false)
    } catch (_error) {
      toast.error('Failed to save form')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Form' : 'Buat Form Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Perbarui detail formulir absensi.'
              : 'Buat formulir absensi baru untuk dibagikan ke peserta.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            {/* Row 1: Form Type + Kelompok (side by side on desktop) */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='formType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Form</FormLabel>
                    <FormControl>
                      <FormTypeSelector
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val)
                          if (val === 'desa') {
                            form.setValue('kelompokId', null)
                          }
                        }}
                        disabled={isTeamManager}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchFormType === 'kelompok' && (
                <FormField
                  control={form.control}
                  name='kelompokId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelompok</FormLabel>
                      <div className='rounded-lg border p-3'>
                        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                          {kelompokOptions.map((k) => {
                            const isSelected = field.value === k.id
                            const isDisabled =
                              isTeamManager && k.value !== userKelompok
                            return (
                              <button
                                key={k.id}
                                type='button'
                                disabled={isDisabled}
                                onClick={() => field.onChange(k.id)}
                                className={cn(
                                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background hover:bg-muted',
                                  isDisabled && 'cursor-not-allowed opacity-40'
                                )}
                              >
                                {k.value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Row 2: Title + Slug (side by side) */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judul</FormLabel>
                    <FormControl>
                      <Input placeholder='Pertemuan Mingguan' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='slug'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder='pertemuan-mingguan' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Description (full width) */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Deskripsi singkat...'
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 4: Date + Time + Active (3 cols) */}
            <div className='grid gap-4 sm:grid-cols-3'>
              <FormField
                control={form.control}
                name='date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='time'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waktu</FormLabel>
                    <FormControl>
                      <Input type='time' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-end gap-3 space-y-0 pb-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className='leading-none'>
                      <FormLabel>Aktif</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 5: Kategori (inline) */}
            <FormField
              control={form.control}
              name='allowedCategories'
              render={() => (
                <FormItem>
                  <FormLabel>Sensus yang diikutsertakan</FormLabel>
                  <div className='flex flex-wrap gap-4 pt-1'>
                    {kategoriOptions.map((option) => (
                      <FormField
                        key={option.value}
                        control={form.control}
                        name='allowedCategories'
                        render={({ field }) => (
                          <FormItem
                            key={option.value}
                            className='flex flex-row items-center space-y-0 space-x-2'
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([
                                        ...field.value,
                                        option.value,
                                      ])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== option.value
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type='submit'>
                {isEditing ? 'Simpan Perubahan' : 'Buat Form'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
