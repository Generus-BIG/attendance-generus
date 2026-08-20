import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Props = { viewMode: 'desa' | 'kelompok' }

export function DashboardSkeleton({ viewMode }: Props) {
  const isDesa = viewMode === 'desa'
  return (
    <div className='flex flex-col gap-5' aria-busy='true' aria-live='polite'>
      {/* KPI row */}
      <div
        className='grid gap-2'
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} data-skeleton-stagger>
            <CardContent className='p-4'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='mt-2 h-9 w-16' />
              <Skeleton className='mt-2 h-4 w-28' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hero row */}
      <div className='grid gap-4 lg:grid-cols-3'>
        <Card data-skeleton-stagger className='lg:col-span-2'>
          <CardHeader>
            <Skeleton className='h-4 w-40' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-64 w-full' />
          </CardContent>
        </Card>
        <Card data-skeleton-stagger>
          <CardHeader>
            <Skeleton className='h-4 w-32' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-64 w-full' />
          </CardContent>
        </Card>
      </div>

      {/* Distribution row (Desa only) */}
      {isDesa && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} data-skeleton-stagger>
              <CardHeader>
                <Skeleton className='h-4 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-48 w-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card data-skeleton-stagger>
        <CardHeader>
          <Skeleton className='h-4 w-40' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-64 w-full' />
        </CardContent>
      </Card>
    </div>
  )
}
