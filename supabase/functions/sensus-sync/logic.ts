export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

const KELOMPOK_MAP: Record<string, string> = {
  big1: 'BIG 1',
  big2: 'BIG 2',
  cakra: 'Cakra',
  limo: 'Limo',
  meruyung: 'Meruyung',
}

export function normalizeKelompok(raw: string): string | null {
  return KELOMPOK_MAP[raw.trim().toLowerCase().replace(/\s+/g, '')] ?? null
}

export function parseTanggalLahir(raw: string): string | null {
  const match = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const dayNumber = Number(day)
  const monthNumber = Number(month)
  const yearNumber = Number(year)
  const leapYear = yearNumber % 4 === 0 && (yearNumber % 100 !== 0 || yearNumber % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthNumber - 1]
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > daysInMonth) return null

  return `${year}-${month}-${day}`
}

const KATEGORI_ALLOW = new Set(['GPN A', 'GPN B', 'AR', 'APR', 'Paud', 'ACR'])

export function mapKategori(raw: string): string | null {
  const value = raw.trim()
  if (value.toLowerCase() === 'balita') return null
  return KATEGORI_ALLOW.has(value) ? value : null
}

export function keepRow(keterangan: string): 'active' | 'khusus' | null {
  const value = keterangan.trim().toLowerCase()
  if (value === 'aktif') return 'active'
  if (value === 'khusus') return 'khusus'
  return null
}

export interface ExistingRow {
  id: string
  name: string
  kelompok: string
  gender: string
  birth_date?: string | null
  category?: string | null
  is_khusus?: boolean
}

export interface SourceRow {
  name: string
  kelompok: string
  gender: string
}

export interface MatchRowResult {
  confidence: 'exact' | 'similar' | 'none'
  participantId: string | null
  candidates?: ExistingRow[]
}

export function matchRow(
  src: SourceRow,
  existing: ExistingRow[],
  sourceRows?: SourceRow[],
): MatchRowResult {
  const name = normalizeName(src.name)
  const gender = src.gender.trim().toUpperCase()
  const exact = existing.filter(
    (row) =>
      normalizeName(row.name) === name &&
      row.kelompok === src.kelompok &&
      row.gender.trim().toUpperCase() === gender,
  )
  const result =
    exact.length === 1
      ? { confidence: 'exact' as const, participantId: exact[0].id }
      : exact.length > 1
        ? { confidence: 'none' as const, participantId: null, candidates: exact }
        : (() => {
            const sourceWords = nameWords(src.name)
            const similar = existing.filter((row) => {
              const existingName = normalizeName(row.name)
              const existingWords = new Set(nameWords(row.name))
              const sharedWords = sourceWords.filter((word) => existingWords.has(word)).length
              return (
                name.length > 0 &&
                (existingName.includes(name) || name.includes(existingName) || sharedWords >= 2)
              )
            })
            return similar.length > 0
              ? { confidence: 'similar' as const, participantId: null, candidates: similar }
              : { confidence: 'none' as const, participantId: null }
          })()

  if (sourceRows && name && sourceRows.filter((row) => normalizeName(row.name) === name).length > 1) {
    return { confidence: 'similar', participantId: null, candidates: result.candidates ?? exact }
  }
  return result
}
