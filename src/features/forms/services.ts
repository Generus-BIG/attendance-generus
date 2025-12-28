import { supabase } from '../../lib/supabase'
import { attendanceFormConfigSchema, type AttendanceFormConfig } from '@/lib/schema'

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
        allowedCategories: data.allowed_categories || ['A', 'B', 'AR'],
        createdAt: data.created_at,
        updatedAt: data.updated_at
    }

    return attendanceFormConfigSchema.parse(mappedData)
}

export async function submitAttendanceForm(formId: string, data: {
    participantId?: string | null;
    status?: string;
    permissionReason?: string | null;
    notes?: string | null;
    tempName?: string;
    tempKelompok?: string;
    tempKategori?: string;
    tempGender?: string;
}) {
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

interface ParticipantSearchResult {
    id: string
    name: string
    gender: string
    group: string
    category: string
}

// Map database category values to internal form values
// Database: "GPN A", "GPN B", "AR" -> Form: "A", "B", "AR"
function mapDbCategoryToInternal(dbCategory: string): string {
    if (dbCategory === 'GPN A') return 'A'
    if (dbCategory === 'GPN B') return 'B'
    return dbCategory // "AR" stays as "AR"
}

export async function searchParticipants(
    query: string,
    allowedCategories?: string[]
): Promise<ParticipantSearchResult[]> {
    const queryBuilder = supabase
        .from('participants')
        .select(`
            id,
            name,
            gender,
            groups:group_id(value),
            categories:category_id(value)
        `)
        .ilike('name', `%${query || ''}%`)
        .limit(20)

    const { data, error } = await queryBuilder

    if (error || !data) {
        return []
    }

    // Supabase returns foreign key relations as objects or arrays depending on the relationship
    const mapped: ParticipantSearchResult[] = data.map((p) => {
        // Handle both single object and array responses from Supabase
        const groupData = p.groups as { value: string } | { value: string }[] | null
        const categoryData = p.categories as { value: string } | { value: string }[] | null

        const groupValue = Array.isArray(groupData)
            ? groupData[0]?.value
            : groupData?.value

        const categoryValue = Array.isArray(categoryData)
            ? categoryData[0]?.value
            : categoryData?.value

        return {
            id: p.id as string,
            name: p.name as string,
            gender: p.gender as string,
            group: groupValue || '',
            category: categoryValue || '', // Keep original DB value for display
        }
    })

    // Filter by allowed categories if provided
    // Map DB category to internal form value for comparison
    if (allowedCategories && allowedCategories.length > 0) {
        return mapped.filter((p) => {
            const internalCategory = mapDbCategoryToInternal(p.category)
            return allowedCategories.includes(internalCategory)
        })
    }

    return mapped
}
