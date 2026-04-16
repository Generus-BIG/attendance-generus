import { ManageRoleActionDialog } from './manage-role-action-dialog'
import { ManageRoleDeleteDialog } from './manage-role-delete-dialog'
import { useManageRole } from './manage-role-provider'

export function ManageRoleDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useManageRole()

  return (
    <>
      <ManageRoleActionDialog
        key='manage-role-add'
        open={open === 'add'}
        onOpenChange={(val) => setOpen(val ? 'add' : null)}
      />

      {currentRow && (
        <>
          <ManageRoleActionDialog
            key={`manage-role-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(val) => {
              setOpen(val ? 'edit' : null)
              if (!val) {
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              }
            }}
            currentRow={currentRow}
          />

          <ManageRoleDeleteDialog
            key={`manage-role-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(val) => {
              setOpen(val ? 'delete' : null)
              if (!val) {
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
