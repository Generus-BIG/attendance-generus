import { Command } from 'lucide-react'
import heroMountain from '@/features/auth/sign-in/assets/hero-mountain.jpg'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh lg:grid-cols-[3fr_2fr]'>
      {/* Hero panel — visible on all viewports.
          On mobile: capped at 35vh, acts as a brand band above the form.
          On lg+: fills the viewport as the authored left column. */}
      <section
        className='relative isolate h-[35vh] overflow-hidden bg-[oklch(0.14_0.02_265)] lg:h-auto lg:min-h-svh'
        aria-label='Generus Dashboard'
      >
        {/* Photograph */}
        <img
          src={heroMountain}
          alt=''
          aria-hidden='true'
          className='absolute inset-0 h-full w-full object-cover select-none'
          loading='eager'
          fetchPriority='high'
          draggable={false}
        />

        {/* Navy scrim — lighter at top (lets sky breathe), denser at bottom (copy legibility).
            Uses three explicit stops instead of Tailwind's two-stop gradient utilities
            so the middle tone doesn't wash out against the photo. */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            background:
              'linear-gradient(180deg, oklch(0.20 0.10 258 / 0.40) 0%, oklch(0.18 0.09 258 / 0.65) 55%, oklch(0.12 0.08 258 / 0.88) 100%)',
          }}
        />

        {/* Logo — pinned top-left on all viewports */}
        <div className='absolute top-6 left-6 z-10 flex items-center gap-3 lg:top-12 lg:left-12'>
          <div className='flex h-9 w-9 items-center justify-center rounded-md bg-[oklch(0.98_0.005_265)]'>
            <Command className='h-5 w-5 text-[oklch(0.14_0.02_265)]' />
          </div>
          <span
            className='text-base font-semibold tracking-tight text-[oklch(0.98_0.005_265)] lg:text-lg'
            style={{
              fontFamily:
                "'Host Grotesk', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Generus Dashboard
          </span>
        </div>

        {/* Headline block — bottom-left, editorial placement.
            Hidden on mobile (the 35vh band is too short to carry copy as well as a photo).
            Appears at lg+ where it anchors the lower-left of the column. */}
        <div className='absolute bottom-12 left-12 z-10 hidden max-w-md lg:block'>
          {/* Warm copper accent rule — the single identity beat in the frame */}
          <div
            className='mb-5 h-1 w-12'
            style={{ backgroundColor: 'oklch(0.68 0.14 55)' }}
            aria-hidden='true'
          />
          <h2
            className='text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.15] font-semibold tracking-tight text-[oklch(0.98_0.005_265)]'
            style={{
              fontFamily:
                "'Host Grotesk', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Kelola kehadiran &amp;
            <br />
            laporan bulanan Desa BIG.
          </h2>
          <p className='mt-5 text-base leading-relaxed text-[oklch(0.78_0.015_258)]'>
            Pantau kehadiran, kelola peserta, dan susun laporan bulanan kelompok
            dari satu ruang kerja yang rapi.
          </p>
        </div>

        {/* Attribution — bottom-right, quiet */}
        <p className='absolute right-4 bottom-3 z-10 hidden text-[10px] tracking-wide text-[oklch(0.85_0.01_258/0.5)] lg:block'>
          Developed by PH Desa BIG
        </p>
      </section>

      {/* Form panel */}
      <div className='flex items-center justify-center p-6 sm:p-10 lg:px-12'>
        <div className='w-full max-w-sm'>{children}</div>
      </div>
    </div>
  )
}
