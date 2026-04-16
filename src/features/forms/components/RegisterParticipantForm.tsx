import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/date-picker'
import { KELOMPOK, KATEGORI, GENDER, ATTENDANCE_STATUS, PERMISSION_REASONS } from '@/lib/schema'
import { submitPendingAttendance } from '../services'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'

const registerFormSchema = z.object({
    tempName: z.string().min(2, 'Nama minimal 2 karakter').regex(/^[a-zA-Z\s]*$/, 'Nama hanya boleh berisi huruf'),
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
    }
}

export function RegisterParticipantForm({ formConfig }: RegisterParticipantFormProps) {
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

    async function onSubmit(data: RegisterFormValues) {
        setIsSubmitting(true)
        try {
            await submitPendingAttendance(formConfig.id, {
                status: data.status,
                permissionReason: data.permissionReason ?? undefined,
                notes: data.notes ?? undefined,
                tempName: data.tempName,
                tempKelompok: data.tempKelompok,
                tempKategori: data.tempKategori,
                tempGender: data.tempGender,
                birthPlace: data.birthPlace,
                birthDate: data.birthDate,
            })
            setIsSubmitted(true)
            toast.success('Pendaftaran dan Absensi berhasil dikirim! Menunggu persetujuan admin.')
        } catch (_error) {
            toast.error('Gagal mengirim data. Silakan coba lagi.')
        } finally {
            setIsSubmitting(false)
        }
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
                    <CardTitle className='text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100'>Pendaftaran Berhasil!</CardTitle>
                    <CardDescription className='text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400 px-2'>
                        Data Anda sedang ditinjau oleh admin. Absensi untuk <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formConfig.title}</strong> juga telah dicatat.
                    </CardDescription>
                </CardHeader>
                <CardFooter className='flex justify-center flex-col gap-4 px-6 pb-10 sm:px-8'>
                    <Button asChild variant='outline' className='w-full sm:w-auto h-11 px-8 rounded-xl font-semibold border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors'>
                        <Link to="/absensi/$formId" params={{ formId: formConfig.slug }} onClick={() => {
                            // Reset form saat kembali ke form utama
                            form.reset({
                                tempName: '',
                                tempGender: undefined,
                                tempKelompok: undefined,
                                tempKategori: undefined,
                                birthPlace: '',
                                birthDate: undefined,
                                status: undefined,
                                permissionReason: undefined,
                                notes: '',
                            })
                            setIsSubmitted(false)
                        }}>
                            Kembali ke Form Utama
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className='mx-auto w-full max-w-lg border-0 sm:border sm:border-border/40 shadow-none sm:shadow-xl sm:rounded-xl overflow-hidden bg-background'>
            <CardHeader className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8 space-y-3">
                <div className="mb-1">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium h-9 rounded-lg">
                        <Link to="/absensi/$formId" params={{ formId: formConfig.slug }}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                        </Link>
                    </Button>
                </div>
                <div className='flex flex-col gap-1.5'>
                    <CardTitle className='text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground'>
                        Pendaftaran Peserta Baru
                    </CardTitle>
                    <CardDescription className='text-[15px] leading-relaxed text-foreground/80 mt-1'>
                        Pendaftaran untuk yang belum ada di database untuk kegiatan: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formConfig.title}</span>
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-8 sm:px-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 sm:space-y-7'>

                        <FormField
                            control={form.control}
                            name='tempName'
                            render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2.5">
                                    <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Nama Lengkap</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Masukkan nama lengkap..."
                                            className="h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                            <FormField
                                control={form.control}
                                name='birthPlace'
                                render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-2.5">
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Tempat Lahir</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Contoh: Jakarta"
                                                className="h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400"
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
                                    <FormItem className="flex flex-col space-y-2.5 mt-0.5">
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Tanggal Lahir</FormLabel>
                                        <DatePicker
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            placeholder="Pilih tanggal lahir"
                                            className="h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
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
                                    <FormItem className="flex flex-col space-y-2.5">
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Jenis Kelamin</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'>
                                                    <SelectValue placeholder='Pilih' className="text-muted-foreground" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg">
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
                                        <FormLabel className='text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'>Kelompok</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className='h-12 px-4 font-normal rounded-xl border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'>
                                                    <SelectValue placeholder='Pilih' className="text-muted-foreground" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800 shadow-lg max-h-75">
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
                                                        {k === 'AR' ? 'AR' : `GPN ${k}`}
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
                                className='w-40 h-13 text-[15px] font-semibold rounded-xl sm:rounded-[0.85rem] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md sm:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] dark:shadow-none transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
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
