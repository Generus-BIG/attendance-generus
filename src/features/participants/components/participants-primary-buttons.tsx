import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Download, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permission-gate'
import { stageSensusSync } from '@/features/sensus-sync/services'
import { useParticipantsCRUD } from '../context/participants-context'
import { useParticipants } from './participants-provider'
import { SensusSyncAutomationDialog } from './sensus-sync-automation-dialog'

export function ParticipantsPrimaryButtons() {
  const { setOpen } = useParticipants()
  const { participants } = useParticipantsCRUD()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)

  return (
    <div className='grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap'>
      <Button
        variant='outline'
        className='w-full gap-1 sm:w-auto'
        onClick={() => setOpen('export')}
        disabled={participants.length === 0}
      >
        <span>Export</span> <Download size={18} />
      </Button>
      <PermissionGate allowed={can.syncSensus}>
        <Button
          variant='outline'
          className='w-full gap-1 sm:w-auto'
          disabled={syncing}
          onClick={async () => {
            setSyncing(true)
            try {
              const r = await stageSensusSync()
              toast.success(
                `${r.staged} sensus rows ready for review${
                  r.auto_applied
                    ? ` (+${r.auto_applied} added automatically)`
                    : ''
                }`
              )
              navigate({
                to: '/admin/approvals',
                search: { tab: 'sync', run: r.run_id },
              })
            } catch {
              toast.error('Could not fetch web sensus data')
            } finally {
              setSyncing(false)
            }
          }}
        >
          <span>Sync Sensus</span> <RefreshCw size={18} />
        </Button>
      </PermissionGate>
      <PermissionGate allowed={can.syncSensus}>
        <SensusSyncAutomationDialog />
      </PermissionGate>
      <PermissionGate allowed={can.createParticipant}>
        <Button
          className='w-full gap-1 sm:w-auto'
          onClick={() => setOpen('add')}
        >
          <span>Tambah Peserta</span> <Plus size={18} />
        </Button>
      </PermissionGate>
    </div>
  )
}
