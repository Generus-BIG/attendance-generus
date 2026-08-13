import { useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { Copy, ExternalLink, Link2, Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { type Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { firstDayOfMonth, formatMonthLabel } from '../utils/month-utils'

type PresentationShareRow =
  Database['public']['Tables']['lupg_presentation_shares']['Row']

interface PresentationShare {
  id: string
  month: string
  kelompokId: string | null
  token: string
  isActive: boolean
  createdAt: string
}

interface PresentationShareCardProps {
  monthKey: string
  kelompokId?: string
  scopeLabel: string
  enabled: boolean
}

interface PresentationShareTarget {
  monthKey: string
  kelompokId?: string
  queryKey: QueryKey
}

function mapShare(row: PresentationShareRow): PresentationShare {
  return {
    id: row.id,
    month: row.month,
    kelompokId: row.kelompok_id,
    token: row.token,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

async function fetchShare(
  monthKey: string,
  kelompokId?: string
): Promise<PresentationShare | null> {
  let query = supabase
    .from('lupg_presentation_shares')
    .select('*')
    .eq('month', firstDayOfMonth(monthKey))

  query = kelompokId
    ? query.eq('kelompok_id', kelompokId)
    : query.is('kelompok_id', null)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data ? mapShare(data as PresentationShareRow) : null
}

async function saveShareActive(
  monthKey: string,
  kelompokId: string | undefined,
  current: PresentationShare | null,
  isActive: boolean
): Promise<PresentationShare> {
  if (current) {
    const { data, error } = await supabase
      .from('lupg_presentation_shares')
      .update({ is_active: isActive })
      .eq('id', current.id)
      .select('*')
      .single()

    if (error) throw error
    return mapShare(data as PresentationShareRow)
  }

  const { data, error } = await supabase
    .from('lupg_presentation_shares')
    .insert({
      month: firstDayOfMonth(monthKey),
      kelompok_id: kelompokId ?? null,
      is_active: isActive,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapShare(data as PresentationShareRow)
}

async function rotateShare(id: string): Promise<PresentationShare> {
  const { data, error } = await supabase.rpc('rotate_lupg_presentation_share', {
    p_share_id: id,
  })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Share rotation returned no row')
  return mapShare(row as PresentationShareRow)
}

export function PresentationShareCard({
  monthKey,
  kelompokId,
  scopeLabel,
  enabled,
}: PresentationShareCardProps) {
  const queryClient = useQueryClient()
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  const queryKey = [
    'lupg',
    'presentation-share',
    monthKey,
    kelompokId ?? 'desa',
  ] as const
  const target: PresentationShareTarget = { monthKey, kelompokId, queryKey }
  const { data: share = null, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchShare(monthKey, kelompokId),
    enabled,
  })

  const saveMutation = useMutation({
    mutationFn: ({
      isActive,
      current,
      target,
    }: {
      isActive: boolean
      current: PresentationShare | null
      target: PresentationShareTarget
    }) =>
      saveShareActive(target.monthKey, target.kelompokId, current, isActive),
    onMutate: async ({ isActive, current, target }) => {
      await queryClient.cancelQueries({ queryKey: target.queryKey })
      const previous =
        queryClient.getQueryData<PresentationShare | null>(target.queryKey) ??
        null
      queryClient.setQueryData<PresentationShare | null>(
        target.queryKey,
        current
          ? { ...current, isActive }
          : {
              id: 'pending',
              month: firstDayOfMonth(target.monthKey),
              kelompokId: target.kelompokId ?? null,
              token: '',
              isActive,
              createdAt: '',
            }
      )
      return { previous }
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        variables.target.queryKey,
        context?.previous ?? null
      )
      toast.error('Status sharing gagal disimpan.')
    },
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(variables.target.queryKey, saved)
      toast.success(
        saved.isActive
          ? 'Link presentasi sekarang aktif.'
          : 'Link presentasi dinonaktifkan.'
      )
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: variables.target.queryKey })
    },
  })

  const rotateMutation = useMutation({
    mutationFn: ({ id }: { id: string; queryKey: QueryKey }) => rotateShare(id),
    onSuccess: (rotated, variables) => {
      queryClient.setQueryData(variables.queryKey, rotated)
      setRotateDialogOpen(false)
      toast.success('Link baru sudah dibuat. Link lama tidak berlaku.')
    },
    onError: () => {
      toast.error('Link presentasi gagal diganti.')
    },
  })

  const publicUrl =
    share?.token && typeof window !== 'undefined'
      ? `${window.location.origin}/share/lupg/presentation/${share.token}`
      : ''
  const busy = saveMutation.isPending || rotateMutation.isPending
  const canUseLink = Boolean(share?.isActive && publicUrl)
  const saveActive = (isActive: boolean) =>
    saveMutation.mutate({
      isActive,
      current: share?.id === 'pending' ? null : share,
      target,
    })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success('Link presentasi disalin.')
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
      <Card className='h-full'>
        <CardHeader>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40'>
              <Link2 className='size-5' />
            </div>
            <div className='min-w-0'>
              <CardTitle className='text-balance'>Bagikan Presentasi</CardTitle>
              <CardDescription className='mt-1 text-pretty'>
                Link khusus {formatMonthLabel(monthKey)} · {scopeLabel}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-5'>
          <div className='flex min-h-16 items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3'>
            <div>
              <Label htmlFor='presentation-sharing' className='font-medium'>
                Sharing publik
              </Label>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {share?.isActive
                  ? 'Siap dibuka siapa saja'
                  : 'Tidak dapat dibuka'}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className='size-5 animate-spin text-muted-foreground' />
            ) : (
              <Switch
                id='presentation-sharing'
                checked={share?.isActive ?? false}
                onCheckedChange={(isActive) => {
                  if (isActive && !share?.isActive) setPublishDialogOpen(true)
                  else saveActive(false)
                }}
                disabled={!enabled || busy}
                aria-label='Aktifkan sharing presentasi'
                className='h-7 w-12 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb]]:transition-transform [&_[data-slot=switch-thumb]]:duration-200 [&_[data-slot=switch-thumb]]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-6'
              />
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='presentation-share-url'>URL publik</Label>
            <Input
              id='presentation-share-url'
              readOnly
              value={publicUrl}
              placeholder={
                enabled
                  ? 'Aktifkan sharing untuk membuat link'
                  : 'Kelompok belum dapat ditentukan'
              }
              className='font-mono text-xs'
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={copyLink}
              disabled={!canUseLink || busy}
              className='min-h-11'
            >
              <Copy className='mr-2 size-4' />
              Salin
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={openLink}
              disabled={!canUseLink || busy}
              className='min-h-11'
            >
              <ExternalLink className='mr-2 size-4' />
              Buka
            </Button>
            <Button
              type='button'
              variant='ghost'
              onClick={() => setRotateDialogOpen(true)}
              disabled={!share?.token || busy}
              className='min-h-11 sm:ml-auto'
            >
              <RotateCw className='mr-2 size-4' />
              Ganti Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publikasikan presentasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Presentasi {scopeLabel} untuk {formatMonthLabel(monthKey)} dapat
              dibuka oleh siapa pun yang memiliki link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saveMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saveMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                saveActive(true)
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
            <AlertDialogTitle>Ganti link presentasi?</AlertDialogTitle>
            <AlertDialogDescription>
              URL lama langsung tidak berlaku. Orang yang masih memiliki URL
              tersebut tidak akan dapat membuka presentasi lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotateMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!share || rotateMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (share) rotateMutation.mutate({ id: share.id, queryKey })
              }}
            >
              {rotateMutation.isPending && (
                <Loader2 className='mr-2 size-4 animate-spin' />
              )}
              Ganti Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
