import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { fetchFormsByType } from '@/features/dashboard/services/dashboard-forms.service'
import { useDashboardShares, useDeleteDashboardShare } from '../hooks'
import type { DashboardShareConfig } from '../types'
import { ShareConfigDialog } from './share-config-dialog'

export function DashboardSharingPage() {
  const { data: shares = [], isLoading } = useDashboardShares()
  const deleteMutation = useDeleteDashboardShare()
  const { data: forms = [] } = useQuery({
    queryKey: ['dashboard-forms', 'desa'],
    queryFn: () => fetchFormsByType({ formType: 'desa' }),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentShare, setCurrentShare] = useState<DashboardShareConfig | null>(
    null
  )

  const formNameById = useMemo(
    () => new Map(forms.map((form) => [form.id, form.title])),
    [forms]
  )

  function openCreate() {
    setCurrentShare(null)
    setDialogOpen(true)
  }

  function openEdit(share: DashboardShareConfig) {
    setCurrentShare(share)
    setDialogOpen(true)
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/share/dashboard/${token}`
    )
    toast.success('Link publik disalin.')
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Dashboard Sharing
            </h2>
            <p className='text-muted-foreground'>
              Kelola link publik untuk Dashboard Desa.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className='mr-2 h-4 w-4' />
            Buat Link
          </Button>
        </div>

        <div className='grid gap-3'>
          {shares.map((share) => (
            <Card key={share.id}>
              <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0'>
                <div>
                  <CardTitle className='text-base'>{share.name}</CardTitle>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {share.formMode === 'all'
                      ? 'Semua Form Desa'
                      : share.formIds
                          .map(
                            (id) =>
                              formNameById.get(id) ?? 'Form tidak ditemukan'
                          )
                          .join(', ')}
                  </p>
                </div>
                <Badge variant={share.isActive ? 'default' : 'secondary'}>
                  {share.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </CardHeader>
              <CardContent className='flex flex-wrap items-center justify-between gap-2'>
                <code className='rounded bg-muted px-2 py-1 text-xs'>
                  /share/dashboard/{share.token}
                </code>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => copyLink(share.token)}
                  >
                    <Copy className='mr-2 h-4 w-4' />
                    Copy
                  </Button>
                  <Button asChild variant='outline' size='sm'>
                    <a
                      href={`/share/dashboard/${share.token}`}
                      target='_blank'
                      rel='noreferrer'
                    >
                      <ExternalLink className='mr-2 h-4 w-4' />
                      Buka
                    </a>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => openEdit(share)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => deleteMutation.mutate(share.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && shares.length === 0 && (
            <Card>
              <CardContent className='py-10 text-center text-sm text-muted-foreground'>
                Belum ada link public dashboard.
              </CardContent>
            </Card>
          )}
        </div>

        <ShareConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          share={currentShare}
          forms={forms}
        />
      </Main>
    </>
  )
}
