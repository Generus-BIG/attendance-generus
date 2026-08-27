import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/403')({
  component: ForbiddenPage,
})

function ForbiddenPage() {
  const router = useRouter()
  return (
    <div className='flex h-[80vh] flex-col items-center justify-center gap-4'>
      <div className='text-7xl font-bold text-muted-foreground'>403</div>
      <h1 className='text-2xl font-semibold'>Akses Ditolak</h1>
      <p className='text-muted-foreground'>
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <Button
        variant='outline'
        onClick={() =>
          router.navigate({
            to: '/admin/dashboard',
            search: {
              tab: 'desa',
              month: new Date().toLocaleDateString('sv').slice(0, 7),
            },
          })
        }
      >
        Kembali ke Dashboard
      </Button>
    </div>
  )
}
