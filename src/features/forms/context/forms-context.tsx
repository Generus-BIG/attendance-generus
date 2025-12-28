import { createContext, useContext, type ReactNode } from 'react'
import { attendanceFormConfigListSchema, type AttendanceFormConfig } from '@/lib/schema'
import { supabase } from '../../../lib/supabase' // Assuming initialized client
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

    const { data: forms = [], isLoading } = useQuery({
        queryKey: ['attendance_forms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance_forms')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                toast.error('Failed to fetch forms')
                throw error
            }

            // Map snake_case to camelCase
            const mapped = data.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                date: item.date,
                isActive: item.is_active,
                slug: item.slug,
                allowedCategories: item.allowed_categories || ['A', 'B', 'AR'],
                createdAt: item.created_at,
                updatedAt: item.updated_at,
            }))

            return attendanceFormConfigListSchema.parse(mapped)
        }
    })

    const createFormMutation = useMutation({
        mutationFn: async (newForm: Partial<AttendanceFormConfig>) => {
            // Map camelCase back to snake_case for Supabase
            const payload = {
                title: newForm.title,
                description: newForm.description,
                date: newForm.date,
                is_active: newForm.isActive,
                slug: newForm.slug,
                allowed_categories: newForm.allowedCategories,
            }

            const { error } = await supabase
                .from('attendance_forms')
                .insert(payload)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
            toast.success('Form created successfully')
        }
    })

    const updateFormMutation = useMutation({
        mutationFn: async (updatedForm: AttendanceFormConfig) => {
            // Map camelCase back to snake_case for Supabase
            const payload = {
                title: updatedForm.title,
                description: updatedForm.description,
                date: updatedForm.date,
                is_active: updatedForm.isActive,
                slug: updatedForm.slug,
                allowed_categories: updatedForm.allowedCategories,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('attendance_forms')
                .update(payload)
                .eq('id', updatedForm.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
            toast.success('Form updated successfully')
        }
    })

    const deleteFormMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('attendance_forms')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance_forms'] })
        }
    })

    return (
        <FormsContext.Provider
            value={{
                forms,
                isLoading,
                createForm: async (data) => createFormMutation.mutateAsync(data),
                updateForm: async (data) => updateFormMutation.mutateAsync(data),
                deleteForm: async (id) => deleteFormMutation.mutateAsync(id),
            }}
        >
            {children}
        </FormsContext.Provider>
    )
}

export function useFormsContext() {
    const context = useContext(FormsContext)
    if (!context) {
        throw new Error('useFormsContext must be used within a FormsProvider')
    }
    return context
}
