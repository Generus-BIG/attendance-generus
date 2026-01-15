import { supabase } from '@/lib/supabase'
import type { PendingParticipant, Participant } from '@/lib/schema'

// Helper to get group ID (Cached likely needed in production, but direct query for now)
async function getGroupId(value: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('lookup_values')
    .select('id')
    .eq('type', 'GROUP')
    .eq('value', value)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}

async function getCategoryId(value: string): Promise<string | null> {
  let dbValue = value
  if (value === 'A') dbValue = 'GPN A'
  if (value === 'B') dbValue = 'GPN B'
  if (value === 'AR') dbValue = 'AR'

  const { data, error } = await supabase
    .from('lookup_values')
    .select('id')
    .eq('type', 'CATEGORY')
    .in('value', [value, dbValue])
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}


export const approvalService = {
  async getPending(): Promise<PendingParticipant[]> {
    const { data, error } = await supabase
      .from('pending_participants')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return data.map(d => ({
        id: d.id,
        name: d.name,
        suggestedKelompok: d.suggested_group,
        suggestedGender: d.suggested_gender,
        suggestedKategori: d.suggested_category,
        birthPlace: d.birth_place || null,
        birthDate: d.birth_date ? new Date(d.birth_date) : null,
        attendanceRefIds: d.attendance_ref_ids || [],
        status: d.status,
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at || d.created_at)
    }))
  },

  async getHistory(): Promise<PendingParticipant[]> {
    const { data, error } = await supabase
      .from('pending_participants')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('updated_at', { ascending: false })

    if (error) throw error
    
    return data.map(d => ({
        id: d.id,
        name: d.name,
        suggestedKelompok: d.suggested_group,
        suggestedGender: d.suggested_gender,
        suggestedKategori: d.suggested_category,
        birthPlace: d.birth_place || null,
        birthDate: d.birth_date ? new Date(d.birth_date) : null,
        attendanceRefIds: d.attendance_ref_ids || [],
        status: d.status,
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at || d.created_at)
    }))
  },

  async getActiveParticipants(): Promise<Participant[]> {
      const { data, error } = await supabase
        .from('participants')
        .select(`
            id,
            name,
            gender,
            groups:group_id(value),
            categories:category_id(value),
            status_active,
            created_at
        `)
        // Filter by status_active = true
        .eq('status_active', true)
        .order('name')
      
      if (error) throw error

      type ParticipantRow = {
        id: string
        name: string
        gender: 'L' | 'P'
        groups: { value: string } | null
        categories: { value: string } | null
        status_active: boolean | null
        created_at: string
      }

      function mapDbCategoryToInternal(dbCategory: string): Participant['kategori'] {
        if (dbCategory === 'GPN A') return 'A'
        if (dbCategory === 'GPN B') return 'B'
        if (dbCategory === 'AR') return 'AR'
        // Fallback: if already internal (A/B/AR)
        if (dbCategory === 'A' || dbCategory === 'B' || dbCategory === 'AR') return dbCategory
        // If unknown, default to AR (should not happen, but avoids runtime crash)
        return 'AR'
      }

      return (data as unknown as ParticipantRow[]).map((p) => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        kelompok: (p.groups?.value || '') as Participant['kelompok'],
        kategori: mapDbCategoryToInternal(p.categories?.value || ''),
        status: p.status_active ? 'active' : 'inactive',
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.created_at),
      }))
  },

  async approve(pending: PendingParticipant, isNew: boolean, targetParticipantId?: string) {
    let finalParticipantId = targetParticipantId

    if (isNew) {
        const groupId = await getGroupId(pending.suggestedKelompok)
        const categoryId = await getCategoryId(pending.suggestedKategori)

      if (!groupId) {
        throw new Error(`Kelompok tidak ditemukan: ${pending.suggestedKelompok}`)
      }
      if (!categoryId) {
        throw new Error(`Kategori tidak ditemukan: ${pending.suggestedKategori}`)
      }

        // Create new participant
        const { data: newParticipant, error: createError } = await supabase
            .from('participants')
            .insert({
                name: pending.name,
                gender: pending.suggestedGender,
                group_id: groupId,
                category_id: categoryId,
                status_active: true
            })
            .select()
            .single()
        
        if (createError) throw createError
        finalParticipantId = newParticipant.id
    }

    if (!finalParticipantId) throw new Error("No participant ID determined")

    // Update attendance records
    if (pending.attendanceRefIds && pending.attendanceRefIds.length > 0) {
        const { error: updateAttendanceError } = await supabase
            .from('attendance')
            .update({ participant_id: finalParticipantId })
            .in('id', pending.attendanceRefIds)
        
        if (updateAttendanceError) throw updateAttendanceError
    }

    // Update pending status
    const { error: updatePendingError } = await supabase
        .from('pending_participants')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', pending.id)

    if (updatePendingError) throw updatePendingError
  },

  async reject(id: string) {
      const { error } = await supabase
        .from('pending_participants')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
  }
  ,
  async delete(id: string) {
    const { error } = await supabase
      .from('pending_participants')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
