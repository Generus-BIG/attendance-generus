/* eslint-disable react-refresh/only-export-components */

import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getFormBySlug } from '@/features/forms/services'
import { RegisterParticipantForm } from '@/features/forms/components/RegisterParticipantForm'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const searchSchema = z.object({
  slug: z.string(),
})

export const Route = createFileRoute('/register/add-participant')({
  component: RegisterPage,
  validateSearch: (search) => searchSchema.parse(search),
})

function RegisterPage() {
  const { slug } = Route.useSearch()

  const { data: formConfig, isLoading, error, refetch } = useQuery({
    queryKey: ['public_form', slug],
    queryFn: () => getFormBySlug(slug),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center gap-4 bg-muted/30 p-4'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
        <p className='text-lg font-medium text-muted-foreground'>Memuat formulir...</p>
      </div>
    )
  }

  if (error || !formConfig) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center gap-6 bg-muted/30 p-4 text-center'>
        <div className='rounded-full bg-destructive/10 p-6'>
          <AlertCircle className='h-16 w-16 text-destructive' />
        </div>
        <div className='max-w-md space-y-2'>
          <h1 className='text-2xl font-bold'>Formulir Tidak Ditemukan</h1>
          <p className='text-muted-foreground'>
            Tautan yang Anda ikuti mungkin salah, atau formulir ini sudah tidak aktif lagi.
          </p>
        </div>
        <Button onClick={() => refetch()} variant='outline'>
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className='min-h-screen w-full bg-muted/30 p-4 sm:p-8 md:p-12'>
      <div className='mx-auto max-w-2xl'>
        <RegisterParticipantForm formConfig={formConfig} />

        <div className='mt-8 text-center'>
          <p className='text-sm text-muted-foreground/60'>
            &copy; {new Date().getFullYear()} Crafted for everyone 💛
          </p>
        </div>
      </div>
    </div>
  )
}
