import { type Role } from '@/lib/rbac'
import { supabase } from '@/lib/supabase'
import { type ManagedUser } from './types'

async function callEdgeFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body,
  })
  if (error) throw error
  return data as T
}

export async function listUsers(): Promise<ManagedUser[]> {
  const result = await callEdgeFunction<{ users: ManagedUser[] }>({
    action: 'list',
  })
  return result.users
}

export async function createUser(params: {
  email: string
  password: string
  full_name: string
  role: Role
  kelompok?: string | null
}): Promise<ManagedUser> {
  const result = await callEdgeFunction<{ user: ManagedUser }>({
    action: 'create',
    ...params,
  })
  return result.user
}

export async function updateUser(
  userId: string,
  fields: {
    email?: string
    full_name?: string
    role?: Role
    kelompok?: string | null
    password?: string
  }
): Promise<ManagedUser> {
  const result = await callEdgeFunction<{ user: ManagedUser }>({
    action: 'update',
    user_id: userId,
    update_fields: fields,
  })
  return result.user
}

export async function deleteUser(userId: string): Promise<void> {
  await callEdgeFunction<{ success: boolean }>({
    action: 'delete',
    user_id: userId,
  })
}

export async function changePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await callEdgeFunction<{ success: boolean }>({
    action: 'change_password',
    user_id: userId,
    new_password: newPassword,
  })
}
