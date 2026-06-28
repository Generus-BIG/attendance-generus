export const CATEGORY_CODES = [
  'ACR',
  'APR',
  'AR',
  'GPN_A',
  'GPN_B',
  'PENDIDIK_MT',
  'PENDIDIK_MS',
] as const

export type CategoryCode = (typeof CATEGORY_CODES)[number]

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  ACR: 'ACR',
  APR: 'APR',
  AR: 'AR',
  GPN_A: 'GPN A (19-22 tahun)',
  GPN_B: 'GPN B (23-30 tahun)',
  PENDIDIK_MT: 'Pendidik MT',
  PENDIDIK_MS: 'Pendidik MS',
}

export const PROGRAM_CODES = [
  'TURBA_GPN',
  'GOMA',
  'GMKM',
  'PHQ',
  'SHOLAT_ACR',
  'NIKAH_JM',
] as const

export type ProgramCode = (typeof PROGRAM_CODES)[number]

export const MUSTIN_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
} as const
