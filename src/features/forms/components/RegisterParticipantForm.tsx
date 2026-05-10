import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import {
  KELOMPOK,
  KATEGORI,
  GENDER,
  ATTENDANCE_STATUS,
  PERMISSION_REASONS,
} from '@/lib/schema'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/date-picker'
import {
  getFormConfiguredKelompok,
  getFormKelompokOptions,
} from '../form-options'
import { submitPendingAttendance } from '../services'
import { getPublicFormUrl } from '../utils/public-form-url'

const registerFormSchema = z.object({
  tempName: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .regex(/^[a-zA-Z\s]*$/, 'Nama hanya boleh berisi huruf'),
  tempGender: z.enum(GENDER),
  tempKelompok: z.enum(KELOMPOK),
  tempKategori: z.enum(KATEGORI),
  birthPlace: z.string().min(2, 'Tempat lahir wajib diisi'),
  birthDate: z.date({ message: 'Tanggal lahir wajib diisi' }),
  status: z.enum(ATTENDANCE_STATUS),
  permissionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type RegisterFormValues = z.infer<typeof registerFormSchema>

interface RegisterParticipantFormProps {
  formConfig: {
    id: string
    slug: string
    title: string
    description?: string | null
    allowedCategories?: string[]
    formType?: 'desa' | 'kelompok'
    kelompokId?: string | null
    kelompokName?: string | null
  }
}

export function RegisterParticipantForm({
  formConfig,
}: RegisterParticipantFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      tempName: '',
      notes: '',
    },
  })

  const attendanceStatus = form.watch('status')
  const configuredKelompok = getFormConfiguredKelompok(formConfig)
  const kelompokOptions = getFormKelompokOptions(
    formConfig.formType,
    formConfig.kelompokName
  )
  const publicFormUrl = getPublicFormUrl(formConfig.slug)

  useEffect(() => {
    if (!configuredKelompok) return
    form.setValue('tempKelompok', configuredKelompok)
  }, [configuredKelompok, form])

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true)
    try {
      await submitPendingAttendance(formConfig.id, {
        status: data.status,
        permissionReason: data.permissionReason ?? undefined,
        notes: data.notes ?? undefined,
        tempName: data.tempName,
        tempKelompok: configuredKelompok ?? data.tempKelompok,
        tempKategori: data.tempKategori,
        tempGender: data.tempGender,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
      })
      setIsSubmitted(true)
      toast.success(
        'Pendaftaran dan Absensi berhasil dikirim! Menunggu persetujuan admin.'
      )
    } catch (_error) {
      toast.error('Gagal mengirim data. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className='mx-auto w-full max-w-md border-0 bg-background shadow-none sm:rounded-xl sm:border sm:border-border/40 sm:shadow-xl'>
        <CardHeader className='space-y-6 px-6 pt-10 text-center sm:px-8'>
          <div className='flex justify-center'>
            <div className='rounded-full bg-green-50 p-4 ring-8 ring-green-50/50 dark:bg-green-500/10 dark:ring-green-500/5'>
              <CheckCircle2 className='ease-out-back h-12 w-12 animate-in text-green-600 duration-300 zoom-in dark:text-green-500' />
            </div>
          </div>
          <CardTitle className='text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100'>
            Pendaftaran Berhasil!
          </CardTitle>
          <CardDescription className='px-2 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400'>
            Data Anda sedang ditinjau oleh admin. Absensi untuk{' '}
            <strong className='font-semibold text-zinc-900 dark:text-zinc-100'>
              {formConfig.title}
            </strong>{' '}
            juga telah dicatat.
          </CardDescription>
        </CardHeader>
        <CardFooter className='flex flex-col justify-center gap-4 px-6 pb-10 sm:px-8'>
          <Button
            asChild
            variant='outline'
            className='h-11 w-full rounded-xl border-zinc-200 px-8 font-semibold transition-colors hover:bg-zinc-50 sm:w-auto dark:border-zinc-800 dark:hover:bg-zinc-900'
          >
            <a
              href={publicFormUrl}
              onClick={() => {
                // Reset form saat kembali ke form utama
                form.reset({
                  tempName: '',
                  tempGender: undefined,
                  tempKelompok: configuredKelompok ?? undefined,
                  tempKategori: undefined,
                  birthPlace: '',
                  birthDate: undefined,
                  status: undefined,
                  permissionReason: undefined,
                  notes: '',
                })
                setIsSubmitted(false)
              }}
            >
              Kembali ke Form Utama
            </a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className='mx-auto w-full max-w-lg overflow-hidden border-0 bg-background shadow-none sm:rounded-xl sm:border sm:border-border/40 sm:shadow-xl'>
      <CardHeader className='space-y-3 px-6 pt-6 pb-4 sm:px-8 sm:pt-8'>
        <div className='mb-1'>
          <Button
            variant='ghost'
            size='sm'
            asChild
            className='-ml-3 h-9 rounded-lg font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          >
            <a href={publicFormUrl}>
              <ArrowLeft className='mr-2 h-4 w-4' /> Kembali
            </a>
          </Button>
        </div>
        <div className='flex flex-col gap-1.5'>
          <CardTitle className='text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground'>
            Pendaftaran Peserta Baru
          </CardTitle>
          <CardDescription className='mt-1 text-[15px] leading-relaxed text-foreground/80'>
            Pendaftaran untuk yang belum ada di database untuk kegiatan:{' '}
            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
              {formConfig.title}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='px-6 pb-8 sm:px-8'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 sm:space-y-7'
          >
            <FormField
              control={form.control}
              name='tempName'
              render={({ field }) => (
                <FormItem className='flex flex-col space-y-2.5'>
                  <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                    Nama Lengkap
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Masukkan nama lengkap...'
                      className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'>
              <FormField
                control={form.control}
                name='birthPlace'
                render={({ field }) => (
                  <FormItem className='flex flex-col space-y-2.5'>
                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                      Tempat Lahir
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Jakarta'
                        className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='birthDate'
                render={({ field }) => (
                  <FormItem className='mt-0.5 flex flex-col space-y-2.5'>
                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                      Tanggal Lahir
                    </FormLabel>
                    <DatePicker
                      selected={field.value}
                      onSelect={field.onChange}
                      placeholder='Pilih tanggal lahir'
                      className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='tempGender'
                render={({ field }) => (
                  <FormItem className='flex flex-col space-y-2.5'>
                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                      Jenis Kelamin
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'>
                          <SelectValue
                            placeholder='Pilih'
                            className='text-muted-foreground'
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='rounded-xl border-zinc-200 shadow-lg dark:border-zinc-800'>
                        <SelectItem
                          value='L'
                          className='my-0.5 cursor-pointer rounded-lg py-2.5 font-medium'
                        >
                          Laki-laki
                        </SelectItem>
                        <SelectItem
                          value='P'
                          className='my-0.5 cursor-pointer rounded-lg py-2.5 font-medium'
                        >
                          Perempuan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='tempKelompok'
                render={({ field }) => (
                  <FormItem className='flex flex-col space-y-2.5'>
                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                      Kelompok
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'>
                          <SelectValue
                            placeholder='Pilih'
                            className='text-muted-foreground'
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-75 rounded-xl border-zinc-200 shadow-lg dark:border-zinc-800'>
                        {kelompokOptions.map((k) => (
                          <SelectItem
                            key={k}
                            value={k}
                            className='my-0.5 cursor-pointer rounded-lg py-2.5 font-medium'
                          >
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='tempKategori'
              render={({ field }) => (
                <FormItem className='flex flex-col space-y-3.5'>
                  <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                    Kategori
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      className='flex flex-wrap gap-x-6 gap-y-3'
                    >
                      {KATEGORI.filter(
                        (k) =>
                          !formConfig.allowedCategories ||
                          formConfig.allowedCategories.includes(k)
                      ).map((k) => (
                        <FormItem
                          key={k}
                          className='group flex items-center space-y-0 space-x-3'
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={k}
                              className='h-4.5 w-4.5 border-zinc-300 text-zinc-900 shadow-sm dark:border-zinc-700 dark:text-zinc-100'
                            />
                          </FormControl>
                          <FormLabel className='cursor-pointer text-[15px] font-medium text-zinc-700 transition-colors group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-zinc-100'>
                            {k === 'AR' || k === 'APR' ? k : `GPN ${k}`}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='flex flex-col space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50'>
                  <FormLabel className='text-[16px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100'>
                    Konfirmasi Kehadiran
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex gap-x-8 gap-y-4'
                    >
                      <FormItem className='group flex items-center space-y-0 space-x-3'>
                        <FormControl>
                          <RadioGroupItem
                            value='hadir'
                            className='h-5 w-5 border-zinc-300 text-zinc-900 shadow-sm dark:border-zinc-700 dark:text-zinc-100'
                          />
                        </FormControl>
                        <FormLabel className='cursor-pointer text-[15px] font-bold text-zinc-800 transition-colors group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-zinc-100'>
                          Hadir
                        </FormLabel>
                      </FormItem>
                      <FormItem className='group flex items-center space-y-0 space-x-3'>
                        <FormControl>
                          <RadioGroupItem
                            value='izin'
                            className='h-5 w-5 border-zinc-300 text-zinc-900 shadow-sm dark:border-zinc-700 dark:text-zinc-100'
                          />
                        </FormControl>
                        <FormLabel className='cursor-pointer text-[15px] font-bold text-zinc-800 transition-colors group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-zinc-100'>
                          Izin
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {attendanceStatus === 'izin' && (
              <div className='ease-out-quart animate-in space-y-6 pt-2 duration-500 fade-in slide-in-from-top-4'>
                <FormField
                  control={form.control}
                  name='permissionReason'
                  render={({ field }) => (
                    <FormItem className='flex flex-col space-y-2.5'>
                      <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                        Alasan Izin
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className='h-12 rounded-xl border-zinc-200 px-4 font-normal shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'>
                            <SelectValue
                              placeholder='Pilih Alasan'
                              className='text-muted-foreground'
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='rounded-xl border-zinc-200 shadow-lg dark:border-zinc-800'>
                          {PERMISSION_REASONS.map((r) => (
                            <SelectItem
                              key={r}
                              value={r}
                              className='my-0.5 cursor-pointer rounded-lg py-2.5 font-medium'
                            >
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='notes'
                  render={({ field }) => (
                    <FormItem className='flex flex-col space-y-2.5'>
                      <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                        Detail Izin
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Berikan sedikit penjelasan...'
                          className='min-h-25 resize-none rounded-xl border-zinc-200 p-4 shadow-sm transition-colors hover:bg-zinc-50/50 focus:bg-transparent dark:border-zinc-800 dark:hover:bg-zinc-900/50'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className='flex justify-end pt-4 sm:pt-6'>
              <Button
                type='submit'
                className='h-13 w-40 rounded-xl bg-zinc-950 text-[15px] font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50 sm:rounded-[0.85rem] sm:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] dark:bg-white dark:text-zinc-950 dark:shadow-none dark:hover:bg-zinc-200'
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className='flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>Menyimpan</span>
                  </span>
                ) : (
                  'Submit & Daftar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
