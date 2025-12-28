import { supabase } from '@/lib/supabase'
import type { Participant } from '@/lib/schema'

// Map database category values to internal form values
// Database: "GPN A", "GPN B", "AR" -> Form: "A", "B", "AR"
function mapDbCategoryToInternal(dbCategory: string): string {
  if (dbCategory === 'GPN A') return 'A'
  if (dbCategory === 'GPN B') return 'B'
  return dbCategory // "AR" stays as "AR"
}

// Map internal form values to database category values
// Form: "A", "B", "AR" -> Database: "GPN A", "GPN B", "AR"
function mapInternalToDbCategory(category: string): string {
  if (category === 'A') return 'GPN A'
  if (category === 'B') return 'GPN B'
  return category // "AR" stays as "AR"
}

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
  // Get the group and category values, handling the case where they might not be joined
  const groupValue = dbParticipant.group?.value || dbParticipant.group_id
  const categoryValue = dbParticipant.category?.value || dbParticipant.category_id
  
  return {
    id: dbParticipant.id,
    name: dbParticipant.name,
    gender: dbParticipant.gender as 'L' | 'P',
    kelompok: groupValue as 'BIG 1' | 'BIG 2' | 'Cakra' | 'Limo' | 'Meruyung',
    kategori: mapDbCategoryToInternal(categoryValue) as 'A' | 'B' | 'AR',
    status: dbParticipant.status as 'active' | 'inactive',
    createdAt: new Date(dbParticipant.created_at),
    updatedAt: new Date(dbParticipant.updated_at),
  }
}

// Map application camelCase to database snake_case
async function mapParticipantToDb(participant: Partial<Participant>) {
  // We need to store the actual values that match the database
  // The database uses these values directly (not IDs)
  return {
    name: participant.name,
    gender: participant.gender,
    group_id: participant.kelompok, // Store the group value directly
    category_id: participant.kategori ? mapInternalToDbCategory(participant.kategori) : undefined,
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
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        return null
      }
      // For other errors, throw to allow proper error handling
      throw error
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
    const payload = await mapParticipantToDb(data)

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
      ...(await mapParticipantToDb(data)),
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
      // Throw error to allow proper error handling by calling code
      throw error
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
