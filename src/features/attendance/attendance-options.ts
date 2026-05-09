import { type Participant } from '@/lib/schema'

type AttendanceFormOption = {
  id: string
  formType?: string | null
  kelompokName?: string | null
}

export function getAttendanceFormKelompok(
  formId: string | null | undefined,
  forms: AttendanceFormOption[]
): string | null {
  if (!formId) return null
  const selectedForm = forms.find((form) => form.id === formId)
  if (selectedForm?.formType !== 'kelompok') return null
  return selectedForm.kelompokName ?? null
}

export function filterParticipantsForAttendanceForm<
  T extends Pick<Participant, 'kelompok'>,
>(participants: T[], kelompok: string | null | undefined): T[] {
  if (!kelompok) return participants
  return participants.filter((participant) => participant.kelompok === kelompok)
}
