
import { supabase } from '@/lib/supabase'

export async function getAttendanceList() {
    const { data, error } = await supabase
        .from('attendance')
        .select(`
      *,
      participant:participants!attendance_participant_id_fkey(
        id, 
        name, 
        gender, 
        group_id,
        category_id,
        group:group_id(value),
        category:category_id(value)
      ),
      form:form_id(title)
    `)
        .order('timestamp', { ascending: false })

    if (error) {
        console.error('Error fetching attendance:', error)
        return []
    }

    return data.map((item: any) => ({
        ...item,
        // Normalize foreign keys to camelCase for dialogs/edit flow
        participantId: item.participant_id ?? item.participantId ?? null,
        formId: item.form_id ?? item.formId ?? null,
        // Map timestamp to date for table sorting
        date: item.timestamp,
        status: item.status?.toLowerCase(),
        permissionReason: item.permission_reason, // Map snake_case to camelCase
        notes: item.permission_description,
        // Pending/new participant fields
        tempName: item.temp_name,
        tempKelompok: item.temp_group,
        tempKategori: item.temp_category,
        tempGender: item.temp_gender,
        participant: item.participant ? {
            ...item.participant,
            kelompok: item.participant.group?.value,
            kategori: item.participant.category?.value
        } : null
    }))
}

export async function getAttendanceStats() {
    const { data, error } = await supabase
        .from('attendance')
        .select('status')

    if (error) {
        console.error('Error fetching stats:', error)
        return { total: 0, hadir: 0, izin: 0, hadirPercent: 0, izinPercent: 0 }
    }

    const total = data.length
    const hadir = data.filter((r) => r.status === 'HADIR').length
    const izin = data.filter((r) => r.status === 'IZIN').length

    return {
        total,
        hadir,
        izin,
        hadirPercent: total > 0 ? Math.round((hadir / total) * 100) : 0,
        izinPercent: total > 0 ? Math.round((izin / total) * 100) : 0,
    }
}
