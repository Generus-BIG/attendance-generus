import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Assuming initialized client
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  attendanceFormConfigListSchema,
  type AttendanceFormConfig,
} from '@/lib/schema'
import { supabase } from '../../../lib/supabase'

interface FormsContextType {
  forms: AttendanceFormConfig[]
  isLoading: boolean
  createForm: (data: Partial<AttendanceFormConfig>) => Promise<void>
  updateForm: (data: AttendanceFormConfig) => Promise<void>
  deleteForm: (id: string) => Promise<void>
}

const FormsContext = createContext<FormsContextType | undefined>(undefined)

export function FormsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { role, kelompok } = useAuthStore((s) => s.auth)

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['attendance_forms', role, kelompok],
    queryFn: async () => {
      // Try with kelompok join first, fallback to plain select if FK doesn't exist yet
      let data: Record<string, unknown>[] | null = null

      const { data: joinData, error: joinError } = await supabase
        .from('attendance_forms')
        .select(
          '*, kelompok:lookup_values!attendance_forms_kelompok_id_fkey(value)'
        )
        .order('created_at', { ascending: false })

      if (joinError) {
        // FK might not exist yet (migration not run) — fallback to plain select
        const { data: plainData, error: plainError } = await supabase
          .from('attendance_forms')
          .select('*')
          .order('created_at', { ascending: false })

        if (plainError) {
          toast.error('Failed to fetch forms')
          throw plainError
        }
        data = plainData as Record<string, unknown>[]
      } else {
        data = joinData as Record<string, unknown>[]
      }

      // Apply RBAC filter for team_manager (client-side, RLS is server-side)
      let filtered = data ?? []
      if (role === 'team_manager' && kelompok) {
        const { data: lookupData } = await supabase
          .from('lookup_values')
          .select('id')
          .eq('type', 'GROUP')
          .eq('value', kelompok)
          .single()

        if (lookupData) {
          filtered = filtered.filter(
            (item) =>
              (item.form_type as string) === 'desa' ||
              (item.kelompok_id as string) === lookupData.id
          )
        } else {
          // Kelompok not found in lookup_values — restrict to desa forms only
          filtered = filtered.filter(
            (item) => (item.form_type as string) === 'desa'
          )
        }
      }

      // Map snake_case to camelCase
      const mapped = filtered.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        date: item.date,
        isActive: item.is_active,
        slug: item.slug,
        allowedCategories: (item.allowed_categories as string[]) || [
          'A',
          'B',
          'AR',
        ],
        formType: (item.form_type as string) ?? 'desa',
        kelompokId: (item.kelompok_id as string) ?? null,
        kelompokName:
          (item.kelompok as { value: string } | null)?.value ?? null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))

      return attendanceFormConfigListSchema.parse(mapped)
    },
  })

  const createFormMutation = useMutation({
    mutationFn: async (newForm: Partial<AttendanceFormConfig>) => {
      const payload = {
        title: newForm.title,
        description: newForm.description,
        date: newForm.date,
        is_active: newForm.isActive,
        slug: newForm.slug,
        allowed_categories: newForm.allowedCategories,
        form_type: newForm.formType ?? 'desa',
        kelompok_id: newForm.kelompokId ?? null,
      }

      const { error } = await supabase.from('attendance_forms').insert(payload)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-forms'] })
      toast.success('Form created successfully')
    },
  })
  const { mutateAsync: createForm } = createFormMutation

  const updateFormMutation = useMutation({
    mutationFn: async (updatedForm: AttendanceFormConfig) => {
      const payload = {
        title: updatedForm.title,
        description: updatedForm.description,
        date: updatedForm.date,
        is_active: updatedForm.isActive,
        slug: updatedForm.slug,
        allowed_categories: updatedForm.allowedCategories,
        form_type: updatedForm.formType ?? 'desa',
        kelompok_id: updatedForm.kelompokId ?? null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('attendance_forms')
        .update(payload)
        .eq('id', updatedForm.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-forms'] })
      toast.success('Form updated successfully')
    },
  })
  const { mutateAsync: updateForm } = updateFormMutation

  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related attendance records
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('form_id', id)

      if (attendanceError) throw attendanceError

      // Then delete the form
      const { error } = await supabase
        .from('attendance_forms')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-forms'] })
      toast.success('Form deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete form: ${error.message}`)
    },
  })
  const { mutateAsync: deleteForm } = deleteFormMutation

  const contextValue = useMemo(
    () => ({
      forms,
      isLoading,
      createForm,
      updateForm,
      deleteForm,
    }),
    [
      forms,
      isLoading,
      createForm,
      updateForm,
      deleteForm,
    ]
  )

  return <FormsContext.Provider value={contextValue}>{children}</FormsContext.Provider>
}

export function useFormsContext() {
  const context = useContext(FormsContext)
  if (!context) {
    throw new Error('useFormsContext must be used within a FormsProvider')
  }
  return context
}
