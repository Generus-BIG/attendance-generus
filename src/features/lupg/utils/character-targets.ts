export const TARGET_LEVELS = [
  'PAUD',
  'ACR_1',
  'ACR_2',
  'ACR_3',
  'ACR_4',
  'ACR_5',
  'ACR_6',
  'APR',
  'AR',
  'GPN',
] as const

export type CharacterTargetLevel = (typeof TARGET_LEVELS)[number]

export const TARGET_LEVEL_LABELS: Record<CharacterTargetLevel, string> = {
  PAUD: 'PAUD',
  ACR_1: 'ACR Kelas 1',
  ACR_2: 'ACR Kelas 2',
  ACR_3: 'ACR Kelas 3',
  ACR_4: 'ACR Kelas 4',
  ACR_5: 'ACR Kelas 5',
  ACR_6: 'ACR Kelas 6',
  APR: 'APR',
  AR: 'AR',
  GPN: 'GPN',
}
