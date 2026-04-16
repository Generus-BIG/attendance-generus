import { useSearch } from '@tanstack/react-router'
import { Command } from 'lucide-react'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      {/* Mobile-only logo (hidden on lg where left panel shows) */}
      <div className='mb-8 flex items-center gap-2.5 lg:hidden'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
          <Command className='h-4 w-4 text-primary-foreground' />
        </div>
        <span className='text-base font-semibold tracking-tight'>
          Generus Dashboard
        </span>
      </div>

      <div className='space-y-6'>
        <div className='space-y-1.5'>
          <h1
            className='text-2xl font-bold tracking-tight'
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Welcome back
          </h1>
          <p className='text-sm text-muted-foreground'>
            Sign in to your account to continue
          </p>
        </div>

        <UserAuthForm redirectTo={redirect} />

        <p className='text-center text-xs text-muted-foreground'>
          By signing in, you agree to our{' '}
          <a
            href='/terms'
            className='underline underline-offset-4 transition-colors hover:text-foreground'
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href='/privacy'
            className='underline underline-offset-4 transition-colors hover:text-foreground'
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  )
}
