import { Download, Plus } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permission-gate'
import { useAttendance } from './attendance-provider'

export function AttendancePrimaryButtons() {
  const { setOpen } = useAttendance()
  const { can } = usePermissions()

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('export')}
      >
        <span>Export</span> <Download size={18} />
      </Button>
      <PermissionGate allowed={can.createAttendance}>
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>Input Absensi</span> <Plus size={18} />
        </Button>
      </PermissionGate>
    </div>
  )
}
