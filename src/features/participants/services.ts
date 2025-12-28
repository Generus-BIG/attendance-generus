import { supabase } from '@/lib/supabase'
import type { Participant } from '@/lib/schema'

// Map database snake_case to camelCase for the application
function mapParticipantFromDb(dbParticipant: {
  id: string
  name: string
  gender: string
  group?: { value: string } | null
  group_id: string
  category?: { value: string } | null
  category_id: string
  status: string
  created_at: string
  updated_at: string
}): Participant {
  return {
    id: dbParticipant.id,
    name: dbParticipant.name,
    gender: dbParticipant.gender as 'L' | 'P',
    kelompok: (dbParticipant.group?.value || dbParticipant.group_id) as 'BIG 1' | 'BIG 2' | 'Cakra' | 'Limo' | 'Meruyung',
    kategori: (dbParticipant.category?.value || dbParticipant.category_id) as 'A' | 'B' | 'AR',
    status: dbParticipant.status as 'active' | 'inactive',
    createdAt: new Date(dbParticipant.created_at),
    updatedAt: new Date(dbParticipant.updated_at),
  }
}

// Map application camelCase to database snake_case
function mapParticipantToDb(participant: Partial<Participant>) {
  return {
    name: participant.name,
    gender: participant.gender,
    // Map kelompok and kategori to their IDs
    // For now, we'll use the value directly, assuming the database accepts it
    group_id: participant.kelompok,
    category_id: participant.kategori,
    status: participant.status,
  }
}

export const participantService = {
  async getAll(): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return data.map(mapParticipantFromDb)
  },

  async getById(id: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return null
    }

    return mapParticipantFromDb(data)
  },

  async getActive(): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return data.map(mapParticipantFromDb)
  },

  async create(data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Participant> {
    const payload = mapParticipantToDb(data)

    const { data: result, error } = await supabase
      .from('participants')
      .insert(payload)
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .single()

    if (error) {
      throw error
    }

    return mapParticipantFromDb(result)
  },

  async update(
    id: string,
    data: Partial<Omit<Participant, 'id' | 'createdAt'>>
  ): Promise<Participant | null> {
    const payload = {
      ...mapParticipantToDb(data),
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('participants')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .single()

    if (error) {
      throw error
    }

    return mapParticipantFromDb(result)
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('participants').delete().eq('id', id)

    if (error) {
      return false
    }

    return true
  },

  async bulkUpdateStatus(ids: string[], status: 'active' | 'inactive'): Promise<number> {
    const { error } = await supabase
      .from('participants')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      throw error
    }

    return ids.length
  },

  async search(query: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select(`
        *,
        group:group_id(value),
        category:category_id(value)
      `)
      .eq('status', 'active')
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) {
      throw error
    }

    return data.map(mapParticipantFromDb)
  },
}
