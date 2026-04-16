/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicAttendanceForm } from '@/features/forms/components/PublicAttendanceForm'
import { getFormBySlug } from '@/features/forms/services'

export const Route = createFileRoute('/absensi/$formId')({
  component: PublicFormPage,
})

function PublicFormPage() {
  const { formId } = Route.useParams()

  const {
    data: formConfig,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public_form', formId],
    queryFn: () => getFormBySlug(formId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (!formConfig) return

    const title = `Absensi MuMiBig — ${formConfig.title}`
    const description = `Form kehadiran ${formConfig.title} — Absensi MuMiBig`

    document.title = title

    const setMetaByName = (name: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(
        `meta[name="${name}"]`
      )
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute('name', name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    const setMetaByProperty = (property: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(
        `meta[property="${property}"]`
      )
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute('property', property)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    setMetaByName('title', title)
    setMetaByName('description', description)
    setMetaByProperty('og:title', title)
    setMetaByProperty('og:description', description)
    setMetaByProperty('og:url', window.location.href)
    setMetaByProperty('twitter:title', title)
    setMetaByProperty('twitter:description', description)
    setMetaByProperty('twitter:url', window.location.href)
  }, [formConfig])

  if (isLoading) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center gap-4 bg-muted/30 p-4'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
        <p className='text-lg font-medium text-muted-foreground'>
          Memuat formulir...
        </p>
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
            Tautan yang Anda ikuti mungkin salah, atau formulir ini sudah tidak
            aktif lagi.
          </p>
        </div>
        <Button onClick={() => refetch()} variant='outline'>
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className='min-h-dvh w-full bg-background sm:bg-zinc-50/50 dark:sm:bg-zinc-950/50 p-0 sm:p-8 md:p-12 flex flex-col'>
      <div className='mx-auto max-w-2xl w-full flex-1 flex flex-col justify-center sm:block'>
        <PublicAttendanceForm formConfig={formConfig} />

        <div className='mt-8 pb-8 sm:pb-0 text-center'>
          <p className='text-[13px] font-medium text-zinc-400 dark:text-zinc-500'>
            &copy; {new Date().getFullYear()} Developed with 💌
          </p>
        </div>
      </div>
    </div>
  )
}
