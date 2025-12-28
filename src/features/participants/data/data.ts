import { Users, CheckCircle, XCircle } from 'lucide-react'
import { type Participant } from '@/lib/schema'

export const statusTypes = new Map<Participant['status'], string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
])

export const kelompokOptions = [
  { label: 'BIG 1', value: 'BIG 1', icon: Users },
  { label: 'BIG 2', value: 'BIG 2', icon: Users },
  { label: 'Cakra', value: 'Cakra', icon: Users },
  { label: 'Limo', value: 'Limo', icon: Users },
  { label: 'Meruyung', value: 'Meruyung', icon: Users },
] as const

export const kategoriOptions = [
  { label: 'GPN A', value: 'A' },
  { label: 'GPN B', value: 'B' },
  { label: 'AR', value: 'AR' },
] as const

export const genderOptions = [
  { label: 'Laki-laki', value: 'L' },
  { label: 'Perempuan', value: 'P' },
] as const

export const statusOptions = [
  { label: 'Aktif', value: 'active', icon: CheckCircle },
  { label: 'Nonaktif', value: 'inactive', icon: XCircle },
] as const
