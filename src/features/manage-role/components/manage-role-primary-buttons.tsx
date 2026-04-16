import { UserPlus } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { useManageRole } from './manage-role-provider'

export function ManageRolePrimaryButtons() {
  const { can } = usePermissions()
  const { setOpen } = useManageRole()

  if (!can.manageUsers) {
    return null
  }

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Buat User Baru</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
