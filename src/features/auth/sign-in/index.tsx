import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <div className='space-y-6'>
        <div className='space-y-1.5'>
          <h1
            className='text-2xl font-semibold tracking-tight'
            style={{
              fontFamily:
                "'Host Grotesk', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Selamat datang kembali
          </h1>
          <p className='text-sm text-muted-foreground'>
            Masukkan email dan kata sandi Anda untuk melanjutkan.
          </p>
        </div>

        <UserAuthForm redirectTo={redirect} />
      </div>
    </AuthLayout>
  )
}
