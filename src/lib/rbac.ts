// === Role Types ===
export const ROLES = ['super_admin', 'admin', 'team_manager', 'member'] as const
export type Role = (typeof ROLES)[number]

// === Permission Keys ===
export type PermissionKey =
  | 'manageUsers'
  | 'viewUsers'
  | 'createParticipant'
  | 'editParticipant'
  | 'deleteParticipant'
  | 'createForm'
  | 'editForm'
  | 'deleteForm'
  | 'approveParticipant'
  | 'createAttendance'
  | 'editAttendance'
  | 'deleteAttendance'

// === Permission Map ===
const PERMISSION_MAP: Record<Role, Record<PermissionKey, boolean>> = {
  super_admin: {
    manageUsers: true,
    viewUsers: true,
    createParticipant: true,
    editParticipant: true,
    deleteParticipant: true,
    createForm: true,
    editForm: true,
    deleteForm: true,
    approveParticipant: true,
    createAttendance: true,
    editAttendance: true,
    deleteAttendance: true,
  },
  admin: {
    manageUsers: false,
    viewUsers: true,
    createParticipant: true,
    editParticipant: true,
    deleteParticipant: true,
    createForm: true,
    editForm: true,
    deleteForm: true,
    approveParticipant: true,
    createAttendance: true,
    editAttendance: true,
    deleteAttendance: true,
  },
  team_manager: {
    manageUsers: false,
    viewUsers: false,
    createParticipant: true,
    editParticipant: true,
    deleteParticipant: true,
    createForm: false,
    editForm: false,
    deleteForm: false,
    approveParticipant: false,
    createAttendance: true,
    editAttendance: true,
    deleteAttendance: true,
  },
  member: {
    manageUsers: false,
    viewUsers: false,
    createParticipant: false,
    editParticipant: false,
    deleteParticipant: false,
    createForm: false,
    editForm: false,
    deleteForm: false,
    approveParticipant: false,
    createAttendance: false,
    editAttendance: false,
    deleteAttendance: false,
  },
}

export function getPermissions(role: Role): Record<PermissionKey, boolean> {
  return PERMISSION_MAP[role]
}

// === Interfaces ===
export interface Permissions {
  role: Role
  kelompok: string | null
  can: Record<PermissionKey, boolean>
}

// === Route Access ===
// Uses prefix match via String.startsWith in src/routes/admin/route.tsx.
// Sub-routes inherit the parent's access rule (e.g., /admin/lupg/recap/present
// inherits from /admin/lupg/recap). Keep in sync with sidebar-data-lupg.ts
// visibility gating.
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/admin/manage-role': ['super_admin', 'admin'],
  '/admin/forms/create': ['super_admin', 'admin'],
  '/admin/lupg/config': ['super_admin', 'admin'],
  '/admin/lupg/dashboard': ['super_admin', 'admin'],
  '/admin/lupg/recap': ['super_admin', 'admin'],
  '/admin/lupg/mustin': ['super_admin', 'admin'],
}

// === Role Display ===
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_manager: 'Team Manager',
  member: 'Member',
}
