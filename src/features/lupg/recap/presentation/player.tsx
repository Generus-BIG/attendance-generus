import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthLabel } from '../../utils/month-utils'
import { AnimationProvider } from './context/animation-context'
import { type Slide } from './slides'
import { usePresPalette } from './use-pres-palette'

interface PresentationPlayerProps {
  monthKey: string
  slides: Slide[]
  isLoading: boolean
  onExit?: () => void
}

export function PresentationPlayer(props: PresentationPlayerProps) {
  return (
    <AnimationProvider>
      <PresentationPlayerInner {...props} />
    </AnimationProvider>
  )
}

function PresentationPlayerInner({
  monthKey,
  slides,
  isLoading,
  onExit,
}: PresentationPlayerProps) {
  const p = usePresPalette()
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [slideIndex, setSlideIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const resize = () => {
      setScale(Math.min(parent.clientWidth / 1280, parent.clientHeight / 720))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const handleNext = useCallback(() => {
    setSlideIndex((current) => {
      if (current >= slides.length - 1) return current
      setDirection(1)
      return current + 1
    })
  }, [slides.length])

  const handlePrev = useCallback(() => {
    setSlideIndex((current) => {
      if (current <= 0) return current
      setDirection(-1)
      return current - 1
    })
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowRight' ||
        event.key === ' ' ||
        event.key === 'PageDown'
      ) {
        event.preventDefault()
        handleNext()
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        handlePrev()
      } else if (event.key === 'Home') {
        event.preventDefault()
        setDirection(-1)
        setSlideIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        setDirection(1)
        setSlideIndex(Math.max(slides.length - 1, 0))
      } else if (event.key === 'Escape' && !isFullscreen && onExit) {
        event.preventDefault()
        onExit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNext, handlePrev, isFullscreen, onExit, slides.length])

  const clampedIndex = Math.min(slideIndex, Math.max(slides.length - 1, 0))
  const currentSlide = slides[clampedIndex]
  const progress =
    slides.length > 0 ? ((clampedIndex + 1) / slides.length) * 100 : 0
  const supportsFullscreen =
    document.fullscreenEnabled &&
    typeof document.documentElement.requestFullscreen === 'function'

  const requestFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div
      ref={containerRef}
      className='fixed inset-0 z-50 flex flex-col motion-reduce:[&_button]:transform-none'
      style={{ background: p.bg, color: p.ink }}
    >
      {!isFullscreen && (
        <div className='flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-6'>
          <div className='min-w-0 text-sm text-muted-foreground'>
            <span className='text-balance'>
              {formatMonthLabel(monthKey)} · {currentSlide?.title ?? ''}
            </span>
          </div>
          <div className='flex items-center gap-1 sm:gap-2'>
            {supportsFullscreen && (
              <Button
                variant='ghost'
                size='sm'
                onClick={requestFullscreen}
                className='min-h-11 min-w-11 sm:min-w-0'
              >
                <Maximize2 className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>Layar penuh</span>
              </Button>
            )}
            {onExit && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onExit}
                className='min-h-11 min-w-11 sm:min-w-0'
              >
                <X className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>Keluar</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className='relative flex min-h-0 flex-1 items-stretch overflow-hidden'>
        <Button
          variant='ghost'
          size='icon'
          className='hidden h-auto w-16 rounded-none sm:inline-flex'
          onClick={handlePrev}
          disabled={clampedIndex === 0}
          aria-label='Slide sebelumnya'
        >
          <ChevronLeft className='h-6 w-6' />
        </Button>
        <div
          ref={parentRef}
          className='relative flex min-w-0 flex-1 items-center justify-center overflow-hidden'
        >
          {isLoading || !currentSlide ? (
            <div className='flex h-full items-center justify-center text-muted-foreground'>
              <Loader2 className='mr-2 h-6 w-6 animate-spin' />
              Memuat...
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '1280px',
                  height: '720px',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  flexShrink: 0,
                  containerType: 'size',
                  background: p.bg,
                }}
                className='relative flex items-center justify-center overflow-hidden'
              >
                <AnimatePresence mode='wait' custom={direction}>
                  <motion.div
                    key={clampedIndex}
                    custom={direction}
                    variants={{
                      enter: (slideDirection: number) => ({
                        x: reduceMotion
                          ? 0
                          : slideDirection > 0
                            ? '5vw'
                            : '-5vw',
                        opacity: 0,
                      }),
                      center: { x: 0, opacity: 1 },
                      exit: (slideDirection: number) => ({
                        x: reduceMotion
                          ? 0
                          : slideDirection > 0
                            ? '-5vw'
                            : '5vw',
                        opacity: 0,
                      }),
                    }}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    transition={
                      reduceMotion
                        ? { opacity: { duration: 0.12 } }
                        : {
                            x: {
                              type: 'spring',
                              stiffness: 300,
                              damping: 30,
                            },
                            opacity: { duration: 0.15 },
                          }
                    }
                    className='h-full w-full overflow-hidden'
                  >
                    <div className='h-full w-full select-none'>
                      {currentSlide.render()}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='hidden h-auto w-16 rounded-none sm:inline-flex'
          onClick={handleNext}
          disabled={clampedIndex >= slides.length - 1}
          aria-label='Slide berikutnya'
        >
          <ChevronRight className='h-6 w-6' />
        </Button>
      </div>

      <div className='border-t'>
        <div
          className='h-1 bg-primary transition-[width] duration-200 motion-reduce:duration-0'
          style={{ width: `${progress}%` }}
        />
        <div className='flex min-h-14 items-center justify-between gap-3 px-3 py-1.5 text-xs text-muted-foreground sm:min-h-0 sm:px-6 sm:py-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-11 sm:hidden'
            onClick={handlePrev}
            disabled={clampedIndex === 0}
            aria-label='Slide sebelumnya'
          >
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <p className='text-center text-pretty tabular-nums'>
            Slide {clampedIndex + 1} / {slides.length}
            <span className='hidden sm:inline'>
              {' '}
              · Gunakan ←/→ atau Space untuk navigasi
              {onExit ? ' · Esc untuk keluar' : ''}
            </span>
          </p>
          <Button
            variant='ghost'
            size='icon'
            className='size-11 sm:hidden'
            onClick={handleNext}
            disabled={clampedIndex >= slides.length - 1}
            aria-label='Slide berikutnya'
          >
            <ChevronRight className='h-5 w-5' />
          </Button>
        </div>
      </div>
    </div>
  )
}
