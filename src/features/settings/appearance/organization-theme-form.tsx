import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { IconPaletteAnthropicClaude } from '@/assets/custom/icon-palette-anthropic-claude'
import { IconPaletteModernNatural } from '@/assets/custom/icon-palette-modern-natural'
import { IconPaletteSageGreen } from '@/assets/custom/icon-palette-sage-green'
import { cn } from '@/lib/utils'
import {
  getDefaultPalette,
  setDefaultPalette,
  type PaletteValue,
} from '@/lib/app-settings.service'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const PALETTE_CARDS: {
  value: PaletteValue
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}[] = [
  {
    value: 'modern-natural',
    label: 'Modern Natural',
    icon: IconPaletteModernNatural,
  },
  {
    value: 'anthropic-claude',
    label: 'Anthropic Claude',
    icon: IconPaletteAnthropicClaude,
  },
  { value: 'sage-green', label: 'Sage Green', icon: IconPaletteSageGreen },
]

export function OrganizationThemeForm() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings', 'default_palette'],
    queryFn: getDefaultPalette,
  })

  const [selected, setSelected] = useState<PaletteValue | null>(null)

  const effectiveSelected: PaletteValue =
    selected ?? data?.palette ?? 'modern-natural'

  const mutation = useMutation({
    mutationFn: (palette: PaletteValue) => setDefaultPalette(palette),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['app-settings', 'default_palette'],
      })
      toast.success(
        'Tema organisasi diterapkan. Semua pengguna akan melihatnya pada muat ulang berikutnya.'
      )
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan'
      toast.error(msg)
    },
  })

  const hasChanged = selected !== null && selected !== data?.palette

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h3 className='text-base font-semibold'>
          Tema Organisasi · Super Admin
        </h3>
        <p className='text-muted-foreground text-sm'>
          Atur palet warna default untuk semua pengguna. Perubahan akan
          diterapkan pada sesi mereka berikutnya. Pengguna tetap dapat mengubah
          pilihan secara lokal setelahnya.
        </p>
      </div>

      {isLoading ? (
        <div
          className='text-muted-foreground flex items-center py-4'
          role='status'
          aria-live='polite'
        >
          <Loader2
            className='mr-2 h-4 w-4 animate-spin motion-reduce:animate-none'
            aria-hidden='true'
          />
          Memuat tema organisasi…
        </div>
      ) : (
        <>
          <div>
            <Label className='mb-2 block'>Pilih palet</Label>
            <div
              role='radiogroup'
              aria-label='Palet warna organisasi'
              className='grid grid-cols-1 gap-3 sm:grid-cols-3'
            >
              {PALETTE_CARDS.map((p) => {
                const active = effectiveSelected === p.value
                return (
                  <button
                    key={p.value}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    onClick={() => setSelected(p.value)}
                    className={cn(
                      'border-border bg-card flex flex-col items-stretch gap-2 rounded-lg border p-3 text-left transition-colors',
                      'hover:border-foreground/30 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                      active && 'border-primary ring-primary/30 ring-2'
                    )}
                  >
                    <p.icon aria-hidden='true' className='w-full' />
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>{p.label}</span>
                      {data?.palette === p.value && (
                        <span className='bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[0.6875rem]'>
                          Aktif
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='text-muted-foreground text-xs'>
            {data?.updated_at ? (
              <>
                Terakhir diperbarui{' '}
                {format(parseISO(data.updated_at), 'dd MMM yyyy HH:mm', {
                  locale: idLocale,
                })}
                .
              </>
            ) : null}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              onClick={() =>
                selected !== null && mutation.mutate(selected)
              }
              disabled={!hasChanged || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2
                  className='mr-2 h-4 w-4 animate-spin motion-reduce:animate-none'
                  aria-hidden='true'
                />
              ) : null}
              Terapkan untuk semua pengguna
            </Button>
            {hasChanged && (
              <Button
                type='button'
                variant='ghost'
                onClick={() => setSelected(null)}
                disabled={mutation.isPending}
              >
                Batal
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
