import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  getPermissions,
  ROLE_LABELS,
  type PermissionKey,
  type Role,
} from '@/lib/rbac'
import { KELOMPOK } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
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

const ASSIGNABLE_ROLES = ['admin', 'team_manager', 'member'] as const

const PERMISSION_KEYS: PermissionKey[] = [
  'manageUsers',
  'viewUsers',
  'createParticipant',
  'editParticipant',
  'deleteParticipant',
  'createForm',
  'editForm',
  'deleteForm',
  'approveParticipant',
  'createAttendance',
  'editAttendance',
  'deleteAttendance',
]

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manageUsers: 'Kelola user & role',
  viewUsers: 'Lihat daftar user',
  createParticipant: 'Tambah peserta',
  editParticipant: 'Edit peserta',
  deleteParticipant: 'Hapus peserta',
  createForm: 'Buat form absensi',
  editForm: 'Edit form absensi',
  deleteForm: 'Hapus form absensi',
  approveParticipant: 'Setujui pendaftaran peserta',
  createAttendance: 'Input absensi',
  editAttendance: 'Edit absensi',
  deleteAttendance: 'Hapus absensi',
}

function isEscalation(current: Role | undefined, next: Role): boolean {
  if (!current || current === next) return false
  const c = getPermissions(current)
  const n = getPermissions(next)
  return PERMISSION_KEYS.some((k) => !c[k] && n[k])
}

function grantedPermissions(
  current: Role | undefined,
  next: Role
): PermissionKey[] {
  if (!current) return []
  const c = getPermissions(current)
  const n = getPermissions(next)
  return PERMISSION_KEYS.filter((k) => !c[k] && n[k])
}

function buildSchema(isEdit: boolean) {
  return z
    .object({
      full_name: z.string().min(1, 'Nama wajib diisi.'),
      email: isEdit
        ? z.string().optional()
        : z.string().email('Email tidak valid.'),
      password: isEdit
        ? z.string().optional()
        : z.string().min(7, 'Password minimal 7 karakter.'),
      role: z.enum(ASSIGNABLE_ROLES, { message: 'Role wajib dipilih.' }),
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
      // In edit mode, if password is provided it must be >= 7 chars
      if (isEdit && data.password && data.password.length > 0 && data.password.length < 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password minimal 7 karakter.',
          path: ['password'],
        })
      }
    })
}

type ManageRoleForm = z.infer<ReturnType<typeof buildSchema>>

type ManageRoleActionDialogProps = {
  currentRow?: ManagedUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StackedField({ children }: { children: React.ReactNode }) {
  return <FormItem className='flex flex-col gap-1.5 space-y-0'>{children}</FormItem>
}

export function ManageRoleActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ManageRoleActionDialogProps) {
  const isEdit = !!currentRow
  const { createUser, updateUser } = useManageRoleCRUD()

  // Map super_admin to admin for the form (super_admin can't be assigned via this form)
  const defaultRole =
    currentRow?.role === 'super_admin'
      ? ('admin' as const)
      : (currentRow?.role ?? ('member' as const))

  const form = useForm<ManageRoleForm>({
    resolver: zodResolver(buildSchema(isEdit)),
    defaultValues: {
      full_name: currentRow?.full_name ?? '',
      email: currentRow?.email ?? '',
      password: '',
      role: defaultRole,
      kelompok: currentRow?.kelompok ?? null,
    },
  })

  const watchedRole = form.watch('role')

  useEffect(() => {
    if (watchedRole !== 'team_manager') {
      form.setValue('kelompok', null)
    }
  }, [watchedRole, form])

  const [escalationConfirm, setEscalationConfirm] = useState<{
    newRole: Role
    granted: PermissionKey[]
  } | null>(null)

  const executeSubmit = async (values: ManageRoleForm) => {
    try {
      if (isEdit) {
        await updateUser(currentRow.id, {
          full_name: values.full_name,
          role: values.role,
          kelompok:
            values.role === 'team_manager' ? (values.kelompok ?? null) : null,
          ...(values.password ? { password: values.password } : {}),
        })
      } else {
        await createUser({
          email: values.email!,
          password: values.password!,
          full_name: values.full_name,
          role: values.role,
          kelompok:
            values.role === 'team_manager' ? (values.kelompok ?? null) : null,
        })
      }
      form.reset()
      onOpenChange(false)
    } catch {
      // Error is already handled by the mutation's onError
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (isEdit && currentRow && isEscalation(currentRow.role, values.role)) {
      setEscalationConfirm({
        newRole: values.role,
        granted: grantedPermissions(currentRow.role, values.role),
      })
      return
    }
    void executeSubmit(values)
  })

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
            onSubmit={onSubmit}
            className='p-0.5'
          >
            <div className='flex flex-col gap-5'>
              <section className='flex flex-col gap-3'>
                <div className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
                  Identitas
                </div>
                <FormField
                  control={form.control}
                  name='full_name'
                  render={({ field }) => (
                    <StackedField>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Masukkan nama lengkap'
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </StackedField>
                  )}
                />
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <StackedField>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder='email@example.com'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </StackedField>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <StackedField>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={
                            isEdit
                              ? 'Kosongkan jika tidak diubah'
                              : 'Min. 7 karakter'
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </StackedField>
                  )}
                />
              </section>

              <section className='flex flex-col gap-3'>
                <div className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
                  Akses
                </div>
                <FormField
                  control={form.control}
                  name='role'
                  render={({ field }) => (
                    <StackedField>
                      <FormLabel>Role</FormLabel>
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        placeholder='Pilih role'
                        items={[
                          { label: 'Admin', value: 'admin' },
                          { label: 'Team Manager', value: 'team_manager' },
                          { label: 'Member', value: 'member' },
                        ]}
                      />
                      <FormMessage />
                    </StackedField>
                  )}
                />
                {watchedRole === 'team_manager' && (
                  <FormField
                    control={form.control}
                    name='kelompok'
                    render={({ field }) => (
                      <StackedField>
                        <FormLabel>Kelompok</FormLabel>
                        <SelectDropdown
                          defaultValue={field.value ?? ''}
                          onValueChange={field.onChange}
                          placeholder='Pilih kelompok'
                          items={KELOMPOK.map((k) => ({ label: k, value: k }))}
                        />
                        <FormMessage />
                      </StackedField>
                    )}
                  />
                )}
              </section>
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='manage-role-form'
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              isEdit ? 'Simpan' : 'Buat User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={!!escalationConfirm}
        onOpenChange={(isOpen) => !isOpen && setEscalationConfirm(null)}
        title='Eskalasi role: tindakan berdampak'
        desc={
          escalationConfirm && currentRow ? (
            <div className='flex flex-col gap-3'>
              <p>
                Role <strong>{ROLE_LABELS[currentRow.role]}</strong> akan diubah
                ke <strong>{ROLE_LABELS[escalationConfirm.newRole]}</strong>.
                User akan mendapat {escalationConfirm.granted.length} izin
                baru:
              </p>
              <ul className='bg-muted/40 rounded-md p-3 text-sm'>
                {escalationConfirm.granted.map((k) => (
                  <li key={k} className='flex items-center gap-2 py-0.5'>
                    <span className='text-foreground'>+</span>
                    <span>{PERMISSION_LABELS[k]}</span>
                  </li>
                ))}
              </ul>
              <p className='text-muted-foreground text-xs'>
                Pastikan user memang berhak menerima izin ini.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText='Ya, eskalasi role'
        cancelBtnText='Batal'
        handleConfirm={() => {
          if (escalationConfirm) {
            void executeSubmit(form.getValues())
            setEscalationConfirm(null)
          }
        }}
      />
    </Dialog>
  )
}
