import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import presentationLoaderMark2d from '@/assets/presentation-loader-mark-2d.png'
import presentationLoaderMark3d from '@/assets/presentation-loader-mark-3d.png'
import { Skeleton } from '@/components/ui/skeleton'

// Switch to '3d' to preview the generated alternative in this same loader.
const PRESENTATION_LOADER_LOGO_VARIANT: '2d' | '3d' = '2d'

export function PresentationLoadingState({
  isLoading = true,
  onComplete,
}: {
  isLoading?: boolean
  onComplete?: () => void
}) {
  const progress = useLoadingProgress(isLoading)

  useEffect(() => {
    if (isLoading || progress < 100 || !onComplete) return
    // Let the fill settle and keep 100% readable before handing off to the slide.
    const timeout = window.setTimeout(onComplete, 300)
    return () => window.clearTimeout(timeout)
  }, [isLoading, progress, onComplete])

  return (
    <main
      data-presentation-loading='true'
      role='status'
      aria-busy={progress < 100}
      aria-labelledby='presentation-loading-title'
      className='relative isolate flex min-h-dvh items-center overflow-hidden bg-background px-4 py-8 antialiased sm:px-8'
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_18%,var(--accent),transparent_48%)] opacity-80'
      />

      <div className='mx-auto w-full max-w-3xl'>
        <header data-reveal className='mb-5 flex items-center gap-3 px-1'>
          <span
            data-logo-variant={PRESENTATION_LOADER_LOGO_VARIANT}
            aria-hidden='true'
            className='grid size-12 shrink-0 place-items-center'
          >
            <img
              src={
                PRESENTATION_LOADER_LOGO_VARIANT === '3d'
                  ? presentationLoaderMark3d
                  : presentationLoaderMark2d
              }
              alt=''
              width={48}
              height={48}
              className='size-full object-contain'
            />
          </span>
          <span className='min-w-0'>
            <span className='block text-sm leading-tight font-semibold tracking-tight'>
              LUPG presentation
            </span>
            <span className='block text-xs text-muted-foreground'>
              Report viewer
            </span>
          </span>
        </header>

        <section
          data-reveal='2'
          aria-hidden='true'
          className='w-full rounded-3xl bg-card/80 p-2 shadow-2xl ring-1 shadow-primary/10 ring-foreground/5 backdrop-blur-sm'
        >
          <div className='relative aspect-video overflow-hidden rounded-2xl bg-background'>
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,var(--accent),transparent_38%)] opacity-70' />
            <div className='relative flex h-full flex-col p-[clamp(1rem,5vw,3.5rem)]'>
              <div className='flex items-center justify-between'>
                <Skeleton className='h-[clamp(0.3rem,0.7vw,0.55rem)] w-1/6 motion-reduce:animate-none' />
                <Skeleton className='size-[clamp(0.55rem,1.25vw,1rem)] rounded-full [animation-delay:-400ms] motion-reduce:animate-none' />
              </div>

              <div className='grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] items-center gap-[clamp(1rem,5vw,4rem)]'>
                <div className='space-y-[clamp(0.45rem,1.4vw,1rem)]'>
                  <Skeleton className='h-[clamp(0.55rem,1.8vw,1.4rem)] w-4/5 rounded-lg motion-reduce:animate-none' />
                  <Skeleton className='h-[clamp(0.55rem,1.8vw,1.4rem)] w-3/5 rounded-lg [animation-delay:-300ms] motion-reduce:animate-none' />
                  <div className='pt-[clamp(0.2rem,0.9vw,0.75rem)]'>
                    <Skeleton className='h-[clamp(0.3rem,0.7vw,0.55rem)] w-2/5 [animation-delay:-150ms] motion-reduce:animate-none' />
                  </div>
                </div>

                <div className='flex h-[58%] items-end gap-[clamp(0.25rem,1vw,0.75rem)] rounded-xl bg-muted/40 p-[clamp(0.5rem,1.5vw,1.25rem)]'>
                  <Skeleton className='h-2/5 flex-1 rounded-sm [animation-delay:-450ms] motion-reduce:animate-none' />
                  <Skeleton className='h-3/4 flex-1 rounded-sm [animation-delay:-250ms] motion-reduce:animate-none' />
                  <Skeleton className='h-1/2 flex-1 rounded-sm [animation-delay:-50ms] motion-reduce:animate-none' />
                  <Skeleton className='h-full flex-1 rounded-sm [animation-delay:-350ms] motion-reduce:animate-none' />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Skeleton className='h-1 flex-1 rounded-full motion-reduce:animate-none' />
                <Skeleton className='h-1 w-[14%] rounded-full [animation-delay:-300ms] motion-reduce:animate-none' />
              </div>
            </div>
          </div>
        </section>

        <div
          data-reveal='3'
          className='mt-6 flex flex-col items-center justify-between gap-3 px-1 text-center sm:flex-row sm:text-left'
        >
          <div>
            <h1
              id='presentation-loading-title'
              className='text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl'
            >
              Preparing presentation
            </h1>
            <p className='mt-1.5 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground'>
              Loading report data and latest documentation.
            </p>
          </div>
          <div
            data-loading-percent='true'
            className='flex w-full max-w-44 flex-col items-center gap-2 text-center sm:w-36 sm:items-end sm:text-right'
          >
            <output
              className='text-3xl leading-none font-semibold tracking-tight tabular-nums'
              aria-live='off'
              aria-label={`${progress}% prepared`}
            >
              {progress}%
            </output>
            <div
              role='progressbar'
              aria-label='Presentation loading progress'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-valuetext={`${progress}%`}
              className='h-1.5 w-full overflow-hidden rounded-full bg-muted/70 ring-1 ring-foreground/5'
            >
              <span
                data-loading-progress-fill='true'
                className='block h-full origin-left rounded-full bg-primary transition-transform ease-linear motion-reduce:transition-none'
                style={{
                  transform: `scaleX(${progress / 100})`,
                  transitionDuration: isLoading ? '240ms' : '32ms',
                }}
              />
            </div>
            <span className='text-xs font-medium text-muted-foreground'>
              {progress === 100 ? 'Ready' : 'Loading'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}

function useLoadingProgress(isLoading: boolean) {
  const [progress, setProgress] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    // ponytail: estimated progress until the payload is ready; use measured
    // progress here if the data source ever exposes it.
    const target = isLoading ? 92 : 100
    if (progress >= target || (isLoading && reduceMotion)) return

    const timeout = window.setTimeout(
      () =>
        setProgress((current) =>
          Math.min(
            target,
            current +
              (reduceMotion
                ? 100
                : isLoading
                  ? Math.max(1, Math.ceil((92 - current) / 10))
                  : 4)
          )
        ),
      isLoading ? 240 : 32
    )
    return () => window.clearTimeout(timeout)
  }, [isLoading, progress, reduceMotion])

  return progress
}
