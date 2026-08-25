import React, { useMemo, useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type ManagedUser } from '../types'

type ManageRoleDialogType = 'add' | 'edit' | 'delete'

type ManageRoleContextType = {
  open: ManageRoleDialogType | null
  setOpen: (str: ManageRoleDialogType | null) => void
  currentRow: ManagedUser | null
  setCurrentRow: React.Dispatch<React.SetStateAction<ManagedUser | null>>
}

const ManageRoleContext = React.createContext<ManageRoleContextType | null>(
  null
)

export function ManageRoleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<ManageRoleDialogType>(null)
  const [currentRow, setCurrentRow] = useState<ManagedUser | null>(null)
  const contextValue = useMemo(
    () => ({ open, setOpen, currentRow, setCurrentRow }),
    [open, setOpen, currentRow]
  )

  return (
    <ManageRoleContext value={contextValue}>
      {children}
    </ManageRoleContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useManageRole = () => {
  const manageRoleContext = React.useContext(ManageRoleContext)

  if (!manageRoleContext) {
    throw new Error('useManageRole has to be used within <ManageRoleContext>')
  }

  return manageRoleContext
}
