import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { KELOMPOK, KATEGORI, GENDER, ATTENDANCE_STATUS, PERMISSION_REASONS } from '@/lib/schema'
import { submitAttendanceForm, searchParticipants } from '../services'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const publicFormSchema = z.object({
    participantId: z.string().optional().nullable(),
    tempName: z.string().min(2, 'Nama minimal 2 karakter'),
    tempGender: z.enum(GENDER),
    tempKelompok: z.enum(KELOMPOK),
    tempKategori: z.enum(KATEGORI),
    status: z.enum(ATTENDANCE_STATUS),
    permissionReason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

type PublicFormValues = z.infer<typeof publicFormSchema>

interface PublicAttendanceFormProps {
    formConfig: {
        id: string
        title: string
        slug: string
        description?: string | null
        allowedCategories?: string[]
    }
}

export function PublicAttendanceForm({ formConfig }: PublicAttendanceFormProps) {
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submittedName, setSubmittedName] = useState('')
    const [submittedGender, setSubmittedGender] = useState<'L' | 'P' | undefined>()

    // Search state
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')

    const form = useForm<PublicFormValues>({
        resolver: zodResolver(publicFormSchema),
        defaultValues: {
            tempName: '',
            notes: '',
        },
    })

    const attendanceStatus = form.watch('status')

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Fetch participants - also fetch when popover opens with empty query for preview
    const { data: participants = [], isLoading: isLoadingParticipants } = useQuery({
        queryKey: ['participants', debouncedQuery, formConfig.allowedCategories],
        queryFn: () => searchParticipants(debouncedQuery, formConfig.allowedCategories),
        enabled: open, // Fetch when popover is open, even with empty query
        staleTime: 1000 * 60, // 1 minute
    })

    async function onSubmit(data: PublicFormValues) {
        setIsSubmitting(true)
        try {
            await submitAttendanceForm(formConfig.id, {
                participantId: data.participantId ?? undefined,
                status: data.status,
                permissionReason: data.permissionReason ?? undefined,
                notes: data.notes ?? undefined,
                tempName: data.tempName,
                tempKelompok: data.tempKelompok,
                tempKategori: data.tempKategori,
                tempGender: data.tempGender,
            })
            setSubmittedName(data.tempName)
            setSubmittedGender(data.tempGender)
            setIsSubmitted(true)
            toast.success('Absensi berhasil dikirim!')
        } catch (_error) {
            toast.error('Gagal mengirim absensi. Silakan coba lagi.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSelectParticipant = (participant: { id: string; name: string; gender: string; group: string; category: string }) => {
        form.setValue('participantId', participant.id)
        form.setValue('tempName', participant.name)

        // Auto-fill and map values if possible
        if (participant.gender === 'L' || participant.gender === 'P') {
            form.setValue('tempGender', participant.gender as 'L' | 'P')
        }

        // Validate against enums or set directly if matching
        if (KELOMPOK.includes(participant.group as typeof KELOMPOK[number])) {
            form.setValue('tempKelompok', participant.group as typeof KELOMPOK[number])
        }

        // Map Categories: "GPN A" -> "A", "GPN B" -> "B", "AR" -> "AR"
        let category = participant.category
        if (category === 'GPN A') category = 'A'
        if (category === 'GPN B') category = 'B'
        if (category === 'Anak Remaja') category = 'AR'

        if (KATEGORI.includes(category as typeof KATEGORI[number])) {
            form.setValue('tempKategori', category as typeof KATEGORI[number])
        }

        setOpen(false)
    }

    if (isSubmitted) {
        return (
            <Card className='mx-auto w-full max-w-md border-0 sm:border sm:border-border/40 shadow-none sm:shadow-xl sm:rounded-xl bg-background'>
                <CardHeader className='text-center space-y-6 px-6 pt-10 sm:px-8'>
                    <div className='flex justify-center'>
                        <div className='rounded-full bg-green-50 dark:bg-green-500/10 p-4 ring-8 ring-green-50/50 dark:ring-green-500/5'>
                            <CheckCircle2 className='h-12 w-12 text-green-600 dark:text-green-500 animate-in zoom-in duration-300 ease-out-back' />
                        </div>
                    </div>
                    <CardTitle className='text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100'>Done! Alhamdulillah 🙌</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4 text-[15px] text-zinc-600 dark:text-zinc-400 px-6 sm:px-8 text-center leading-relaxed'>
                    <p>
                        Absensi{' '}
                        <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                            {submittedGender === 'P'
                                ? 'Mba'
                                : submittedGender === 'L'
                                ? 'Mas'
                                : 'Mas atau Mba'}{' '}
                            {submittedName || 'peserta'}
                        </span>{' '}
                        untuk{' '}
                        <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                            {formConfig.title}
                        </span>{' '}
                        sudah berhasil disimpan.
                    </p>
                    <p>Alhamdulillahi Jazakumullahu Khoiro, kalau ada teman yang belum absen, boleh amsol diingatkan ya 😊</p>
                    <p className='text-zinc-900 dark:text-zinc-100 font-medium py-2'>Kamu bisa tutup halaman ini sekarang.</p>
                </CardContent>
                <CardFooter className='flex justify-center flex-col gap-4 px-6 pb-10 sm:px-8'>
                    <Button variant='outline' className='w-full sm:w-auto h-11 px-8 rounded-xl font-semibold border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors' onClick={() => {
                        // Reset form dan state
                        setIsSubmitted(false)
                        setSubmittedName('')
                        setSubmittedGender(undefined)
                        form.reset({
                            participantId: undefined,
                            tempName: '',
                            tempGender: undefined,
                            tempKelompok: undefined,
                            tempKategori: undefined,
                            status: undefined,
                            permissionReason: undefined,
                            notes: '',
                        })
                        setSearchQuery('')
                        setDebouncedQuery('')
                    }}>
                        Kirim Absensi Lain
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className='mx-auto w-full max-w-lg border-0 sm:border sm:border-border/40 shadow-none sm:shadow-xl sm:rounded-xl overflow-hidden bg-background'>
            <CardHeader className="px-6 pt-8 pb-4 sm:px-8 space-y-2">
                <div className='flex flex-col gap-1.5'>
                    <CardTitle className='text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground'>
                        {formConfig.title}
                    </CardTitle>
                    <span className='text-[15px] font-medium text-muted-foreground/80'>
                        {format(new Date(), 'dd MMM yyyy', { locale: idLocale })}
                    </span>
                </div>
                {formConfig.description && (
                    <CardDescription className='text-[15px] leading-relaxed text-foreground/80 whitespace-pre-wrap pt-2'>
                        {formConfig.description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="px-6 pb-8 sm:px-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 sm:space-y-7'>

                        <FormField
                            control={form.control}
                            name='tempName'
                            render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2.5">
                                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                                        Nama Lengkap
                                    </FormLabel>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className={cn(
                                                        "w-full justify-between h-12 px-4 font-normal rounded-lg border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors group",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? field.value
                                                        : "Cari nama peserta..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[calc(100%-4rem)] max-w-lg p-0 rounded-xl overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)]" align="start">
                                            <Command shouldFilter={false} className="bg-white dark:bg-zinc-950">
                                                <CommandInput
                                                    placeholder="Cari nama..."
                                                    value={searchQuery}
                                                    onValueChange={setSearchQuery}
                                                    className="h-12 border-b border-zinc-100 dark:border-zinc-900 focus:ring-0"
                                                />
                                                <CommandList className="max-h-75 overflow-y-auto">
                                                    {isLoadingParticipants && (
                                                        <CommandGroup>
                                                            <div className="flex items-center justify-center p-6 text-sm text-zinc-500 font-medium">
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Mencari...
                                                            </div>
                                                        </CommandGroup>
                                                    )}
                                                    {!isLoadingParticipants && participants.length === 0 && (
                                                        <CommandEmpty className="py-4 text-center text-[15px]">
                                                            <div className="flex flex-col items-center justify-center gap-3 px-4 py-2">
                                                                <span className="text-zinc-500 font-medium">Nama tidak ditemukan.</span>
                                                                <Button variant="secondary" asChild className="w-full sm:w-auto h-10 px-6 rounded-lg font-medium text-sm">
                                                                    <Link to="/register/add-participant" search={{ slug: formConfig.slug }}>
                                                                       Klik buat daftar!
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </CommandEmpty>
                                                    )}
                                                    <CommandGroup className="p-1.5">
                                                        {participants.map((participant) => (
                                                            <CommandItem
                                                                key={participant.id}
                                                                value={participant.name} // Value for filtering if enabled, but here serves as ID
                                                                onSelect={() => handleSelectParticipant(participant)}
                                                                className="flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-lg cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-900 transition-colors"
                                                            >
                                                                <div className={cn(
                                                                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-all duration-200 mt-0.5",
                                                                      participant.name === field.value
                                                                          ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                                                                          : "border-zinc-200 dark:border-zinc-800 bg-transparent text-transparent"
                                                                  )}>
                                                                      <Check className="h-3.5 w-3.5 stroke-3" />
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                                    <span className="font-medium text-[15px] truncate">{participant.name}</span>
                                                                    <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                                                        {participant.group} • {participant.category} • {participant.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
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
                                    <FormItem className="flex flex-col space-y-2.5">
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Jenis Kelamin
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-12 px-4 font-normal rounded-lg border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'>
                                                    <SelectValue placeholder='Pilih' className="text-muted-foreground" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800 shadow-lg">
                                                <SelectItem value='L' className="cursor-pointer font-medium py-2.5 rounded-lg my-0.5">Laki-laki</SelectItem>
                                                <SelectItem value='P' className="cursor-pointer font-medium py-2.5 rounded-lg my-0.5">Perempuan</SelectItem>
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
                                    <FormItem className="flex flex-col space-y-2.5">
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Kelompok
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-12 px-4 font-normal rounded-lg border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'>
                                                    <SelectValue placeholder='Pilih' className="text-muted-foreground" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800 shadow-lg max-h-75">
                                                {KELOMPOK.map((k) => (
                                                    <SelectItem key={k} value={k} className="cursor-pointer font-medium py-2.5 rounded-lg my-0.5">{k}</SelectItem>
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
                                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Kategori</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value || undefined}
                                            className='flex gap-x-6 gap-y-3 flex-wrap'
                                        >
                                            {KATEGORI.filter(k => !formConfig.allowedCategories || formConfig.allowedCategories.includes(k)).map((k) => (
                                                <FormItem key={k} className='flex items-center space-x-3 space-y-0 group'>
                                                    <FormControl>
                                                        <RadioGroupItem value={k} className="h-4.5 w-4.5 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" />
                                                    </FormControl>
                                                    <FormLabel className='text-[15px] font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors'>
                                                        {k === 'AR' ? 'Anak Remaja' : `GPN ${k}`}
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
                                <FormItem className='flex flex-col p-6 space-y-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80'>
                                    <FormLabel className='text-[16px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight'>Konfirmasi Kehadiran</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className='flex gap-x-8 gap-y-4'
                                        >
                                            <FormItem className='flex items-center space-x-3 space-y-0 group'>
                                                <FormControl>
                                                    <RadioGroupItem value='hadir' className='h-5 w-5 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' />
                                                </FormControl>
                                                <FormLabel className='text-[15px] font-bold cursor-pointer text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors'>
                                                    Hadir
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className='flex items-center space-x-3 space-y-0 group'>
                                                <FormControl>
                                                    <RadioGroupItem value='izin' className='h-5 w-5 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' />
                                                </FormControl>
                                                <FormLabel className='text-[15px] font-bold cursor-pointer text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors'>
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
                            <div className='space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-500 ease-out-quart'>
                                <FormField
                                    control={form.control}
                                    name='permissionReason'
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col space-y-2.5">
                                            <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Alasan Izin</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value || undefined}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className='h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'>
                                                        <SelectValue placeholder='Pilih Alasan' className="text-muted-foreground" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg">
                                                    {PERMISSION_REASONS.map((r) => (
                                                        <SelectItem key={r} value={r} className="cursor-pointer font-medium py-2.5 rounded-lg my-0.5">{r}</SelectItem>
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
                                        <FormItem className="flex flex-col space-y-2.5">
                                            <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>
                                                Detail Izin
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder='Berikan sedikit penjelasan...'
                                                    className='min-h-25 resize-none p-4 rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 focus:bg-transparent transition-colors'
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
                                className='w-35 h-13 text-[15px] font-semibold rounded-xl sm:rounded-[0.85rem] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md sm:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] dark:shadow-none transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        <span>Menyimpan</span>
                                    </span>
                                ) : (
                                    'Submit'
                                )}
                            </Button>
                        </div>
                        
                        <div className="mt-8 pt-4 pb-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col items-center gap-1.5 text-[14.5px]">
                             <span className="text-zinc-500 font-medium tracking-tight">Belum nemu namamu?</span>
                             <Link 
                                to="/register/add-participant" 
                                search={{ slug: formConfig.slug }}
                                className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-4 decoration-2 decoration-zinc-300 dark:decoration-zinc-700 hover:decoration-zinc-900 dark:hover:decoration-zinc-300 transition-all"
                            >
                                Yuk isi data kamu disini
                            </Link>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
