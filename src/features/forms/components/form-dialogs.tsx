import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { AttendanceFormConfig, attendanceFormConfigSchema } from '@/lib/schema'
import { useFormsContext } from '../context/forms-context'
import { toast } from 'sonner'
import { slugify } from '@/lib/utils'

// Zod schema for the form creation/editing
const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    date: z.string(), // Input type="date" returns string
    time: z.string(), // Input type="time"
    slug: z.string().min(1, 'Slug is required'),
    isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface FormDialogsProps {
    open: boolean
    setOpen: (open: boolean) => void
    formToEdit?: AttendanceFormConfig
}

export function FormDialogs({ open, setOpen, formToEdit }: FormDialogsProps) {
    const { createForm, updateForm } = useFormsContext()
    const isEditing = !!formToEdit

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            slug: '',
            isActive: true,
        },
    })

    // Reset or populate form when opening/editing
    useEffect(() => {
        if (open) {
            if (formToEdit) {
                const dateObj = new Date(formToEdit.date)
                form.reset({
                    title: formToEdit.title,
                    description: formToEdit.description || '',
                    date: dateObj.toISOString().split('T')[0],
                    time: dateObj.toTimeString().slice(0, 5),
                    slug: formToEdit.slug,
                    isActive: formToEdit.isActive,
                })
            } else {
                form.reset({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toTimeString().slice(0, 5),
                    slug: '',
                    isActive: true,
                })
            }
        }
    }, [open, formToEdit, form])

    // Auto-generate slug from title if not editing
    const title = form.watch('title')
    useEffect(() => {
        if (!isEditing && title) {
            const slug = slugify(title)
            // Simple slugify, might need random suffix if distinct
            form.setValue('slug', slug, { shouldValidate: true })
        }
    }, [title, isEditing, form])

    const onSubmit = async (values: FormValues) => {
        try {
            // Combine date and time
            const datetime = new Date(`${values.date}T${values.time}`)

            if (isEditing && formToEdit) {
                await updateForm({
                    ...formToEdit,
                    title: values.title,
                    description: values.description,
                    date: datetime,
                    slug: values.slug,
                    isActive: values.isActive,
                })
                toast.success('Form updated successfully')
            } else {
                await createForm({
                    title: values.title,
                    description: values.description,
                    date: datetime,
                    slug: values.slug,
                    isActive: values.isActive,
                })
                toast.success('Form created successfully')
            }
            setOpen(false)
        } catch (error) {
            console.error(error)
            toast.error('Failed to save form')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Form' : 'Create New Form'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the details of existing attendance form.'
                            : 'Create a new attendance form to share with participants.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4 py-4'>
                        <FormField
                            control={form.control}
                            name='title'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder='Weekly Meeting' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='description'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder='Short description...' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name='date'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type='date' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name='time'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Time</FormLabel>
                                        <FormControl>
                                            <Input type='time' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name='slug'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug (URL Identifier)</FormLabel>
                                    <FormControl>
                                        <Input placeholder='weekly-meeting-1' {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='isActive'
                            render={({ field }) => (
                                <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className='space-y-1 leading-none'>
                                        <FormLabel>Active</FormLabel>
                                        <DialogDescription>
                                            If inactive, the public link will not accept submissions.
                                        </DialogDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type='submit'>{isEditing ? 'Save Changes' : 'Create Form'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
