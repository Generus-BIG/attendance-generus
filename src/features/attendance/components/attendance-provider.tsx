import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Attendance } from '@/lib/schema'

type AttendanceDialogType = 'add' | 'edit' | 'edit-date' | 'delete'

type AttendanceContextType = {
  open: AttendanceDialogType | null
  setOpen: (str: AttendanceDialogType | null) => void
  currentRow: Attendance | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Attendance | null>>
  refreshData: () => void
  setRefreshData: React.Dispatch<React.SetStateAction<() => void>>
}

const AttendanceContext = React.createContext<AttendanceContextType | null>(null)

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<AttendanceDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Attendance | null>(null)
  const [refreshData, setRefreshData] = useState<() => void>(() => () => {})

  return (
    <AttendanceContext value={{ open, setOpen, currentRow, setCurrentRow, refreshData, setRefreshData }}>
      {children}
    </AttendanceContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAttendance = () => {
  const attendanceContext = React.useContext(AttendanceContext)

  if (!attendanceContext) {
    throw new Error('useAttendance has to be used within <AttendanceContext>')
  }

  return attendanceContext
}
