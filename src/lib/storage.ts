import type { Attendance, Participant, PendingParticipant } from './schema'

const STORAGE_KEYS = {
  participants: 'absensi_participants',
  attendance: 'absensi_attendance',
  pendingParticipants: 'absensi_pending_participants',
  seeded: 'absensi_seeded',
} as const

// === Generic Storage Helpers ===
function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// === UUID Generator ===
export function generateId(): string {
  return crypto.randomUUID()
}

// === Participant CRUD ===
export const participantService = {
  getAll(): Participant[] {
    return getItem<Participant[]>(STORAGE_KEYS.participants, [])
  },

  getById(id: string): Participant | undefined {
    return this.getAll().find((p) => p.id === id)
  },

  getActive(): Participant[] {
    return this.getAll().filter((p) => p.status === 'active')
  },

  create(data: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>): Participant {
    const now = new Date()
    const participant: Participant = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    const all = this.getAll()
    all.push(participant)
    setItem(STORAGE_KEYS.participants, all)
    return participant
  },

  update(id: string, data: Partial<Omit<Participant, 'id' | 'createdAt'>>): Participant | null {
    const all = this.getAll()
    const index = all.findIndex((p) => p.id === id)
    if (index === -1) return null

    all[index] = {
      ...all[index],
      ...data,
      updatedAt: new Date(),
    }
    setItem(STORAGE_KEYS.participants, all)
    return all[index]
  },

  delete(id: string): boolean {
    const all = this.getAll()
    const filtered = all.filter((p) => p.id !== id)
    if (filtered.length === all.length) return false
    setItem(STORAGE_KEYS.participants, filtered)
    return true
  },

  bulkUpdateStatus(ids: string[], status: 'active' | 'inactive'): number {
    const all = this.getAll()
    let count = 0
    const updated = all.map((p) => {
      if (ids.includes(p.id)) {
        count++
        return { ...p, status, updatedAt: new Date() }
      }
      return p
    })
    setItem(STORAGE_KEYS.participants, updated)
    return count
  },

  search(query: string): Participant[] {
    const q = query.toLowerCase().trim()
    return this.getActive().filter((p) => p.name.toLowerCase().includes(q))
  },
}

// === Attendance CRUD ===
export const attendanceService = {
  getAll(): Attendance[] {
    return getItem<Attendance[]>(STORAGE_KEYS.attendance, [])
  },

  getById(id: string): Attendance | undefined {
    return this.getAll().find((a) => a.id === id)
  },

  getByDateRange(startDate: Date, endDate: Date): Attendance[] {
    return this.getAll().filter((a) => {
      const date = new Date(a.date)
      return date >= startDate && date <= endDate
    })
  },

  getByParticipantId(participantId: string): Attendance[] {
    return this.getAll().filter((a) => a.participantId === participantId)
  },

  getUnmatched(): Attendance[] {
    return this.getAll().filter((a) => a.participantId === null)
  },

  create(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Attendance {
    const now = new Date()
    const attendance: Attendance = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    const all = this.getAll()
    all.push(attendance)
    setItem(STORAGE_KEYS.attendance, all)
    return attendance
  },

  update(id: string, data: Partial<Omit<Attendance, 'id' | 'createdAt'>>): Attendance | null {
    const all = this.getAll()
    const index = all.findIndex((a) => a.id === id)
    if (index === -1) return null

    all[index] = {
      ...all[index],
      ...data,
      updatedAt: new Date(),
    }
    setItem(STORAGE_KEYS.attendance, all)
    return all[index]
  },

  delete(id: string): boolean {
    const all = this.getAll()
    const filtered = all.filter((a) => a.id !== id)
    if (filtered.length === all.length) return false
    setItem(STORAGE_KEYS.attendance, filtered)
    return true
  },

  linkToParticipant(attendanceId: string, participantId: string): boolean {
    const attendance = this.getById(attendanceId)
    if (!attendance) return false

    this.update(attendanceId, {
      participantId,
      tempName: null,
      tempKelompok: null,
      tempGender: null,
      tempKategori: null,
    })
    return true
  },

  // Check if attendance already exists for participant on a date
  existsForDate(participantId: string, date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0]
    return this.getAll().some((a) => {
      const aDateStr = new Date(a.date).toISOString().split('T')[0]
      return a.participantId === participantId && aDateStr === dateStr
    })
  },
}

// === Pending Participant CRUD ===
export const pendingParticipantService = {
  getAll(): PendingParticipant[] {
    return getItem<PendingParticipant[]>(STORAGE_KEYS.pendingParticipants, [])
  },

  getPending(): PendingParticipant[] {
    return this.getAll().filter((p) => p.status === 'pending')
  },

  getById(id: string): PendingParticipant | undefined {
    return this.getAll().find((p) => p.id === id)
  },

  create(data: Omit<PendingParticipant, 'id' | 'createdAt' | 'updatedAt' | 'status'>): PendingParticipant {
    const now = new Date()
    const pending: PendingParticipant = {
      ...data,
      id: generateId(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    const all = this.getAll()
    all.push(pending)
    setItem(STORAGE_KEYS.pendingParticipants, all)
    return pending
  },

  approve(id: string, createNew: boolean, mergeToParticipantId?: string): boolean {
    const pending = this.getById(id)
    if (!pending) return false

    let participantId: string

    if (createNew) {
      // Create new participant
      const newParticipant = participantService.create({
        name: pending.name,
        gender: pending.suggestedGender,
        kelompok: pending.suggestedKelompok,
        kategori: pending.suggestedKategori,
        status: 'active',
      })
      participantId = newParticipant.id
    } else if (mergeToParticipantId) {
      participantId = mergeToParticipantId
    } else {
      return false
    }

    // Link all related attendance records
    pending.attendanceRefIds.forEach((attendanceId) => {
      attendanceService.linkToParticipant(attendanceId, participantId)
    })

    // Update pending status
    this.updateStatus(id, 'approved')
    return true
  },

  reject(id: string): boolean {
    return this.updateStatus(id, 'rejected')
  },

  updateStatus(id: string, status: 'approved' | 'rejected'): boolean {
    const all = this.getAll()
    const index = all.findIndex((p) => p.id === id)
    if (index === -1) return false

    all[index] = {
      ...all[index],
      status,
      updatedAt: new Date(),
    }
    setItem(STORAGE_KEYS.pendingParticipants, all)
    return true
  },
}

// === Seeder ===
export function isSeeded(): boolean {
  return localStorage.getItem(STORAGE_KEYS.seeded) === 'true'
}

export function seedParticipants(data: Array<{
  name: string
  gender: 'L' | 'P'
  kelompok: 'BIG 1' | 'BIG 2' | 'Cakra' | 'Limo' | 'Meruyung'
  kategori: 'A' | 'B'
}>): void {
  if (isSeeded()) return

  const now = new Date()
  const participants: Participant[] = data.map((item, index) => ({
    id: generateId(),
    name: item.name.trim(),
    gender: item.gender,
    kelompok: item.kelompok,
    kategori: item.kategori,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }))

  setItem(STORAGE_KEYS.participants, participants)
  localStorage.setItem(STORAGE_KEYS.seeded, 'true')
}

// === Statistics Helpers ===
export const statsService = {
  getAttendanceSummary(startDate: Date, endDate: Date) {
    const records = attendanceService.getByDateRange(startDate, endDate)
    const hadir = records.filter((r) => r.status === 'hadir').length
    const izin = records.filter((r) => r.status === 'izin').length

    return {
      total: records.length,
      hadir,
      izin,
      hadirPercent: records.length > 0 ? Math.round((hadir / records.length) * 100) : 0,
      izinPercent: records.length > 0 ? Math.round((izin / records.length) * 100) : 0,
    }
  },

  getByKelompok(startDate: Date, endDate: Date) {
    const records = attendanceService.getByDateRange(startDate, endDate)
    const participants = participantService.getAll()

    const kelompokMap: Record<string, { hadir: number; izin: number }> = {
      'BIG 1': { hadir: 0, izin: 0 },
      'BIG 2': { hadir: 0, izin: 0 },
      'Cakra': { hadir: 0, izin: 0 },
      'Limo': { hadir: 0, izin: 0 },
      'Meruyung': { hadir: 0, izin: 0 },
    }

    records.forEach((record) => {
      const participant = participants.find((p) => p.id === record.participantId)
      const kelompok = participant?.kelompok || record.tempKelompok
      if (kelompok && kelompokMap[kelompok]) {
        if (record.status === 'hadir') {
          kelompokMap[kelompok].hadir++
        } else {
          kelompokMap[kelompok].izin++
        }
      }
    })

    return Object.entries(kelompokMap).map(([name, data]) => ({
      name,
      ...data,
      total: data.hadir + data.izin,
    }))
  },

  getByKategori(startDate: Date, endDate: Date) {
    const records = attendanceService.getByDateRange(startDate, endDate)
    const participants = participantService.getAll()

    const kategoriMap: Record<string, { hadir: number; izin: number }> = {
      'A': { hadir: 0, izin: 0 },
      'B': { hadir: 0, izin: 0 },
    }

    records.forEach((record) => {
      const participant = participants.find((p) => p.id === record.participantId)
      const kategori = participant?.kategori || record.tempKategori
      if (kategori && kategoriMap[kategori]) {
        if (record.status === 'hadir') {
          kategoriMap[kategori].hadir++
        } else {
          kategoriMap[kategori].izin++
        }
      }
    })

    return Object.entries(kategoriMap).map(([name, data]) => ({
      name: `Kategori ${name}`,
      ...data,
      total: data.hadir + data.izin,
    }))
  },

  getIndividualReport(startDate: Date, endDate: Date) {
    const records = attendanceService.getByDateRange(startDate, endDate)
    const participants = participantService.getActive()

    return participants.map((participant) => {
      const participantRecords = records.filter((r) => r.participantId === participant.id)
      const hadir = participantRecords.filter((r) => r.status === 'hadir').length
      const izin = participantRecords.filter((r) => r.status === 'izin').length
      const total = hadir + izin

      return {
        ...participant,
        totalHadir: hadir,
        totalIzin: izin,
        totalRecords: total,
        attendanceRate: total > 0 ? Math.round((hadir / total) * 100) : 0,
      }
    })
  },
}

// === Clear All Data (for testing) ===
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
