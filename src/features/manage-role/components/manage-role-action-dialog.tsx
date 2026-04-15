import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ROLES } from '@/lib/rbac'
import { KELOMPOK } from '@/lib/schema'
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
import { useManageRoleCRUD } from '../context/manage-role-context'
import { type ManagedUser } from '../types'

const formSchema = z
  .object({
    full_name: z.string().min(1, 'Nama wajib diisi.'),
    email: z.string().email('Email tidak valid.'),
    password: z.string().min(7, 'Password minimal 7 karakter.'),
    role: z.enum(ROLES, { message: 'Role wajib dipilih.' }),
    kelompok: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'team_manager' && !data.kelompok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Kelompok wajib dipilih untuk Team Manager.',
        path: ['kelompok'],
      })
    }
  })

type ManageRoleForm = z.infer<typeof formSchema>

type ManageRoleActionDialogProps = {
  currentRow?: ManagedUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageRoleActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ManageRoleActionDialogProps) {
  const isEdit = !!currentRow
  const { createUser, updateUser } = useManageRoleCRUD()

  const form = useForm<ManageRoleForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: currentRow?.full_name ?? '',
      email: currentRow?.email ?? '',
      password: '',
      role: currentRow?.role ?? 'member',
      kelompok: currentRow?.kelompok ?? null,
    },
  })

  const watchedRole = form.watch('role')

  useEffect(() => {
    if (watchedRole !== 'team_manager') {
      form.setValue('kelompok', null)
    }
  }, [watchedRole, form])

  const onSubmit = async (values: ManageRoleForm) => {
    try {
      if (isEdit) {
        await updateUser(currentRow.id, {
          full_name: values.full_name,
          role: values.role,
          kelompok: values.role === 'team_manager' ? values.kelompok : null,
        })
      } else {
        await createUser({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role,
          kelompok: values.role === 'team_manager' ? values.kelompok : null,
        })
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
          <DialogTitle>{isEdit ? 'Edit User' : 'Buat User Baru'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui informasi user yang sudah ada.'
              : 'Buat akun user baru untuk sistem.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='manage-role-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 p-0.5'
          >
            <FormField
              control={form.control}
              name='full_name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-right'>Nama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama lengkap'
                      className='col-span-4'
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            {!isEdit && (
              <>
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-right'>
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='email@example.com'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-right'>
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder='Min. 7 karakter'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-right'>Role</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Pilih role'
                    className='col-span-4'
                    items={[
                      { label: 'Admin', value: 'admin' },
                      { label: 'Team Manager', value: 'team_manager' },
                      { label: 'Member', value: 'member' },
                    ]}
                  />
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            {watchedRole === 'team_manager' && (
              <FormField
                control={form.control}
                name='kelompok'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>
                      Kelompok
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder='Pilih kelompok'
                      className='col-span-4'
                      items={KELOMPOK.map((k) => ({ label: k, value: k }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='manage-role-form'>
            {isEdit ? 'Simpan' : 'Buat User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
