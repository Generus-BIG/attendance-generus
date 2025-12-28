import { AttendanceActionDialog } from './attendance-action-dialog'
import { AttendanceDeleteDialog } from './attendance-delete-dialog'
import { useAttendance } from './attendance-provider'

export function AttendanceDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAttendance()

  return (
    <>
      <AttendanceActionDialog
        key='attendance-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <AttendanceActionDialog
            key={`attendance-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <AttendanceDeleteDialog
            key={`attendance-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
