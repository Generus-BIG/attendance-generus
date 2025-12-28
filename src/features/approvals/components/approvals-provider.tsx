import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type PendingParticipant, type Attendance } from '@/lib/schema'

type ApprovalsDialogType = 'approve' | 'reject' | 'link'

type ApprovalsContextType = {
  open: ApprovalsDialogType | null
  setOpen: (str: ApprovalsDialogType | null) => void
  currentPending: PendingParticipant | null
  setCurrentPending: React.Dispatch<React.SetStateAction<PendingParticipant | null>>
  currentAttendance: Attendance | null
  setCurrentAttendance: React.Dispatch<React.SetStateAction<Attendance | null>>
  refreshData: () => void
  setRefreshData: React.Dispatch<React.SetStateAction<() => void>>
}

const ApprovalsContext = React.createContext<ApprovalsContextType | null>(null)

export function ApprovalsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<ApprovalsDialogType>(null)
  const [currentPending, setCurrentPending] = useState<PendingParticipant | null>(null)
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null)
  const [refreshData, setRefreshData] = useState<() => void>(() => () => {})

  return (
    <ApprovalsContext value={{
      open,
      setOpen,
      currentPending,
      setCurrentPending,
      currentAttendance,
      setCurrentAttendance,
      refreshData,
      setRefreshData
    }}>
      {children}
    </ApprovalsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApprovals = () => {
  const approvalsContext = React.useContext(ApprovalsContext)

  if (!approvalsContext) {
    throw new Error('useApprovals has to be used within <ApprovalsContext>')
  }

  return approvalsContext
}
