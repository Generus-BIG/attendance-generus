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

export async function submitPendingAttendance(formId: string, data: {
    status: string;
    permissionReason?: string;
    notes?: string;
    tempName: string;
    tempKelompok: string;
    tempKategori: string;
    tempGender: string;
    birthPlace: string;
    birthDate: Date;
}) {
    // 1. Insert into attendance table with temp fields
    const attendancePayload = {
        form_id: formId,
        participant_id: null,
        status: data.status.toUpperCase(),
        permission_reason: data.permissionReason || null,
        permission_description: data.notes || null,
        temp_name: data.tempName,
        temp_group: data.tempKelompok,
        temp_category: data.tempKategori,
        temp_gender: data.tempGender,
        timestamp: new Date().toISOString()
    }

    const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .insert(attendancePayload)
        .select()
        .single()

    if (attendanceError) throw attendanceError

    // 2. Insert into pending_participants
    const pendingPayload = {
        name: data.tempName,
        suggested_group: data.tempKelompok,
        suggested_gender: data.tempGender,
        suggested_category: data.tempKategori,
        attendance_ref_ids: [attendanceData.id],
        status: 'pending',
        birth_place: data.birthPlace,
        birth_date: data.birthDate.toISOString().split('T')[0]
    }

    const { error: pendingError } = await supabase
        .from('pending_participants')
        .insert(pendingPayload)

    if (pendingError) throw pendingError
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
    if (dbCategory === 'Anak Remaja') return 'AR'
    return dbCategory // "AR" stays as "AR"
}

// Map internal form values back to database category values for filtering
function mapInternalToDbCategories(allowedCategories: string[]): string[] {
    const dbCategories: string[] = []
    if (allowedCategories.includes('A')) dbCategories.push('GPN A')
    if (allowedCategories.includes('B')) dbCategories.push('GPN B')
    if (allowedCategories.includes('AR')) {
        dbCategories.push('Anak Remaja')
        dbCategories.push('AR')
    }
    return dbCategories
}

export async function searchParticipants(
    query: string,
    allowedCategories?: string[]
): Promise<ParticipantSearchResult[]> {
    // Construct the select string based on whether we need to filter by category (inner join) or not
    const hasCategoryFilter = allowedCategories && allowedCategories.length > 0
    
    const selectQuery = `
        id,
        name,
        gender,
        groups:group_id(value),
        categories:category_id${hasCategoryFilter ? '!inner' : ''}(value)
    `

    let queryBuilder = supabase
        .from('participants')
        .select(selectQuery)
        .ilike('name', `%${query || ''}%`)

    // Apply category filter if needed
    if (hasCategoryFilter) {
        const dbAllowedValues = mapInternalToDbCategories(allowedCategories)
        queryBuilder = queryBuilder.in('categories.value', dbAllowedValues)
    }

    // Apply limit after filtering
    const { data, error } = await queryBuilder.limit(20)

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
    // Since we now filter in the DB using !inner join, we can skip strict filtering here,
    // but we still map the category value for the frontend.
    // However, if the mapping logic differs (e.g. multiple DB values mapping to one internal),
    // we should ensure the returned object uses the "display" or "internal" value?
    // The current code keeps the original DB value.
    if (allowedCategories && allowedCategories.length > 0) {
        // Redundant client-side check but safe to keep
        return mapped.filter((p) => {
            const internalCategory = mapDbCategoryToInternal(p.category)
            return allowedCategories.includes(internalCategory)
        })
    }

    return mapped
}
