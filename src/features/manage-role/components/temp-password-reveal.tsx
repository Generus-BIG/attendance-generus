import { useState } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Props {
  password: string | null | undefined
}

export function TempPasswordReveal({ password }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!password) {
    return <span className='text-muted-foreground text-xs'>—</span>
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    toast.success('Password tersalin')
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1.5 text-xs font-medium'
          aria-label='Tampilkan password sementara'
        >
          {open ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
          Lihat password
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-64 p-3'>
        <div className='flex flex-col gap-2'>
          <div className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
            Password sementara
          </div>
          <div className='flex items-center gap-2'>
            <code className='bg-muted flex-1 rounded px-2 py-1.5 font-mono text-sm tabular-nums'>
              {password}
            </code>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-8 w-8 shrink-0'
              onClick={() => void handleCopy()}
              aria-label='Salin password'
            >
              {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
            </Button>
          </div>
          <p className='text-muted-foreground text-xs'>
            Berikan ke user. Hanya ditampilkan sekali di layar.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
