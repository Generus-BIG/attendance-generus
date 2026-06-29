import { Download, Plus } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permission-gate'
import { useParticipants } from './participants-provider'
import { useParticipantsCRUD } from '../context/participants-context'

export function ParticipantsPrimaryButtons() {
  const { setOpen } = useParticipants()
  const { participants } = useParticipantsCRUD()
  const { can } = usePermissions()

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
      <PermissionGate allowed={can.createParticipant}>
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>Tambah Peserta</span> <Plus size={18} />
        </Button>
      </PermissionGate>
    </div>
  )
}
