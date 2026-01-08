import { AttendanceActionDialog } from './attendance-action-dialog'
import { AttendanceDeleteDialog } from './attendance-delete-dialog'
import { AttendanceEditDateDialog } from './attendance-edit-date-dialog'
import { useAttendance } from './attendance-provider'

export function AttendanceDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAttendance()

  return (
    <>
      <AttendanceActionDialog
        key='attendance-add'
        open={open === 'add'}
        onOpenChange={(nextOpen) => setOpen(nextOpen ? 'add' : null)}
      />

      {currentRow && (
        <>
          <AttendanceEditDateDialog
            key={`attendance-edit-date-${currentRow.id}`}
            open={open === 'edit-date'}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen ? 'edit-date' : null)
              if (!nextOpen) {
                setTimeout(() => {
                  setCurrentRow(null)
                }, 500)
              }
            }}
            currentRow={currentRow}
          />

          <AttendanceDeleteDialog
            key={`attendance-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen ? 'delete' : null)
              if (!nextOpen) {
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
