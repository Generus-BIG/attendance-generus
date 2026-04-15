import { ConfirmDialog } from '@/components/confirm-dialog'
import { useManageRoleCRUD } from '../context/manage-role-context'
import { type ManagedUser } from '../types'

type ManageRoleDeleteDialogProps = {
  currentRow: ManagedUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageRoleDeleteDialog({
  currentRow,
  open,
  onOpenChange,
}: ManageRoleDeleteDialogProps) {
  const { deleteUser } = useManageRoleCRUD()

  const handleDelete = async () => {
    try {
      await deleteUser(currentRow.id)
      onOpenChange(false)
    } catch {
      // Error is already handled by the mutation's onError
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      title={
        <span className='text-destructive'>
          Hapus User{' '}
          <span className='font-semibold text-primary'>
            {currentRow.full_name ?? currentRow.email}
          </span>
          ?
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Anda yakin ingin menghapus user ini? Data yang sudah dihapus tidak
            dapat dikembalikan.
          </p>
          <ul className='list-disc ps-4 text-sm text-muted-foreground'>
            <li>
              Nama:{' '}
              <span className='font-semibold'>
                {currentRow.full_name ?? '-'}
              </span>
            </li>
            <li>
              Email: <span className='font-semibold'>{currentRow.email}</span>
            </li>
            <li>
              Role: <span className='font-semibold'>{currentRow.role}</span>
            </li>
          </ul>
        </div>
      }
      confirmText='Hapus'
      destructive
    />
  )
}
