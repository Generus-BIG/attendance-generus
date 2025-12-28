import { supabase } from '../../lib/supabase'
import { AttendanceFormConfig, attendanceFormConfigSchema } from '@/lib/schema'

export async function getFormBySlug(slug: string): Promise<AttendanceFormConfig | null> {
    const { data, error } = await supabase
        .from('attendance_forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (error || !data) return null

    const mappedData = {
        ...data,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    }

    return attendanceFormConfigSchema.parse(mappedData)
}

export async function submitAttendanceForm(formId: string, data: any) {
    const payload = {
        form_id: formId,
        participant_id: data.participantId || null,
        status: data.status?.toUpperCase(),
        permission_reason: data.permissionReason || null,
        permission_description: data.notes || null,
        temp_name: data.tempName || null,
        temp_group: data.tempKelompok || null,
        temp_category: data.tempKategori || null,
        temp_gender: data.tempGender || null,
        timestamp: new Date().toISOString()
    }

    const { error } = await supabase
        .from('attendance')
        .insert(payload)

    if (error) throw error
}

export async function searchParticipants(query: string) {
    let queryBuilder = supabase
        .from('participants')
        .select(`
            id,
            name,
            gender,
            group:group_id(value),
            category:category_id(value)
        `)
        .limit(10)

    // If query is provided, filter by name
    if (query && query.trim().length > 0) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
        console.error('Error searching participants:', error)
        return []
    }

    return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        group: p.group?.value,
        category: p.category?.value
    }))
}
