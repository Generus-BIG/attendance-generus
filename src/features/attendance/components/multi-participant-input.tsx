import { useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
        <Command shouldFilter>
          <CommandInput
            ref={inputRef}
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder='Cari nama peserta...'
          />
          <CommandList
            className='touch-pan-y overscroll-contain'
            style={{
              maxHeight: '16rem',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <CommandEmpty>Peserta tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {participants.map((participant) => {
                const isSelected = value.includes(participant.id)
                return (
                  <CommandItem
                    key={participant.id}
                    value={`${participant.name} ${participant.kelompok} ${participant.kategori}`}
                    onSelect={() => toggleParticipant(participant.id)}
                  >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className='flex flex-col'>
                    <span>{participant.name}</span>
                    <span className='text-muted-foreground text-xs'>
                      {participant.kelompok} - {participant.kategori}
                    </span>
                  </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
