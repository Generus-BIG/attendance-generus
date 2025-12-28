import { CheckCircle, Clock } from 'lucide-react'
import { type Attendance } from '@/lib/schema'

export const attendanceStatusTypes = new Map<Attendance['status'], string>([
  ['hadir', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['izin', 'bg-amber-100/30 text-amber-900 dark:text-amber-200 border-amber-200'],
])

export const attendanceStatusOptions = [
  { label: 'Hadir', value: 'hadir', icon: CheckCircle },
  { label: 'Izin', value: 'izin', icon: Clock },
] as const

export const permissionReasonOptions = [
  { label: 'Sakit', value: 'Sakit' },
  { label: 'Keperluan Keluarga', value: 'Keperluan Keluarga' },
  { label: 'Acara Sekolah', value: 'Acara Sekolah' },
  { label: 'Tugas Luar', value: 'Tugas Luar' },
  { label: 'Lainnya', value: 'Lainnya' },
] as const
