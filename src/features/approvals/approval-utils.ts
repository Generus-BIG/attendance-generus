import { format } from 'date-fns'
import { type PendingParticipant } from '@/lib/schema'

type ExistingBirthData = {
  birth_date: string | null
  birth_place: string | null
}

export function formatKategoriLabel(kategori: string): string {
  if (kategori === 'A') return 'GPN A'
  if (kategori === 'B') return 'GPN B'
  return kategori
}

export function buildMergeBirthDataUpdate(
  pending: Pick<PendingParticipant, 'birthDate' | 'birthPlace'>,
  existing: ExistingBirthData
): Partial<ExistingBirthData> {
  const payload: Partial<ExistingBirthData> = {}
  const birthPlace = pending.birthPlace?.trim()

  if (!existing.birth_date && pending.birthDate) {
    payload.birth_date = format(pending.birthDate, 'yyyy-MM-dd')
  }

  if (!existing.birth_place && birthPlace) {
    payload.birth_place = birthPlace
  }

  return payload
}
