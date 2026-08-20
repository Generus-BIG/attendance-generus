import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { analytics } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
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
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) =>
      iss.input === ''
        ? 'Silakan masukkan email Anda'
        : 'Format email tidak valid',
  }),
  password: z
    .string()
    .min(1, 'Silakan masukkan kata sandi Anda')
    .min(7, 'Kata sandi minimal 7 karakter'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        analytics.signInFailed(data.email, error.message)
        toast.error(error.message)
        setIsLoading(false)
        return
      }

      analytics.signIn(data.email, true)
      toast.success('Berhasil masuk')

      const targetPath = redirectTo || '/admin/dashboard'
      navigate({ to: targetPath, replace: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      analytics.signInFailed(data.email, errorMessage)
      toast.error('Terjadi kesalahan')
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium'>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='anda@contoh.com'
                  type='email'
                  autoComplete='email'
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between'>
                <FormLabel className='text-sm font-medium'>
                  Kata Sandi
                </FormLabel>
                <Link
                  to='/forgot-password'
                  className='text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <FormControl>
                <PasswordInput
                  placeholder='Masukkan kata sandi Anda'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-1 w-full' size='lg' disabled={isLoading}>
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <>
              Masuk
              <ArrowRight className='ml-1.5 h-4 w-4' />
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
