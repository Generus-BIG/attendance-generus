import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useParticipants } from './participants-provider'

export function ParticipantsPrimaryButtons() {
  const { setOpen } = useParticipants()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Tambah Peserta</span> <Plus size={18} />
      </Button>
    </div>
  )
}
