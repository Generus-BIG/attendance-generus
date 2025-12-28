import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAttendance } from './attendance-provider'

export function AttendancePrimaryButtons() {
  const { setOpen } = useAttendance()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Input Absensi</span> <Plus size={18} />
      </Button>
    </div>
  )
}
