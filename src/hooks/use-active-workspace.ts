import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore, type Workspace } from '@/stores/workspace-store'

function deriveWorkspaceFromPath(pathname: string, isMt: boolean): Workspace {
  if (isMt) return 'lupg'
  if (pathname.startsWith('/admin/lupg')) return 'lupg'
  return 'absensi'
}

export function useActiveWorkspace(): {
  activeWorkspace: Workspace
  setActiveWorkspace: (ws: Workspace) => void
} {
  const { pathname } = useLocation()
  const isMt = useAuthStore((state) => state.auth.role === 'mt')
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  useEffect(() => {
    const derived = deriveWorkspaceFromPath(pathname, isMt)
    if (derived !== activeWorkspace) {
      setActiveWorkspace(derived)
    }
  }, [pathname, isMt, activeWorkspace, setActiveWorkspace])

  return { activeWorkspace, setActiveWorkspace }
}
