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
            <Card className='mx-auto w-full max-w-md border-primary/20 shadow-xl'>
                <CardHeader className='text-center space-y-4'>
                    <div className='flex justify-center'>
                        <div className='rounded-full bg-primary/10 p-3'>
                            <CheckCircle2 className='h-12 w-12 text-primary animate-in zoom-in duration-300' />
                        </div>
                    </div>
                    <CardTitle className='text-2xl font-bold'>Pendaftaran Berhasil!</CardTitle>
                    <CardDescription className='text-base'>
                        Data Anda sedang ditinjau oleh admin. Absensi untuk <strong>{formConfig.title}</strong> juga telah dicatat.
                    </CardDescription>
                </CardHeader>
                <CardFooter className='flex justify-center flex-col gap-4'>
                    <Button asChild variant='outline'>
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
        <Card className='mx-auto w-full max-w-lg border-primary/10 shadow-lg overflow-hidden'>
            <CardHeader>
                <div className="mb-2">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
                        <Link to="/absensi/$formId" params={{ formId: formConfig.slug }}>
                            <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
                        </Link>
                    </Button>
                </div>
                <CardTitle className='text-2xl font-bold'>Pendaftaran Peserta Baru</CardTitle>
                <CardDescription>
                    Pendaftaran untuk yang belum ada di database untuk kegiatan: <span className="font-semibold text-foreground">{formConfig.title}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>

                        <FormField
                            control={form.control}
                            name='tempName'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-base font-semibold'>Nama Lengkap</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Masukkan nama lengkap..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name='birthPlace'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-base font-semibold'>Tempat Lahir</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contoh: Jakarta" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name='birthDate'
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className='text-base font-semibold pt-1'>Tanggal Lahir</FormLabel>
                                        <DatePicker
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            placeholder="Pilih tanggal lahir"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name='tempGender'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-base font-semibold'>Jenis Kelamin</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
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
                                                <SelectTrigger>
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
                                                    <SelectTrigger>
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
                                'Submit & Daftar'
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
