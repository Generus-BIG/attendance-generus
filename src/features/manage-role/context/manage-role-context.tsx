import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type Role } from '@/lib/rbac'
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
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
    fields: {
      full_name?: string
      role?: Role
      kelompok?: string | null
      password?: string
    }
  ) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  changePassword: (userId: string, newPassword: string) => Promise<void>
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
      fields: {
        full_name?: string
        role?: Role
        kelompok?: string | null
        password?: string
      }
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

  const changePasswordMutation = useMutation({
    mutationFn: ({
      userId,
      newPassword,
    }: {
      userId: string
      newPassword: string
    }) => changePassword(userId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-role-users'] })
      toast.success('Password berhasil diubah')
    },
    onError: (error: Error) => {
      toast.error(`Gagal mengubah password: ${error.message}`)
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
        changePassword: (userId, newPassword) =>
          changePasswordMutation.mutateAsync({ userId, newPassword }),
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
