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

export function ParticipantsPrimaryButtons() {
  const { setOpen } = useParticipants()
  const { participants } = useParticipantsCRUD()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('export')}
        disabled={participants.length === 0}
      >
        <span>Export</span> <Download size={18} />
      </Button>
      <PermissionGate allowed={can.syncSensus}>
        <Button
          variant='outline'
          className='space-x-1'
          disabled={syncing}
          onClick={async () => {
            setSyncing(true)
            try {
              const r = await stageSensusSync()
              toast.success(`${r.staged} baris sensus siap direview`)
              navigate({
                to: '/admin/approvals',
                search: { tab: 'sync', run: r.run_id },
              })
            } catch {
              toast.error('Gagal mengambil data sensus web')
            } finally {
              setSyncing(false)
            }
          }}
        >
          <span>Sync Sensus</span> <RefreshCw size={18} />
        </Button>
      </PermissionGate>
      <PermissionGate allowed={can.createParticipant}>
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>Tambah Peserta</span> <Plus size={18} />
        </Button>
      </PermissionGate>
    </div>
  )
}
