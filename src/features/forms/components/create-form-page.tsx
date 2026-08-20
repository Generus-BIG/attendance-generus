import { useState, useEffect } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { id } from 'date-fns/locale'
import { Calendar as CalendarIcon, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { type FormTypeEnum } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import { cn, slugify } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { PublicAttendanceForm } from '@/features/forms/components/PublicAttendanceForm'
import { FormTypeSelector } from './form-type-selector'

// Schema matches the one in form-dialogs.tsx but we might want to ensure types align
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.date(),
  time: z.string().min(1, 'Time is required'),
  slug: z.string().min(1, 'Slug is required'),
  isActive: z.boolean(),
  allowedCategories: z.array(z.string()).min(1, 'Select at least one category'),
})

type FormValues = z.infer<typeof formSchema>

const CATEGORIES = [
  { id: 'A', label: 'GPN A' },
  { id: 'B', label: 'GPN B' },
  { id: 'AR', label: 'AR' },
  { id: 'APR', label: 'APR' },
]

export function CreateFormPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formType, setFormType] = useState<FormTypeEnum>('desa')
  const [kelompokId, setKelompokId] = useState<string | null>(null)

  const { role, kelompok: userKelompok } = usePermissions()
  const isTeamManager = role === 'team_manager'

  const { data: kelompokOptions = [] } = useQuery({
    queryKey: ['lookup_values', 'GROUP'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value')
      if (error) throw error
      return data as { id: string; value: string }[]
    },
  })

  // Auto-set kelompokId for team_manager when type is 'kelompok'
  useEffect(() => {
    if (
      isTeamManager &&
      formType === 'kelompok' &&
      userKelompok &&
      kelompokOptions.length > 0
    ) {
      const match = kelompokOptions.find((k) => k.value === userKelompok)
      if (match) {
        setKelompokId(match.id)
      }
    }
  }, [isTeamManager, formType, userKelompok, kelompokOptions])

  // Set default time to now
  const now = new Date()
  const defaultTime = now.toTimeString().slice(0, 5)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: now,
      time: defaultTime,
      slug: '',
      isActive: true, // Default active
      allowedCategories: ['A', 'B', 'AR'],
    },
  })

  // Start watching values for preview
  const watchedValues = form.watch()

  // Auto-generate slug from title
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && value.title) {
        const slug = slugify(value.title)
        form.setValue('slug', slug, { shouldValidate: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      // Combine date and time
      const dateTime = new Date(values.date)
      const [hours, minutes] = values.time.split(':').map(Number)
      dateTime.setHours(hours, minutes)

      // Prepare payload for Supabase
      const payload = {
        title: values.title,
        description: values.description,
        date: dateTime.toISOString(),
        slug: values.slug,
        is_active: values.isActive,
        allowed_categories: values.allowedCategories,
        form_type: formType,
        kelompok_id: formType === 'kelompok' ? kelompokId : null,
      }

      const { error } = await supabase
        .from('attendance_forms')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      toast.success('Form created successfully')
      navigate({ to: '/admin/forms' })
    } catch (_error) {
      toast.error('Failed to create form')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='container mx-auto max-w-7xl p-4 pb-24 sm:p-6'>
      <div className='mb-6 space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Create New Form</h1>
        <p className='text-muted-foreground'>
          Create a new attendance form and preview how it looks.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Left Column: Form Configuration */}
        <div className='space-y-6'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='h-full'>
              <Card className='h-full border-0 shadow-none sm:border sm:shadow-sm'>
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                  <CardDescription>
                    Configure the details of your attendance form.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {/* Form Type Selector */}
                  <div className='space-y-2'>
                    <Label>Form Type</Label>
                    <FormTypeSelector
                      value={formType}
                      onChange={(val) => {
                        setFormType(val)
                        if (val === 'desa') setKelompokId(null)
                      }}
                      disabled={isTeamManager}
                    />
                  </div>

                  {/* Kelompok picker — only shown when type is 'kelompok' */}
                  {formType === 'kelompok' && (
                    <div className='space-y-2'>
                      <Label>Kelompok</Label>
                      <div
                        className={cn(
                          'rounded-lg border border-blue-200 bg-blue-50/50 p-3',
                          'dark:border-blue-900 dark:bg-blue-950/20'
                        )}
                      >
                        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                          {kelompokOptions.map((k) => {
                            const isSelected = kelompokId === k.id
                            const isDisabled =
                              isTeamManager && k.value !== userKelompok
                            return (
                              <button
                                key={k.id}
                                type='button'
                                disabled={isDisabled}
                                onClick={() => setKelompokId(k.id)}
                                className={cn(
                                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-blue-200 bg-white hover:border-blue-400 dark:border-blue-800 dark:bg-transparent dark:hover:border-blue-600',
                                  isDisabled && 'cursor-not-allowed opacity-40'
                                )}
                              >
                                {k.value}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name='title'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder='Weekly Meeting...' {...field} />
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
                          <Textarea
                            placeholder='Brief description of the event...'
                            className='resize-none'
                            {...field}
                          />
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
                        <FormItem className='flex flex-col'>
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP', { locale: id })
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <Calendar
                                mode='single'
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                        <FormDescription>
                          Unique identifier for the form URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='allowedCategories'
                    render={() => (
                      <FormItem>
                        <div className='mb-4'>
                          <FormLabel className='text-base'>
                            Allowed Participants
                          </FormLabel>
                          <FormDescription>
                            Select which participant categories can submit this
                            form.
                          </FormDescription>
                        </div>
                        <div className='grid grid-cols-3 gap-2'>
                          {CATEGORIES.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name='allowedCategories'
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className='flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm'
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                item.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className='cursor-pointer text-sm font-normal'>
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='isActive'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className='space-y-1 leading-none'>
                          <FormLabel>Active Status</FormLabel>
                          <FormDescription>
                            If inactive, the form will not accept new
                            submissions.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className='mt-auto flex flex-col-reverse gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end'>
                  <Button
                    type='button'
                    variant='ghost'
                    className='w-full sm:w-auto'
                    onClick={() => navigate({ to: '/admin/forms' })}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    className='w-full min-w-30 sm:w-auto'
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    Create Form
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        {/* Right Column: Live Preview */}
        <div className='space-y-6'>
          <div className='sticky top-6'>
            <div className='mb-2 flex items-center justify-between px-1'>
              <h3 className='flex items-center gap-2 text-lg font-medium'>
                <Eye className='h-4 w-4' /> Live Preview
              </h3>
              <span className='text-xs text-muted-foreground'>
                This is how the form will appear to users
              </span>
            </div>

            {/* The Preview Card Wrapper */}
            <div className='relative overflow-hidden rounded-lg border bg-background/50 p-4 backdrop-blur-sm md:p-8'>
              {/* Mock Browser Bar or simple wrapper */}
              <div className='pointer-events-none origin-top scale-95 transform-gpu opacity-80 transition-all select-none'>
                {/* We use the PublicAttendanceForm component here but pass mock config */}
                <PublicAttendanceForm
                  formConfig={{
                    id: 'preview-id',
                    title: watchedValues.title || 'Untitled Form',
                    slug: 'preview-slug',
                    description: watchedValues.description,
                    allowedCategories: watchedValues.allowedCategories,
                  }}
                />
              </div>

              {/* Overlay to prevent interaction with preview if desired, or let it be interactive */}
              {/* We make it non-interactive to avoid confusion, or interactive to test validation?
                         Let's keep it 'pointer-events-none' for now so they don't try to submit.
                      */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
