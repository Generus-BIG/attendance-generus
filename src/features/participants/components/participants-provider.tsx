import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Participant } from '@/lib/schema'

type ParticipantsDialogType = 'add' | 'edit' | 'delete'

type ParticipantsContextType = {
  open: ParticipantsDialogType | null
  setOpen: (str: ParticipantsDialogType | null) => void
  currentRow: Participant | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Participant | null>>
  refreshData: () => void
  setRefreshData: React.Dispatch<React.SetStateAction<() => void>>
}

const ParticipantsContext = React.createContext<ParticipantsContextType | null>(null)

export function ParticipantsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<ParticipantsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Participant | null>(null)
  const [refreshData, setRefreshData] = useState<() => void>(() => () => {})

  return (
    <ParticipantsContext value={{ open, setOpen, currentRow, setCurrentRow, refreshData, setRefreshData }}>
      {children}
    </ParticipantsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useParticipants = () => {
  const participantsContext = React.useContext(ParticipantsContext)

  if (!participantsContext) {
    throw new Error('useParticipants has to be used within <ParticipantsContext>')
  }

  return participantsContext
}
