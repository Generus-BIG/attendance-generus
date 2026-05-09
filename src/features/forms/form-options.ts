import { KELOMPOK } from '@/lib/schema'

export function getConfiguredKelompok(
  formType: string | null | undefined,
  kelompokName: string | null | undefined
): (typeof KELOMPOK)[number] | null {
  if (formType !== 'kelompok') return null
  const match = KELOMPOK.find((kelompok) => kelompok === kelompokName)
  return match ?? null
}

export function getFormKelompokOptions(
  formType: string | null | undefined,
  kelompokName: string | null | undefined
): readonly (typeof KELOMPOK)[number][] {
  const configuredKelompok = getConfiguredKelompok(formType, kelompokName)
  if (formType === 'kelompok') return configuredKelompok ? [configuredKelompok] : []
  return KELOMPOK
}

export function getFormConfiguredKelompok(formConfig: {
  formType?: string | null
  kelompokName?: string | null
}) {
  return getConfiguredKelompok(formConfig.formType, formConfig.kelompokName)
}
