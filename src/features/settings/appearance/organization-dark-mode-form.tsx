import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { Loader2, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import {
  getDefaultTheme,
  setDefaultTheme,
  type ThemeValue,
} from '@/lib/app-settings.service'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const THEME_CARDS: {
  value: ThemeValue
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  preview: React.ReactNode
}[] = [
  {
    value: 'light',
    label: 'Terang',
    icon: Sun,
    preview: (
      <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
        <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
          <div className='h-2 w-[80px] rounded-lg bg-[#ecedef]' />
          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
        </div>
        <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
          <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
          <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
        </div>
      </div>
    ),
  },
  {
    value: 'dark',
    label: 'Gelap',
    icon: Moon,
    preview: (
      <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
        <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
          <div className='h-2 w-[80px] rounded-lg bg-slate-400' />
          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
        </div>
        <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
          <div className='h-4 w-4 rounded-full bg-slate-400' />
          <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
        </div>
      </div>
    ),
  },
]

export function OrganizationDarkModeForm() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['app-settings', 'default_theme'],
    queryFn: getDefaultTheme,
  })

  const [selected, setSelected] = useState<ThemeValue | null>(null)

  const effectiveSelected: ThemeValue = selected ?? data?.theme ?? 'light'

  const mutation = useMutation({
    mutationFn: (theme: ThemeValue) => setDefaultTheme(theme),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['app-settings', 'default_theme'],
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

  const hasChanged = selected !== null && selected !== data?.theme

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h3 className='text-base font-semibold'>
          Tema Terang/Gelap · Organisasi
        </h3>
        <p className='text-sm text-muted-foreground'>
          Atur mode tampilan default untuk semua pengguna. Perubahan akan
          diterapkan pada sesi mereka berikutnya. Pengguna tetap dapat mengubah
          pilihan secara lokal setelahnya.
        </p>
      </div>

      {isLoading ? (
        <div
          className='flex items-center py-4 text-muted-foreground'
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
            <Label className='mb-2 block'>Pilih mode tampilan</Label>
            <div
              role='radiogroup'
              aria-label='Mode tampilan organisasi'
              className='grid grid-cols-2 gap-3 sm:max-w-xs'
            >
              {THEME_CARDS.map((t) => {
                const active = effectiveSelected === t.value
                return (
                  <button
                    key={t.value}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    onClick={() => setSelected(t.value)}
                    className={cn(
                      'flex flex-col items-stretch gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors',
                      'hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active && 'border-primary ring-2 ring-primary/30'
                    )}
                  >
                    <div className='overflow-hidden rounded-md'>
                      {t.preview}
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>{t.label}</span>
                      {data?.theme === t.value && (
                        <span className='rounded-full bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground'>
                          Aktif
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='text-xs text-muted-foreground'>
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
              onClick={() => selected !== null && mutation.mutate(selected)}
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
