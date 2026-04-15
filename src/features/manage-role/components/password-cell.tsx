import { useState } from 'react'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useManageRoleCRUD } from '../context/manage-role-context'
import { type ManagedUser } from '../types'

type PasswordCellProps = {
  user: ManagedUser
}

export function PasswordCell({ user }: PasswordCellProps) {
  const [visible, setVisible] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const { resetPassword } = useManageRoleCRUD()

  if (user.temp_password === null) {
    return (
      <span className='text-sm text-muted-foreground italic'>
        Reset email terkirim
      </span>
    )
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await resetPassword(user.id, user.email)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className='flex items-center gap-1'>
      <span className='font-mono text-sm'>
        {visible ? user.temp_password : '••••••••'}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {visible ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={handleReset}
        disabled={isResetting}
        aria-label='Reset password'
      >
        <RotateCcw className='h-3 w-3' />
      </Button>
    </div>
  )
}
