import { z } from 'zod'

// === Enums & Constants ===
export const KELOMPOK = ['BIG 1', 'BIG 2', 'Cakra', 'Limo', 'Meruyung'] as const
export const KATEGORI = ['A', 'B'] as const
export const GENDER = ['L', 'P'] as const
export const ATTENDANCE_STATUS = ['hadir', 'izin'] as const
export const PARTICIPANT_STATUS = ['active', 'inactive'] as const
export const PENDING_STATUS = ['pending', 'approved', 'rejected'] as const

export const PERMISSION_REASONS = [
  'Sakit',
  'Kerja',
  'Lainnya',
] as const

// === Zod Schemas ===
export const kelompokSchema = z.enum(KELOMPOK)
export const kategoriSchema = z.enum(KATEGORI)
export const genderSchema = z.enum(GENDER)
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUS)
export const participantStatusSchema = z.enum(PARTICIPANT_STATUS)
export const pendingStatusSchema = z.enum(PENDING_STATUS)
export const permissionReasonSchema = z.enum(PERMISSION_REASONS)

// === Participant Schema ===
export const participantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nama wajib diisi'),
  gender: genderSchema,
  kelompok: kelompokSchema,
  kategori: kategoriSchema,
  status: participantStatusSchema.default('active'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Participant = z.infer<typeof participantSchema>
export const participantListSchema = z.array(participantSchema)

// === Attendance Form Config Schema ===
export const attendanceFormConfigSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().nullable().optional(),
  date: z.coerce.date(),
  isActive: z.boolean().default(true),
  slug: z.string().min(1, 'Slug wajib diisi'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AttendanceFormConfig = z.infer<typeof attendanceFormConfigSchema>
export const attendanceFormConfigListSchema = z.array(attendanceFormConfigSchema)

// === Attendance Schema ===
export const attendanceSchema = z.object({
  id: z.string(),
  participantId: z.string().nullable(), // null jika pending participant
  formId: z.string().nullable().optional(), // Link ke specific form event
  date: z.coerce.date(),
  timestamp: z.coerce.date(),
  status: attendanceStatusSchema,
  permissionReason: permissionReasonSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  // For pending/unmatched attendance
  tempName: z.string().nullable().optional(),
  tempKelompok: kelompokSchema.nullable().optional(),
  tempGender: genderSchema.nullable().optional(),
  tempKategori: kategoriSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Attendance = z.infer<typeof attendanceSchema>
export const attendanceListSchema = z.array(attendanceSchema)

// === Pending Participant Schema ===
export const pendingParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nama wajib diisi'),
  suggestedKelompok: kelompokSchema,
  suggestedGender: genderSchema,
  suggestedKategori: kategoriSchema,
  attendanceRefIds: z.array(z.string()), // linked attendance records
  status: pendingStatusSchema.default('pending'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PendingParticipant = z.infer<typeof pendingParticipantSchema>
export const pendingParticipantListSchema = z.array(pendingParticipantSchema)

// === Form Schemas (for input validation) ===
export const participantFormSchema = participantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type ParticipantFormData = z.infer<typeof participantFormSchema>

export const attendanceFormSchema = z.object({
  participantId: z.string().nullable(),
  status: attendanceStatusSchema,
  permissionReason: permissionReasonSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  // For new participant submission
  tempName: z.string().nullable().optional(),
  tempKelompok: kelompokSchema.nullable().optional(),
  tempGender: genderSchema.nullable().optional(),
  tempKategori: kategoriSchema.nullable().optional(),
})

export type AttendanceFormData = z.infer<typeof attendanceFormSchema>
