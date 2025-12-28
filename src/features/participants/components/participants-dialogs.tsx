import { ParticipantActionDialog } from './participant-action-dialog'
import { ParticipantDeleteDialog } from './participant-delete-dialog'
import { useParticipants } from './participants-provider'

export function ParticipantsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useParticipants()

  return (
    <>
      <ParticipantActionDialog
        key='participant-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <ParticipantActionDialog
            key={`participant-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ParticipantDeleteDialog
            key={`participant-delete-${currentRow.id}`}
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
