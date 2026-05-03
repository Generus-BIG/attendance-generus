import { createContext, useContext, type ReactNode } from 'react'
import { format, parse } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { participantListSchema, type Participant, type KATEGORI } from '@/lib/schema'

// Lookup value mappings (value -> UUID)
// These are fetched from DB and cached
type LookupMap = Record<string, string>

// birth_date is a DATE column. Serialize in local time (not UTC) so a TM in UTC+7
// picking "2000-01-15" doesn't get stored as "2000-01-14".
function toDateOnly(date: Date | null | undefined): string | null {
  return date ? format(date, 'yyyy-MM-dd') : null
}

// Deserialize DATE strings as LOCAL dates. `new Date('2000-01-15')` treats the
// string as UTC midnight, which shifts the displayed day for non-UTC+ users.
function fromDateOnly(value: string | null | undefined): Date | null {
  return value ? parse(value, 'yyyy-MM-dd', new Date()) : null
}

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

// Map app kategori ('A', 'B', 'AR', 'APR') to DB value ('GPN A', 'GPN B', 'AR', 'APR')
function mapKategoriToDb(kategori: string): string {
  if (kategori === 'A') return 'GPN A'
  if (kategori === 'B') return 'GPN B'
  return kategori // 'AR' and 'APR' stay as-is
}

// Map DB category value to app kategori
function mapKategoriFromDb(dbValue: string): typeof KATEGORI[number] {
  if (dbValue === 'GPN A') return 'A'
  if (dbValue === 'GPN B') return 'B'
  if (dbValue === 'APR') return 'APR'
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

  // Get role and kelompok for TM scoping
  const role = useAuthStore((s) => s.auth.role)
  const userKelompok = useAuthStore((s) => s.auth.kelompok)

  // Fetch participants (TM: scoped to own kelompok at query level)
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['participants', role, userKelompok],
    queryFn: async () => {
      let query = supabase
        .from('participants')
        .select(`
          id,
          name,
          gender,
          birth_date,
          birth_place,
          status_active,
          created_at,
          group:group_id(value),
          category:category_id(value)
        `)
        .order('name', { ascending: true })

      // Team Manager: resolve kelompok UUID and filter directly in this query
      if (role === 'team_manager' && userKelompok) {
        const { data: lookup } = await supabase
          .from('lookup_values')
          .select('id')
          .eq('type', 'GROUP')
          .eq('value', userKelompok)
          .maybeSingle()

        if (lookup?.id) {
          query = query.eq('group_id', lookup.id)
        }
      }

      const { data, error } = await query

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
        birthDate: fromDateOnly(item.birth_date),
        birthPlace: item.birth_place ?? null,
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

      const { data, error } = await supabase
        .from('participants')
        .insert({
          name: newParticipant.name,
          gender: newParticipant.gender,
          group_id: groupId,
          category_id: categoryId,
          status_active: newParticipant.status === 'active',
          birth_date: toDateOnly(newParticipant.birthDate),
          birth_place: newParticipant.birthPlace?.trim() || null,
        })
        .select('category_id')
        .single()

      if (error) throw error

      const submittedWasGpnA = newParticipant.kategori === 'A'
      const returnedIsGpnB = data?.category_id === lookups.categories['GPN B']
      return { autoPromoted: submittedWasGpnA && returnedIsGpnB }
    },
    onSuccess: ({ autoPromoted }) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta berhasil ditambahkan')
      if (autoPromoted) {
        toast.info('Kategori otomatis diubah ke GPN B karena usia ≥ 23 tahun')
      }
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambah peserta: ${error.message}`)
    },
  })

  // Update participant mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>> }) => {
      if (!lookups) throw new Error('Lookup values not loaded')

      // Pre-read current category when birth_date is being changed but kategori isn't —
      // this lets us detect GPN A → GPN B promote that the trigger may fire.
      let preUpdateKategori: typeof KATEGORI[number] | undefined = data.kategori
      if (preUpdateKategori === undefined && data.birthDate !== undefined) {
        const { data: existing, error: preReadError } = await supabase
          .from('participants')
          .select('category:category_id(value)')
          .eq('id', id)
          .single()
        if (preReadError) throw preReadError
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbVal = (existing as any)?.category?.value as string | undefined
        preUpdateKategori = dbVal ? mapKategoriFromDb(dbVal) : undefined
      }

      const payload: Record<string, string | boolean | null> = {}

      if (data.name !== undefined) payload.name = data.name
      if (data.gender !== undefined) payload.gender = data.gender
      if (data.status !== undefined) payload.status_active = data.status === 'active'
      if (data.birthDate !== undefined) payload.birth_date = toDateOnly(data.birthDate)
      if (data.birthPlace !== undefined) payload.birth_place = data.birthPlace?.trim() || null

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

      const { data: returned, error } = await supabase
        .from('participants')
        .update(payload)
        .eq('id', id)
        .select('category_id')
        .single()

      if (error) throw error

      const wasGpnA = preUpdateKategori === 'A'
      const returnedIsGpnB = returned?.category_id === lookups.categories['GPN B']
      return { autoPromoted: wasGpnA && returnedIsGpnB }
    },
    onSuccess: ({ autoPromoted }) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] })
      toast.success('Peserta berhasil diperbarui')
      if (autoPromoted) {
        toast.info('Kategori otomatis diubah ke GPN B karena usia ≥ 23 tahun')
      }
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
        createParticipant: async (data) => {
          await createMutation.mutateAsync(data)
        },
        updateParticipant: async (id, data) => {
          await updateMutation.mutateAsync({ id, data })
        },
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
