import { useEffect, useReducer } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { CheckCircle2, Loader2, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  KELOMPOK,
  KATEGORI,
  GENDER,
  ATTENDANCE_STATUS,
  PERMISSION_REASONS,
} from '@/lib/schema'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  getFormConfiguredKelompok,
  getFormKelompokOptions,
} from '../form-options'
import { submitAttendanceForm, searchParticipants } from '../services'
import { getRegisterParticipantUrl } from '../utils/public-form-url'

const publicFormSchema = z
  .object({
    participantId: z.string().optional().nullable(),
    tempName: z.string().min(2, 'Nama minimal 2 karakter'),
    tempGender: z.enum(GENDER),
    tempKelompok: z.enum(KELOMPOK),
    tempKategori: z.enum(KATEGORI),
    status: z.enum(ATTENDANCE_STATUS),
    permissionReason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      !(
        data.permissionReason === 'Lainnya' &&
        (!data.notes || data.notes.trim().length < 2)
      ),
    { message: 'Detail izin wajib diisi minimal 2 karakter', path: ['notes'] }
  )

type PublicFormValues = z.infer<typeof publicFormSchema>

interface PublicAttendanceFormProps {
  formConfig: {
    id: string
    title: string
    slug: string
    description?: string | null
    allowedCategories?: string[]
    formType?: 'desa' | 'kelompok'
    kelompokId?: string | null
    kelompokName?: string | null
  }
}

export function PublicAttendanceForm({
  formConfig,
}: PublicAttendanceFormProps) {
  const [state, setState] = useReducer(
    (
      current: {
        isSubmitted: boolean
        isSubmitting: boolean
        submittedName: string
        submittedGender: 'L' | 'P' | undefined
        open: boolean
        searchQuery: string
        debouncedQuery: string
      },
      change: Partial<typeof current>
    ) => ({ ...current, ...change }),
    {
      isSubmitted: false,
      isSubmitting: false,
      submittedName: '',
      submittedGender: undefined,
      open: false,
      searchQuery: '',
      debouncedQuery: '',
    }
  )
  const {
    isSubmitted,
    isSubmitting,
    submittedName,
    submittedGender,
    open,
    searchQuery,
    debouncedQuery,
  } = state

  const form = useForm<PublicFormValues>({
    resolver: zodResolver(publicFormSchema),
    defaultValues: {
      tempName: '',
      notes: '',
    },
  })

  const attendanceStatus = form.watch('status')
  const permissionReason = form.watch('permissionReason')
  const configuredKelompok = getFormConfiguredKelompok(formConfig)
  const kelompokOptions = getFormKelompokOptions(
    formConfig.formType,
    formConfig.kelompokName
  )
  const registerUrl = getRegisterParticipantUrl(formConfig.slug)

  useEffect(() => {
    if (!configuredKelompok) return
    form.setValue('tempKelompok', configuredKelompok)
  }, [configuredKelompok, form])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setState({ debouncedQuery: searchQuery })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data: participants = [],
    isError: isParticipantSearchError,
    isLoading: isLoadingParticipants,
  } = useQuery({
    queryKey: [
      'participants',
      debouncedQuery,
      formConfig.allowedCategories,
      formConfig.id,
    ],
    queryFn: () => searchParticipants(formConfig.id, debouncedQuery),
    enabled: open, // Fetch when popover is open, even with empty query
    staleTime: 1000 * 60, // 1 minute
  })

  async function onSubmit(data: PublicFormValues) {
    setState({ isSubmitting: true })
    try {
      await submitAttendanceForm(formConfig.id, {
        participantId: data.participantId ?? undefined,
        status: data.status,
        permissionReason: data.permissionReason ?? undefined,
        notes: data.notes ?? undefined,
        tempName: data.tempName,
        tempKelompok: configuredKelompok ?? data.tempKelompok,
        tempKategori: data.tempKategori,
        tempGender: data.tempGender,
      })
      setState({
        submittedName: data.tempName,
        submittedGender: data.tempGender,
        isSubmitted: true,
      })
      toast.success('Absensi berhasil dikirim!')
    } catch (_error) {
      toast.error('Gagal mengirim absensi. Silakan coba lagi.')
    } finally {
      setState({ isSubmitting: false })
    }
  }

  const handleSelectParticipant = (participant: {
    id: string
    name: string
    gender: string
    group: string
    category: string
  }) => {
    form.setValue('participantId', participant.id)
    form.setValue('tempName', participant.name)

    // Auto-fill and map values if possible
    if (participant.gender === 'L' || participant.gender === 'P') {
      form.setValue('tempGender', participant.gender as 'L' | 'P')
    }

    // Validate against enums or set directly if matching
    if (KELOMPOK.includes(participant.group as (typeof KELOMPOK)[number])) {
      form.setValue(
        'tempKelompok',
        configuredKelompok ?? (participant.group as (typeof KELOMPOK)[number])
      )
    }

    // Map Categories: "GPN A" -> "A", "GPN B" -> "B", "AR" -> "AR"
    let category = participant.category
    if (category === 'GPN A') category = 'A'
    if (category === 'GPN B') category = 'B'
    if (category === 'Anak Remaja') category = 'AR'

    if (KATEGORI.includes(category as (typeof KATEGORI)[number])) {
      form.setValue('tempKategori', category as (typeof KATEGORI)[number])
    }

    setState({ open: false })
  }

  if (isSubmitted) {
    const honorific =
      submittedGender === 'P'
        ? 'Mba'
        : submittedGender === 'L'
          ? 'Mas'
          : 'Mas atau Mba'

    return (
      <Card className='mx-auto w-full max-w-lg border-0 bg-background shadow-none sm:rounded-lg sm:border sm:border-border/40 sm:shadow-xl'>
        <CardContent className='flex flex-col items-center gap-6 px-6 pt-10 pb-8 text-center sm:px-10 sm:pt-12'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-50'>
            <CheckCircle2
              className='h-10 w-10 animate-in text-green-500 transition-[transform] duration-300 ease-out zoom-in motion-reduce:animate-none'
              strokeWidth={1.75}
            />
          </div>

          <span className='font-mono text-[12px] tracking-widest text-muted-foreground uppercase tabular-nums'>
            Absensi tersimpan &middot;{' '}
            {format(new Date(), 'dd MMM yyyy', { locale: idLocale })}
          </span>

          <div className='space-y-2'>
            <h1 className='font-display text-[1.75rem] leading-[1.15] font-bold tracking-tight text-foreground'>
              Alhamdulillah, {honorific} {submittedName || 'peserta'}.
            </h1>
            <p className='text-[15px] leading-relaxed text-muted-foreground'>
              Absensi untuk{' '}
              <span className='font-semibold text-foreground'>
                {formConfig.title}
              </span>{' '}
              sudah tercatat.
            </p>
          </div>

          <p className='max-w-sm text-[14px] leading-relaxed text-muted-foreground italic'>
            Alhamdulillahi Jazakumullahu Khoiro. Jika ada teman yang belum
            absen, mohon amsol diingatkan.
          </p>

          <Separator className='my-1' />

          <p className='text-[13px] text-muted-foreground'>
            Kamu bisa menutup halaman ini.
          </p>

          <Button
            type='button'
            variant='outline'
            className='h-11 min-w-40 rounded-lg px-6 text-[14px] font-semibold'
            onClick={() => {
              setState({
                isSubmitted: false,
                submittedName: '',
                submittedGender: undefined,
              })
              form.reset({
                participantId: undefined,
                tempName: '',
                tempGender: undefined,
                tempKelompok: configuredKelompok ?? undefined,
                tempKategori: undefined,
                status: undefined,
                permissionReason: undefined,
                notes: '',
              })
              setState({ searchQuery: '', debouncedQuery: '' })
            }}
          >
            Kirim absensi lain
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='mx-auto w-full max-w-lg border-0 bg-background shadow-none sm:rounded-lg sm:border sm:border-border/40 sm:shadow-xl'>
      <CardHeader className='space-y-2 px-6 pt-8 pb-4 sm:px-8'>
        <div className='flex flex-col gap-1.5'>
          <CardTitle className='font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight text-foreground'>
            {formConfig.title}
          </CardTitle>
          <span className='font-mono text-[13px] font-medium tracking-wider text-muted-foreground/80 uppercase tabular-nums'>
            {format(new Date(), 'dd MMM yyyy', { locale: idLocale })}
          </span>
        </div>
        {formConfig.description && (
          <CardDescription className='pt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/80'>
            {formConfig.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className='px-6 pb-8 sm:px-8'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-10'>
            <div className='space-y-6'>
              <FormField
                control={form.control}
                name='tempName'
                render={({ field }) => (
                  <FormItem className='flex flex-col space-y-2'>
                    <FormLabel className='text-[15px] font-semibold text-foreground'>
                      Nama Lengkap
                    </FormLabel>
                    <Popover
                      open={open}
                      onOpenChange={(open) => setState({ open })}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={open}
                            className={cn(
                              'group h-12 w-full justify-between rounded-lg border-border px-4 font-normal shadow-sm transition-colors hover:bg-muted',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? field.value : 'Cari nama peserta...'}
                            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className='w-(--radix-popover-trigger-width) max-w-lg overflow-hidden rounded-lg border-border p-0 shadow-xl'
                        align='start'
                      >
                        <Command shouldFilter={false} className='bg-popover'>
                          <CommandInput
                            placeholder='Cari nama...'
                            value={searchQuery}
                            onValueChange={(searchQuery) =>
                              setState({ searchQuery })
                            }
                            autoCapitalize='words'
                            autoCorrect='off'
                            spellCheck={false}
                            className='h-12 border-b border-border/70 focus:ring-0'
                          />
                          <CommandList className='max-h-75 overflow-y-auto'>
                            {isLoadingParticipants && (
                              <CommandGroup>
                                <div className='flex items-center justify-center p-6 text-sm font-medium text-muted-foreground'>
                                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                  Mencari...
                                </div>
                              </CommandGroup>
                            )}
                            {!isLoadingParticipants &&
                              isParticipantSearchError && (
                                <CommandEmpty className='py-4 text-center text-[15px]'>
                                  <span className='font-medium text-destructive'>
                                    Pencarian peserta sedang tidak tersedia.
                                    Silakan coba lagi.
                                  </span>
                                </CommandEmpty>
                              )}
                            {!isLoadingParticipants &&
                              !isParticipantSearchError &&
                              participants.length === 0 && (
                                <CommandEmpty className='py-4 text-center text-[15px]'>
                                  <div className='flex flex-col items-center justify-center gap-3 px-4 py-2'>
                                    <span className='font-medium text-muted-foreground'>
                                      Nama tidak ditemukan.
                                    </span>
                                    <Button
                                      variant='secondary'
                                      asChild
                                      className='h-10 w-full rounded-lg px-6 text-sm font-medium sm:w-auto'
                                    >
                                      <a href={registerUrl}>
                                        Klik buat daftar!
                                      </a>
                                    </Button>
                                  </div>
                                </CommandEmpty>
                              )}
                            <CommandGroup className='p-1.5'>
                              {participants.map((participant) => (
                                <CommandItem
                                  key={participant.id}
                                  value={participant.name}
                                  onSelect={() =>
                                    handleSelectParticipant(participant)
                                  }
                                  className={cn(
                                    'my-0.5 flex cursor-pointer items-center rounded-lg px-3.5 py-3 transition-colors',
                                    participant.name === field.value
                                      ? 'bg-accent'
                                      : 'aria-selected:bg-accent/60'
                                  )}
                                >
                                  <div className='flex w-full min-w-0 flex-col gap-0.5'>
                                    <span className='text-[15px] font-medium'>
                                      {participant.name}
                                    </span>
                                    <span className='font-mono text-[12px] font-medium tracking-wider text-muted-foreground uppercase tabular-nums'>
                                      {participant.group} &bull;{' '}
                                      {participant.category} &bull;{' '}
                                      {participant.gender === 'L' ? 'L' : 'P'}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4 sm:gap-6'>
                <FormField
                  control={form.control}
                  name='tempGender'
                  render={({ field }) => (
                    <FormItem className='flex flex-col space-y-2'>
                      <FormLabel className='text-[15px] font-semibold text-foreground'>
                        Jenis Kelamin
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className='h-12 rounded-lg border-border px-4 font-normal shadow-sm transition-colors hover:bg-muted'>
                            <SelectValue
                              placeholder='Pilih'
                              className='text-muted-foreground'
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='rounded-lg border-border shadow-lg'>
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
                    <FormItem className='flex flex-col space-y-2'>
                      <FormLabel className='text-[15px] font-semibold text-foreground'>
                        Kelompok
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={!!configuredKelompok}
                      >
                        <FormControl>
                          <SelectTrigger className='h-12 rounded-lg border-border px-4 font-normal shadow-sm transition-colors hover:bg-muted'>
                            <SelectValue
                              placeholder='Pilih'
                              className='text-muted-foreground'
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className='max-h-75 rounded-lg border-border shadow-lg'>
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
                    <FormLabel className='text-[15px] font-semibold text-foreground'>
                      Kategori
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        className='flex flex-wrap gap-x-6 gap-y-3'
                      >
                        {KATEGORI.flatMap((k) =>
                          !formConfig.allowedCategories ||
                          formConfig.allowedCategories.includes(k)
                            ? [
                                <FormItem
                                  key={k}
                                  className='group flex min-h-11 items-center gap-3 space-y-0'
                                >
                                  <FormControl>
                                    <RadioGroupItem
                                      value={k}
                                      className='h-4.5 w-4.5 border-input text-foreground shadow-sm'
                                    />
                                  </FormControl>
                                  <FormLabel className='flex-1 cursor-pointer py-2 text-[15px] font-medium text-foreground/90 transition-colors group-hover:text-foreground'>
                                    {k === 'A' || k === 'B' ? `GPN ${k}` : k}
                                  </FormLabel>
                                </FormItem>,
                              ]
                            : []
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='space-y-6'>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='flex flex-col space-y-4 border-t border-border pt-6'>
                    <FormLabel className='text-[15px] font-semibold tracking-tight text-foreground'>
                      Konfirmasi Kehadiran
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex gap-x-8 gap-y-4'
                      >
                        <FormItem className='group flex min-h-11 items-center gap-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem
                              value='hadir'
                              className='h-5 w-5 border-input text-foreground shadow-sm'
                            />
                          </FormControl>
                          <FormLabel className='flex-1 cursor-pointer py-2 text-[15px] font-bold text-foreground transition-colors group-hover:text-foreground'>
                            Hadir
                          </FormLabel>
                        </FormItem>
                        <FormItem className='group flex min-h-11 items-center gap-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem
                              value='izin'
                              className='h-5 w-5 border-input text-foreground shadow-sm'
                            />
                          </FormControl>
                          <FormLabel className='flex-1 cursor-pointer py-2 text-[15px] font-bold text-foreground transition-colors group-hover:text-foreground'>
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
                <div className='animate-in space-y-6 pt-2 transition-[opacity,transform] duration-200 ease-out fade-in slide-in-from-top-2 motion-reduce:animate-none'>
                  <FormField
                    control={form.control}
                    name='permissionReason'
                    render={({ field }) => (
                      <FormItem className='flex flex-col space-y-2'>
                        <FormLabel className='text-[15px] font-semibold text-foreground'>
                          Alasan Izin
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger className='h-12 rounded-lg border-border px-4 font-normal shadow-sm transition-colors hover:bg-muted'>
                              <SelectValue
                                placeholder='Pilih Alasan'
                                className='text-muted-foreground'
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className='rounded-lg border-border shadow-lg'>
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

                  {permissionReason === 'Lainnya' && (
                    <FormField
                      control={form.control}
                      name='notes'
                      render={({ field }) => (
                        <FormItem className='flex animate-in flex-col space-y-2 transition-[opacity,transform] duration-200 ease-out fade-in slide-in-from-top-2 motion-reduce:animate-none'>
                          <FormLabel className='text-[15px] font-semibold text-foreground'>
                            Detail Izin{' '}
                            <span className='text-destructive'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Jelaskan alasan izin kamu...'
                              className='min-h-25 resize-none rounded-lg border-border p-4 shadow-sm transition-colors hover:bg-muted/50 focus:bg-transparent'
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            <div className='space-y-6 pt-4 sm:pt-6'>
              <div className='flex justify-end'>
                <Button
                  type='submit'
                  className='h-11 rounded-xl bg-foreground px-8 text-[14px] font-semibold text-background shadow-md transition-[filter,background-color] hover:brightness-110 disabled:pointer-events-none disabled:opacity-50'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className='flex items-center gap-2'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span>Menyimpan</span>
                    </span>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>

              <div className='flex flex-col items-center gap-2 text-center'>
                <p className='text-[14px] text-muted-foreground'>
                  Belum nemu namamu?
                </p>
                <a
                  href={registerUrl}
                  className='text-[15px] font-semibold text-foreground underline decoration-foreground underline-offset-3 transition-opacity hover:opacity-75'
                >
                  Yuk isi data kamu disini
                </a>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
