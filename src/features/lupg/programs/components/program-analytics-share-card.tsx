import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  RotateCw,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { firstDayOfMonth, formatMonthLabel } from '../../utils/month-utils'

interface ShareRow {
  id: string
  month: string
  token: string
  is_active: boolean
  created_at: string
}

async function fetchShare(monthKey: string): Promise<ShareRow | null> {
  const { data, error } = await supabase
    .from('lupg_program_analytics_shares')
    .select('*')
    .eq('month', firstDayOfMonth(monthKey))
    .maybeSingle()
  if (error) throw error
  return data as ShareRow | null
}

async function saveShare(
  monthKey: string,
  current: ShareRow | null,
  active: boolean
) {
  const request = current
    ? supabase
        .from('lupg_program_analytics_shares')
        .update({ is_active: active })
        .eq('id', current.id)
    : supabase
        .from('lupg_program_analytics_shares')
        .insert({ month: firstDayOfMonth(monthKey), is_active: active })
  const { data, error } = await request.select('*').single()
  if (error) throw error
  return data as ShareRow
}

export function ProgramAnalyticsShareCard({ monthKey }: { monthKey: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['lupg', 'program-analytics-share', monthKey] as const
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const { data: share = null, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchShare(monthKey),
  })

  const saveMutation = useMutation({
    mutationFn: (active: boolean) => saveShare(monthKey, share, active),
    onSuccess: (row) => {
      queryClient.setQueryData(queryKey, row)
      queryClient.invalidateQueries({ queryKey })
      toast.success(
        row.is_active
          ? 'Link Program Analytics aktif.'
          : 'Link Program Analytics dinonaktifkan.'
      )
    },
    onError: () => toast.error('Status sharing gagal disimpan.'),
  })

  const rotateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc(
        'rotate_lupg_program_analytics_share',
        { p_share_id: id }
      )
      if (error) throw error
      return data as ShareRow
    },
    onSuccess: (row) => {
      queryClient.setQueryData(queryKey, row)
      queryClient.invalidateQueries({ queryKey })
      setRotateDialogOpen(false)
      toast.success('Link baru dibuat; link sebelumnya sudah tidak berlaku.')
    },
    onError: () => toast.error('Link gagal diganti.'),
  })

  const publicUrl =
    share?.token && typeof window !== 'undefined'
      ? `${window.location.origin}/share/lupg/program-analytics/${share.token}`
      : ''
  const busy = saveMutation.isPending || rotateMutation.isPending
  const isActive = Boolean(share?.is_active)

  const copyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link publik disalin.')
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Link tidak dapat disalin. Salin URL secara manual.')
    }
  }

  const openLink = () => {
    const popup = window.open(publicUrl, '_blank', 'noopener,noreferrer')
    if (!popup) toast.error('Browser memblokir tab baru.')
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='sm'
            aria-label='Pengaturan bagikan publik'
            className={cn(
              'group h-9 gap-2 rounded-lg border px-3 text-xs font-medium shadow-xs select-none',
              'transition-transform duration-150 active:scale-[0.97]',
              isActive
                ? 'border-emerald-500/30 bg-background/80 hover:bg-emerald-500/5 dark:border-emerald-500/20'
                : 'border-border/80 bg-background/80 hover:bg-accent/60'
            )}
          >
            <Share2 className='size-3.5 text-muted-foreground' />
            <span className='font-medium'>Share Link</span>
            <span className='h-3.5 w-px bg-border/80' aria-hidden='true' />
            {isLoading ? (
              <Loader2 className='size-3 animate-spin text-muted-foreground' />
            ) : isActive ? (
              <span className='inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400'>
                <span className='relative flex size-2'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75' />
                  <span className='relative inline-flex size-2 rounded-full bg-emerald-500' />
                </span>
                <span>Active</span>
              </span>
            ) : (
              <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
                <span className='size-1.5 rounded-full bg-muted-foreground/40' />
                <span>Inactive</span>
              </span>
            )}
            <ChevronDown className='size-3 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]:rotate-180' />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align='end'
          sideOffset={8}
          className='w-[calc(100vw-2rem)] rounded-xl border bg-popover/95 p-4 text-popover-foreground shadow-xl backdrop-blur-xs sm:w-96'
        >
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Globe className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='text-sm font-semibold tracking-tight text-foreground'>
                  Public Link Sharing
                </div>
                <div className='text-xs text-muted-foreground'>
                  Desa Overview · {formatMonthLabel(monthKey)}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {busy ? (
                <Loader2 className='size-4 animate-spin text-muted-foreground' />
              ) : (
                <Switch
                  id='program-analytics-share-switch'
                  checked={isActive}
                  onCheckedChange={(active) =>
                    active
                      ? setPublishDialogOpen(true)
                      : saveMutation.mutate(false)
                  }
                  disabled={busy}
                  aria-label='Aktifkan sharing Program Analytics'
                />
              )}
            </div>
          </div>

          <div className='my-3.5 h-px bg-border/60' />

          {!isActive ? (
            <div className='rounded-lg border border-dashed border-border/80 bg-muted/40 p-3.5 text-xs text-muted-foreground'>
              <div className='flex items-start gap-2.5'>
                <Lock className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                <div className='space-y-1'>
                  <p className='font-medium text-foreground'>
                    Sharing nonaktif
                  </p>
                  <p className='leading-relaxed'>
                    Aktifkan sakelar di atas untuk membuat link publik yang
                    dapat diakses siapa saja tanpa perlu login ke sistem.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between text-xs'>
                  <Label
                    htmlFor='program-analytics-share-url'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    URL Publik
                  </Label>
                  <span className='rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'>
                    Read-only
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Input
                    id='program-analytics-share-url'
                    value={publicUrl}
                    title={publicUrl}
                    readOnly
                    placeholder='Menyiapkan link...'
                    className='h-9 bg-muted/30 font-mono text-[11px] select-all focus-visible:ring-1'
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button
                    type='button'
                    size='sm'
                    variant={copied ? 'default' : 'secondary'}
                    onClick={copyLink}
                    disabled={!publicUrl || busy}
                    className={cn(
                      'h-9 shrink-0 px-3 text-xs font-medium transition-transform duration-150 active:scale-[0.96]',
                      copied &&
                        'bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-600'
                    )}
                    aria-label='Salin URL publik'
                  >
                    {copied ? (
                      <>
                        <Check className='mr-1.5 size-3.5 text-white' />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className='mr-1.5 size-3.5' />
                        <span>Salin</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className='flex items-center justify-between gap-2 border-t border-border/50 pt-2'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={openLink}
                  disabled={!publicUrl || busy}
                  className='h-8 px-2.5 text-xs text-muted-foreground transition-transform duration-150 hover:text-foreground active:scale-[0.96]'
                >
                  <ExternalLink className='mr-1.5 size-3.5' />
                  Buka di tab baru
                </Button>

                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setRotateDialogOpen(true)}
                  disabled={!share?.token || busy}
                  className='h-8 px-2.5 text-xs text-muted-foreground transition-transform duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]'
                >
                  <RotateCw className='mr-1.5 size-3.5' />
                  Ganti link
                </Button>
              </div>

              <p className='text-[11px] leading-tight text-muted-foreground/80'>
                Siapa saja yang memiliki link dapat menjelajahi semua bulan yang
                sudah dikirim tanpa login. Setiap halaman memuat tren 12 bulan
                berjalan, teks Resume Mustin tanpa status/PIC/tenggat, dan
                dokumentasi mengikuti bulan yang dipilih.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publikasikan Desa Overview?</AlertDialogTitle>
            <AlertDialogDescription>
              Siapa pun yang memiliki link dapat menjelajahi semua bulan yang
              sudah dikirim, dengan tren 12 bulan berjalan di setiap halaman,
              teks lengkap Resume Mustin tanpa status/PIC/tenggat, dan
              dokumentasi mengikuti bulan yang dipilih. Sensus memakai ringkasan
              desa terkini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                saveMutation.mutate(true)
                setPublishDialogOpen(false)
              }}
            >
              Publikasikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti link publik?</AlertDialogTitle>
            <AlertDialogDescription>
              Link lama langsung tidak berlaku. Siapa pun yang sudah menyimpan
              URL lama tidak bisa membuka rekap ini lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !share}
              onClick={(event) => {
                event.preventDefault()
                if (share) rotateMutation.mutate(share.id)
              }}
            >
              Ganti link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
