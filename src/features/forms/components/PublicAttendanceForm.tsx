import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
        description?: string | null
    }
}

export function PublicAttendanceForm({ formConfig }: PublicAttendanceFormProps) {
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

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
        queryKey: ['participants', debouncedQuery],
        queryFn: () => searchParticipants(debouncedQuery),
        enabled: open, // Fetch when popover is open, even with empty query
        staleTime: 1000 * 60, // 1 minute
    })

    async function onSubmit(data: PublicFormValues) {
        setIsSubmitting(true)
        try {
            await submitAttendanceForm(formConfig.id, data)
            setIsSubmitted(true)
            toast.success('Absensi berhasil dikirim!')
        } catch (error) {
            console.error(error)
            toast.error('Gagal mengirim absensi. Silakan coba lagi.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSelectParticipant = (participant: any) => {
        form.setValue('participantId', participant.id)
        form.setValue('tempName', participant.name)

        // Auto-fill and map values if possible
        if (participant.gender === 'L' || participant.gender === 'P') {
            form.setValue('tempGender', participant.gender)
        }

        // Validate against enums or set directly if matching
        if (KELOMPOK.includes(participant.group as any)) {
            form.setValue('tempKelompok', participant.group as any)
        }

        // Map Categories: "GPN A" -> "A", "GPN B" -> "B"
        let category = participant.category
        if (category?.includes('A')) category = 'A'
        if (category?.includes('B')) category = 'B'

        if (KATEGORI.includes(category as any)) {
            form.setValue('tempKategori', category as any)
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
                    <CardTitle className='text-2xl font-bold'>Disyukuri, Alhamdulillah Jaza Kumullahu Khioro!</CardTitle>
                    <CardDescription className='text-base'>
                        Absensi Anda untuk <strong>{formConfig.title}</strong> telah berhasil disimpan.
                    </CardDescription>
                </CardHeader>
                <CardFooter className='flex justify-center flex-col gap-4'>
                    <p className='text-sm text-muted-foreground text-center'>
                        Anda dapat menutup halaman ini sekarang.
                    </p>
                    <Button variant='outline' onClick={() => setIsSubmitted(false)}>
                        Kirim Absensi Lain
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className='mx-auto w-full max-w-lg border-primary/10 shadow-lg overflow-hidden'>
            <CardHeader>
                <CardTitle className='text-2xl font-bold'>{formConfig.title}</CardTitle>
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
                                                        <CommandEmpty>Nama tidak ditemukan.</CommandEmpty>
                                                    )}
                                                    <CommandGroup>
                                                        {participants.map((participant: any) => (
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

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
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
                                            className='flex flex-row space-x-4'
                                        >
                                            {KATEGORI.map((k) => (
                                                <FormItem key={k} className='flex items-center space-x-3 space-y-0'>
                                                    <FormControl>
                                                        <RadioGroupItem value={k} />
                                                    </FormControl>
                                                    <FormLabel className='font-normal cursor-pointer'>
                                                        GPN {k}
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
                                                    className='min-h-[100px] resize-none'
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

                        <Button
                            type='submit'
                            className='w-full h-12 text-lg font-bold shadow-md'
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                                    Submitting...
                                </>
                            ) : (
                                'Submit'
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
