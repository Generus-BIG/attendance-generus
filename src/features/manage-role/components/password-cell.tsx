import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ManagedUser } from '../types'

type PasswordCellProps = {
  user: ManagedUser
}

export function PasswordCell({ user }: PasswordCellProps) {
  const [visible, setVisible] = useState(false)

  if (!user.temp_password) {
    return (
      <span className='text-sm text-muted-foreground italic'>
        Tidak tersedia
      </span>
    )
  }

  return (
    <div className='flex items-center gap-1'>
      <span className='font-mono text-sm'>
        {visible ? user.temp_password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='h-6 w-6'
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {visible ? (
          <EyeOff className='h-3 w-3' />
        ) : (
          <Eye className='h-3 w-3' />
        )}
      </Button>
    </div>
  )
}
