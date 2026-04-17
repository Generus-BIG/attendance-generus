import { Command } from 'lucide-react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      {/* Left panel — dark branding surface */}
      <div className='relative hidden overflow-hidden bg-[oklch(0.14_0.02_265)] lg:flex lg:flex-col lg:justify-between lg:p-12'>
        {/* Subtle grid pattern */}
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.04]'
          style={{
            backgroundImage:
              'linear-gradient(oklch(0.98 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.98 0 0) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo + brand name */}
        <div className='relative z-10 flex items-center gap-3'>
          <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.98_0.005_265)]'>
            <Command className='h-5 w-5 text-[oklch(0.14_0.02_265)]' />
          </div>
          <span className='text-lg font-semibold tracking-tight text-[oklch(0.98_0.005_265)]'>
            Generus Dashboard
          </span>
        </div>

        {/* Headline copy */}
        <div className='relative z-10 max-w-md'>
          <h2
            className='text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-[oklch(0.98_0.005_265)]'
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Manage Desa BIG
            <br />
            attendance with clarity.
          </h2>
          <p className='mt-5 text-base leading-relaxed text-[oklch(0.7_0.015_265)]'>
            Track attendance, oversee participants, and run your organization
            from a single, streamlined workspace.
          </p>
        </div>

        {/* Bottom attribution */}
        <p className='relative z-10 text-xs text-[oklch(0.45_0.015_265)]'>
          Developed by PH Desa BIG 💌
        </p>
      </div>

      {/* Right panel — form */}
      <div className='flex items-center justify-center p-6 sm:p-10'>
        <div className='w-full max-w-sm'>{children}</div>
      </div>
    </div>
  )
}
