import { create } from 'zustand'
import { getCookie, setCookie } from '@/lib/cookies'

export const WORKSPACES = ['absensi', 'lupg'] as const
export type Workspace = (typeof WORKSPACES)[number]

const WORKSPACE_COOKIE = 'active_workspace'
const DEFAULT_WORKSPACE: Workspace = 'absensi'

function isWorkspace(value: string | undefined): value is Workspace {
  return value === 'absensi' || value === 'lupg'
}

function readInitialWorkspace(): Workspace {
  const raw = getCookie(WORKSPACE_COOKIE)
  return isWorkspace(raw) ? raw : DEFAULT_WORKSPACE
}

interface WorkspaceState {
  activeWorkspace: Workspace
  setActiveWorkspace: (ws: Workspace) => void
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  activeWorkspace: readInitialWorkspace(),
  setActiveWorkspace: (ws) => {
    setCookie(WORKSPACE_COOKIE, ws)
    set({ activeWorkspace: ws })
  },
}))
