import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import {
  useWorkspaceStore,
  type Workspace,
} from '@/stores/workspace-store'

function deriveWorkspaceFromPath(pathname: string): Workspace {
  if (pathname.startsWith('/admin/lupg')) return 'lupg'
  return 'absensi'
}

export function useActiveWorkspace(): {
  activeWorkspace: Workspace
  setActiveWorkspace: (ws: Workspace) => void
} {
  const { pathname } = useLocation()
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const setActiveWorkspace = useWorkspaceStore(
    (s) => s.setActiveWorkspace
  )

  useEffect(() => {
    const derived = deriveWorkspaceFromPath(pathname)
    if (derived !== activeWorkspace) {
      setActiveWorkspace(derived)
    }
  }, [pathname, activeWorkspace, setActiveWorkspace])

  return { activeWorkspace, setActiveWorkspace }
}
