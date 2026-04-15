import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type Role } from '@/lib/rbac'
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from '../services'
import { type ManagedUser } from '../types'

interface ManageRoleCRUDContextType {
  users: ManagedUser[]
  isLoading: boolean
  createUser: (params: {
    email: string
    password: string
    full_name: string
    role: Role
    kelompok?: string | null
  }) => Promise<void>
  updateUser: (
    userId: string,
    fields: { full_name?: string; role?: Role; kelompok?: string | null }
  ) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  resetPassword: (userId: string, email: string) => Promise<void>
}

const ManageRoleCRUDContext = createContext<
  ManageRoleCRUDContextType | undefined
>(undefined)

export function ManageRoleCRUDProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['manage-role-users'],
    queryFn: listUsers,
    staleTime: 30000,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-role-users'] })
      toast.success('User berhasil dibuat')
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat user: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      fields,
    }: {
      userId: string
      fields: { full_name?: string; role?: Role; kelompok?: string | null }
    }) => updateUser(userId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-role-users'] })
      toast.success('User berhasil diperbarui')
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui user: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-role-users'] })
      toast.success('User berhasil dihapus')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus user: ${error.message}`)
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) =>
      resetPassword(userId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-role-users'] })
      toast.success('Password berhasil direset')
    },
    onError: (error: Error) => {
      toast.error(`Gagal mereset password: ${error.message}`)
    },
  })

  return (
    <ManageRoleCRUDContext.Provider
      value={{
        users,
        isLoading,
        createUser: async (params) => {
          await createMutation.mutateAsync(params)
        },
        updateUser: async (userId, fields) => {
          await updateMutation.mutateAsync({ userId, fields })
        },
        deleteUser: (userId) => deleteMutation.mutateAsync(userId),
        resetPassword: (userId, email) =>
          resetPasswordMutation.mutateAsync({ userId, email }),
      }}
    >
      {children}
    </ManageRoleCRUDContext.Provider>
  )
}

export function useManageRoleCRUD() {
  const context = useContext(ManageRoleCRUDContext)
  if (!context) {
    throw new Error(
      'useManageRoleCRUD must be used within a ManageRoleCRUDProvider'
    )
  }
  return context
}
