
import { supabase } from '@/lib/supabase'

export async function getAttendanceList(
    kelompokGroupId?: string,
    options?: { from?: string; to?: string }
) {
    let query = supabase
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

    // Team Manager: filter to attendance from own kelompok only
    if (kelompokGroupId) {
        query = query.eq('participant.group_id', kelompokGroupId)
    }

    // Date-range filter on attendance timestamp (yyyy-MM-dd strings).
    // `from` is inclusive from start-of-day; `to` is inclusive through end-of-day.
    if (options?.from) {
        query = query.gte('timestamp', `${options.from}T00:00:00`)
    }
    if (options?.to) {
        query = query.lte('timestamp', `${options.to}T23:59:59.999`)
    }

    const { data, error } = await query

    if (error) {
        throw error
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested-relation rows are deeply dynamic; typing them globally cascades type errors across legacy attendance queries (see CLAUDE.md "no global Database types" note).
    return data.map((item: any) => ({
        ...item,
        // Normalize foreign keys to camelCase for dialogs/edit flow
        participantId: item.participant_id ?? item.participantId ?? null,
        formId: item.form_id ?? item.formId ?? null,
        formTitle: item.form?.title ?? null,
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
        throw error
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
