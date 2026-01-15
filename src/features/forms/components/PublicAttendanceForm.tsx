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
            <Card className='mx-auto w-full max-w-md border-primary/20 shadow-xl'>
                <CardHeader className='text-center space-y-4'>
                    <div className='flex justify-center'>
                        <div className='rounded-full bg-primary/10 p-3'>
                            <CheckCircle2 className='h-12 w-12 text-primary animate-in zoom-in duration-300' />
                        </div>
                    </div>
                    <CardTitle className='text-2xl font-bold'>Done! Alhamdulillah 🙌</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm text-muted-foreground'>
                    <p className='text-base'>
                        Absensi{' '}
                        <span className='font-semibold text-foreground'>
                            {submittedGender === 'P'
                                ? 'Mba'
                                : submittedGender === 'L'
                                ? 'Mas'
                                : 'Mas atau Mba'}{' '}
                            {submittedName || 'peserta'}
                        </span>{' '}
                        untuk{' '}
                        <span className='font-semibold text-foreground'>
                            {formConfig.title}
                        </span>{' '}
                        sudah berhasil disimpan.
                    <br /><br />
                    </p>
                    <p>Alhamdulillahi Jazakumullahu Khoiro, kalau ada teman yang belum absen, boleh amsol diingatkan ya 😊</p>
                    <p className='text-foreground'>Kamu bisa tutup halaman ini sekarang.</p>
                </CardContent>
                <CardFooter className='flex justify-center flex-col gap-4'>
                    <Button variant='outline' onClick={() => {
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
        <Card className='mx-auto w-full max-w-lg border-primary/10 shadow-lg overflow-hidden'>
            <CardHeader>
                <div className='flex flex-col gap-1'>
                    <CardTitle className='text-2xl font-bold'>{formConfig.title}</CardTitle>
                    <span className='text-sm font-medium text-muted-foreground'>
                        {format(new Date(), 'dd MMM yyyy', { locale: idLocale })}
                    </span>
                </div>
                {formConfig.description && (
                    <CardDescription className='text-base whitespace-pre-wrap'>{formConfig.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>

                        <FormField
                            control={form.control}
                            name='tempName'
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className='text-base font-semibold'>Nama Lengkap</FormLabel>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className={cn(
                                                        "w-full justify-between h-11",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? field.value
                                                        : "Cari nama peserta..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Ketik nama..."
                                                    value={searchQuery}
                                                    onValueChange={setSearchQuery}
                                                />
                                                <CommandList>
                                                    {isLoadingParticipants && (
                                                        <CommandGroup>
                                                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Mencari...
                                                            </div>
                                                        </CommandGroup>
                                                    )}
                                                    {!isLoadingParticipants && participants.length === 0 && (
                                                        <CommandEmpty className="py-2 text-center text-sm">
                                                            <div className="flex flex-col items-center gap-2 p-2">
                                                                <span className="text-muted-foreground">Nama tidak ditemukan.</span>
                                                                <Button variant="outline" size="sm" asChild className="w-full h-8">
                                                                    <Link to="/register/add-participant" search={{ slug: formConfig.slug }}>
                                                                       Klik buat daftar!
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </CommandEmpty>
                                                    )}
                                                    <CommandGroup>
                                                        {participants.map((participant) => (
                                                            <CommandItem
                                                                key={participant.id}
                                                                value={participant.name} // Value for filtering if enabled, but here serves as ID
                                                                onSelect={() => handleSelectParticipant(participant)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        participant.name === field.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span>{participant.name}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {participant.group} - {participant.category} ({participant.gender})
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

                        <div className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name='tempGender'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-base font-semibold'>Jenis Kelamin</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-11'>
                                                    <SelectValue placeholder='Pilih' />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value='L'>Laki-laki</SelectItem>
                                                <SelectItem value='P'>Perempuan</SelectItem>
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
                                    <FormItem>
                                        <FormLabel className='text-base font-semibold'>Kelompok</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-11'>
                                                    <SelectValue placeholder='Pilih' />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {KELOMPOK.map((k) => (
                                                    <SelectItem key={k} value={k}>{k}</SelectItem>
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
                                <FormItem className='space-y-3'>
                                    <FormLabel className='text-base font-semibold'>Kategori</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value || undefined}
                                            className='flex flex-row flex-wrap gap-4'
                                        >
                                            {KATEGORI.filter(k => !formConfig.allowedCategories || formConfig.allowedCategories.includes(k)).map((k) => (
                                                <FormItem key={k} className='flex items-center space-x-3 space-y-0'>
                                                    <FormControl>
                                                        <RadioGroupItem value={k} />
                                                    </FormControl>
                                                    <FormLabel className='font-normal cursor-pointer'>
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
                                <FormItem className='space-y-3 p-4 rounded-lg bg-muted/50'>
                                    <FormLabel className='text-base font-bold'>Konfirmasi Kehadiran</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className='flex flex-row space-x-8'
                                        >
                                            <FormItem className='flex items-center space-x-3 space-y-0'>
                                                <FormControl>
                                                    <RadioGroupItem value='hadir' className='border-primary text-primary' />
                                                </FormControl>
                                                <FormLabel className='font-bold cursor-pointer'>
                                                    Hadir
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className='flex items-center space-x-3 space-y-0'>
                                                <FormControl>
                                                    <RadioGroupItem value='izin' className='border-primary text-primary' />
                                                </FormControl>
                                                <FormLabel className='font-bold cursor-pointer'>
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
                            <div className='space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300'>
                                <FormField
                                    control={form.control}
                                    name='permissionReason'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-base font-semibold'>Alasan Izin</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value || undefined}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className='h-11'>
                                                        <SelectValue placeholder='Pilih Alasan' />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {PERMISSION_REASONS.map((r) => (
                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
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
                                        <FormItem>
                                            <FormLabel className='text-base font-semibold'>
                                                Detail Izin
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder='Berikan sedikit penjelasan...'
                                                    className='min-h-25 resize-none'
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

                        <div className='flex justify-end pt-2'>
                            <Button
                                type='submit'
                                className='px-8 h-11 text-base font-bold shadow-md'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit'
                                )}
                            </Button>
                        </div>
                        <div className="mt-2 text-center">
                             <Link 
                                to="/register/add-participant" 
                                search={{ slug: formConfig.slug }}
                                className="text-sm text-muted-foreground hover:text-muted-foreground"
                            >
                                <span>Belum nemu namamu?</span>
                                <span className="underline hover:underline">Yuk isi data kamu disini</span>
                            </Link>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
