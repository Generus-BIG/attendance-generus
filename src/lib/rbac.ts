// === Role Types ===
export const ROLES = [
  'super_admin',
  'admin',
  'team_manager',
  'mt',
  'member',
] as const
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
  mt: {
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
  '/admin/dashboard': ['super_admin', 'admin', 'team_manager', 'member'],
  '/admin/participants': ['super_admin', 'admin', 'team_manager', 'member'],
  '/admin/attendance': ['super_admin', 'admin', 'team_manager', 'member'],
  '/admin/forms': ['super_admin', 'admin', 'team_manager', 'member'],
  '/admin/approvals': ['super_admin', 'admin', 'team_manager', 'member'],
  '/admin/lupg': ['super_admin', 'admin', 'team_manager'],
  '/admin/lupg/phq/summary': ['super_admin', 'admin', 'mt'],
  '/admin/lupg/phq/participants': ['super_admin', 'admin', 'mt'],
  '/admin/lupg/phq/progress': ['super_admin', 'admin', 'mt'],
  '/admin/lupg/phq/attendance': ['super_admin', 'admin', 'mt'],
  '/admin/lupg/apr-intensif': ['super_admin', 'admin', 'mt'],
  '/admin/lupg/ar-intensif': ['super_admin', 'admin', 'mt'],
  '/admin/manage-role': ['super_admin', 'admin'],
  '/admin/forms/create': ['super_admin', 'admin'],
  '/admin/dashboard-sharing': ['super_admin', 'admin'],
  '/admin/lupg/dashboard': ['super_admin', 'admin'],
  // Note: /admin/lupg/reports (the list) redirects admin/super_admin to the dashboard
  // at the route-component level (see routes/admin/lupg/reports/index.tsx beforeLoad).
  // The $monthlyReportId detail page stays accessible to all three roles so admins
  // can click through to individual reports from the dashboard.
  // More specific entry must come before /admin/lupg/recap so longest-prefix
  // matching in route.tsx allows team_manager to reach the presentation viewer.
  '/admin/lupg/recap/present': ['super_admin', 'admin', 'team_manager'],
  '/admin/lupg/recap': ['super_admin', 'admin'],
  '/admin/lupg/presentation': ['super_admin', 'admin', 'team_manager'],
  '/admin/lupg/mustin': ['super_admin', 'admin'],
  '/admin/lupg/config': ['super_admin', 'admin'],
}

// === Role Display ===
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  team_manager: 'Team Manager',
  mt: 'MT',
  member: 'Member',
}
