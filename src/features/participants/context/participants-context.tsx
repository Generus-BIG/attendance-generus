import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { participantListSchema, type Participant, type KATEGORI } from '@/lib/schema'

// Lookup value mappings (value -> UUID)
// These are fetched from DB and cached
type LookupMap = Record<string, string>

interface ParticipantsCRUDContextType {
  participants: Participant[]
  isLoading: boolean
  createParticipant: (data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateParticipant: (id: string, data: Partial<Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteParticipant: (id: string) => Promise<void>
  deleteParticipants: (ids: string[]) => Promise<void>
}

const ParticipantsCRUDContext = createContext<ParticipantsCRUDContextType | undefined>(undefined)

// Helper to fetch lookup values
async function fetchLookupMaps(): Promise<{ groups: LookupMap; categories: LookupMap }> {
  const { data, error } = await supabase
    .from('lookup_values')
    .select('id, value, type')

  if (error) throw error

  const groups: LookupMap = {}
  const categories: LookupMap = {}

  data.forEach((item) => {
    if (item.type === 'GROUP') {
      groups[item.value] = item.id
    } else if (item.type === 'CATEGORY') {
      categories[item.value] = item.id
    }
  })

  return { groups, categories }
}

// Map app kategori ('A', 'B', 'AR') to DB value ('GPN A', 'GPN B', 'AR')
function mapKategoriToDb(kategori: string): string {
  if (kategori === 'A') return 'GPN A'
  if (kategori === 'B') return 'GPN B'
  return kategori // 'AR' stays as 'AR'
}

// Map DB category value to app kategori
function mapKategoriFromDb(dbValue: string): typeof KATEGORI[number] {
  if (dbValue === 'GPN A') return 'A'
  if (dbValue === 'GPN B') return 'B'
  return 'AR'
}

export function ParticipantsCRUDProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // Fetch lookup values for mapping
  const { data: lookups } = useQuery({
    queryKey: ['lookup_values'],
    queryFn: fetchLookupMaps,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  })

  // Fetch participants
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          name,
          gender,
          status_active,
          created_at,
          group:group_id(value),
          category:category_id(value)
        `)
        .order('name', { ascending: true })

      if (error) {
        toast.error('Failed to fetch participants')
        throw error
      }

      // Map from DB schema to app schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        gender: item.gender || 'L',
        kelompok: item.group?.value || 'BIG 1',
        kategori: mapKategoriFromDb(item.category?.value || 'GPN A'),
        status: item.status_active ? 'active' : 'inactive',
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.created_at), // DB doesn't have updated_at
      }))

      return participantListSchema.parse(mapped)
    },
  })

  // Create participant mutation
  const createMutation = useMutation({
    mutationFn: async (newParticipant: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!lookups) throw new Error('Lookup values not loaded')

      const dbKategori = mapKategoriToDb(newParticipant.kategori)
      const groupId = lookups.groups[newParticipant.kelompok]
      const categoryId = lookups.categories[dbKategori]

      if (!groupId) throw new Error(`Unknown group: ${newParticipant.kelompok}`)
      if (!categoryId) throw new Error(`Unknown category: ${dbKategori}`)

      const { error } = await supabase.from('participants').insert({
        name: newParticipant.name,
        gender: newParticipant.gender,
        group_id: groupId,
        category_id: categoryId,
        status_active: newParticipant.status === 'active',
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta berhasil ditambahkan')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambah peserta: ${error.message}`)
    },
  })

  // Update participant mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>> }) => {
      if (!lookups) throw new Error('Lookup values not loaded')

      const payload: Record<string, string | boolean | null> = {}

      if (data.name !== undefined) payload.name = data.name
      if (data.gender !== undefined) payload.gender = data.gender
      if (data.status !== undefined) payload.status_active = data.status === 'active'

      if (data.kelompok !== undefined) {
        const groupId = lookups.groups[data.kelompok]
        if (!groupId) throw new Error(`Unknown group: ${data.kelompok}`)
        payload.group_id = groupId
      }

      if (data.kategori !== undefined) {
        const dbKategori = mapKategoriToDb(data.kategori)
        const categoryId = lookups.categories[dbKategori]
        if (!categoryId) throw new Error(`Unknown category: ${dbKategori}`)
        payload.category_id = categoryId
      }

      const { error } = await supabase
        .from('participants')
        .update(payload)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta berhasil diperbarui')
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui peserta: ${error.message}`)
    },
  })

  // Delete single participant mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta berhasil dihapus')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus peserta: ${error.message}`)
    },
  })

  // Delete multiple participants mutation
  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta terpilih berhasil dihapus')
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus peserta: ${error.message}`)
    },
  })

  return (
    <ParticipantsCRUDContext.Provider
      value={{
        participants,
        isLoading,
        createParticipant: (data) => createMutation.mutateAsync(data),
        updateParticipant: (id, data) => updateMutation.mutateAsync({ id, data }),
        deleteParticipant: (id) => deleteMutation.mutateAsync(id),
        deleteParticipants: (ids) => deleteMultipleMutation.mutateAsync(ids),
      }}
    >
      {children}
    </ParticipantsCRUDContext.Provider>
  )
}

export function useParticipantsCRUD() {
  const context = useContext(ParticipantsCRUDContext)
  if (!context) {
    throw new Error('useParticipantsCRUD must be used within a ParticipantsCRUDProvider')
  }
  return context
}
