import { useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type Participant } from '@/lib/schema'

type MultiParticipantInputProps = {
  participants: Participant[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function MultiParticipantInput({
  participants,
  value,
  onChange,
  placeholder = 'Pilih peserta...',
  disabled = false,
}: MultiParticipantInputProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedParticipants = useMemo(
    () => participants.filter((participant) => value.includes(participant.id)),
    [participants, value]
  )

  const toggleParticipant = (participantId: string) => {
    if (value.includes(participantId)) {
      onChange(value.filter((id) => id !== participantId))
      setSearchValue('')
      queueMicrotask(() => inputRef.current?.focus())
      return
    }
    onChange([...value, participantId])
    setSearchValue('')
    queueMicrotask(() => inputRef.current?.focus())
  }

  const removeParticipant = (participantId: string) => {
    onChange(value.filter((id) => id !== participantId))
  }

  const filteredParticipants = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return participants
    return participants.filter((participant) => {
      const haystack = `${participant.name} ${participant.kelompok} ${participant.kategori}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [participants, searchValue])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          queueMicrotask(() => inputRef.current?.focus())
        } else {
          setSearchValue('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-auto min-h-11 w-full justify-between gap-2',
            !selectedParticipants.length && 'text-muted-foreground'
          )}
        >
          <div className='flex flex-wrap items-center gap-1 text-left'>
            {selectedParticipants.length ? (
              selectedParticipants.map((participant) => (
                <Badge
                  key={participant.id}
                  variant='secondary'
                  className='flex items-center gap-1 pe-1'
                >
                  <span className='truncate'>{participant.name}</span>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      removeParticipant(participant.id)
                    }}
                    className='rounded-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    aria-label={`Hapus ${participant.name}`}
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-full p-0' align='start'>
        <div className='flex h-10 items-center gap-2 border-b px-3'>
          <Search className='size-4 shrink-0 opacity-50' />
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder='Cari nama peserta...'
            className='h-8 border-0 px-0 shadow-none focus-visible:ring-0'
          />
        </div>
        <div
          className='touch-pan-y overscroll-contain p-1'
          style={{
            maxHeight: '16rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          role='listbox'
        >
          {filteredParticipants.length === 0 ? (
            <div className='py-6 text-center text-sm text-muted-foreground'>
              Peserta tidak ditemukan.
            </div>
          ) : (
            filteredParticipants.map((participant) => {
              const isSelected = value.includes(participant.id)
              return (
                <button
                  key={participant.id}
                  type='button'
                  role='option'
                  aria-selected={isSelected}
                  onClick={() => toggleParticipant(participant.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground'
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className='flex flex-col'>
                    <span>{participant.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {participant.kelompok} - {participant.kategori}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
