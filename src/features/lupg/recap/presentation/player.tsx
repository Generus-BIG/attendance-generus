import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePalette } from '@/context/palette-provider'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatMonthLabel } from '../../utils/month-utils'
import {
  AnimationProvider,
  usePresentationAnimation,
} from './context/animation-context'
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

function AnimationControls() {
  const { preset, setPreset, trigger, setTrigger, speed, setSpeed } =
    usePresentationAnimation()
  const { palette, setPalette } = usePalette()
  const percent = ((speed - 0.25) / 2.75) * 100

  return (
    <div className='flex flex-col gap-4 text-xs select-none'>
      <ControlChoices
        label='Transition'
        value={preset}
        choices={[
          ['simple', 'Simple'],
          ['sleek', 'Sleek'],
          ['corporate', 'Corporate'],
          ['chill', 'Chill'],
        ]}
        onChange={setPreset}
        layoutId='activePreset'
      />
      <ControlChoices
        label='Animate'
        value={trigger}
        choices={[
          ['both', 'Both'],
          ['enter', 'On Enter'],
          ['exit', 'On Exit'],
        ]}
        onChange={setTrigger}
        layoutId='activeTrigger'
        separated
      />
      <ControlChoices
        label='Theme Palette'
        value={palette}
        choices={[
          ['modern-natural', 'Modern'],
          ['anthropic-claude', 'Claude'],
          ['sage-green', 'Sage Green'],
        ]}
        onChange={setPalette}
        layoutId='activePalette'
        separated
      />
      <div className='space-y-2 border-t border-border/30 pt-3'>
        <div className='flex items-center justify-between'>
          <label className='text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
            Speed
          </label>
          <span className='rounded border border-primary/10 bg-primary/5 px-1.5 py-0.5 font-mono text-xs font-bold text-primary tabular-nums'>
            {speed.toFixed(2)}x
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[10px] font-semibold text-muted-foreground'>
            Slow
          </span>
          <input
            type='range'
            aria-label='Animation speed'
            min='0.25'
            max='3'
            step='0.25'
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className='h-0.5 flex-1 cursor-pointer appearance-none rounded-lg outline-hidden [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary'
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`,
            }}
          />
          <span className='text-[10px] font-semibold text-muted-foreground'>
            Fast
          </span>
        </div>
      </div>
    </div>
  )
}

function ControlChoices<T extends string>({
  label,
  value,
  choices,
  onChange,
  layoutId,
  separated = false,
}: {
  label: string
  value: T
  choices: readonly (readonly [T, string])[]
  onChange: (value: T) => void
  layoutId: string
  separated?: boolean
}) {
  const { reduceMotion } = usePresentationAnimation()

  return (
    <div
      className={cn(
        'space-y-1.5',
        separated && 'border-t border-border/30 pt-3'
      )}
    >
      <span className='text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
        {label}
      </span>
      <div className='flex flex-wrap gap-x-4 text-xs font-semibold'>
        {choices.map(([choice, choiceLabel]) => {
          const active = choice === value
          return (
            <button
              key={choice}
              type='button'
              onClick={() => onChange(choice)}
              className='relative min-h-11 py-1.5 outline-hidden'
            >
              <span
                className={cn(
                  'transition-colors duration-150',
                  active
                    ? 'font-bold text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground'
                )}
              >
                {choiceLabel}
              </span>
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className='absolute right-0 bottom-1 left-0 h-0.5 rounded-full bg-primary'
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 380, damping: 30 }
                  }
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='min-h-11 min-w-11 sm:min-w-0'
                >
                  <SlidersHorizontal className='h-4 w-4 sm:mr-2' />
                  <span className='hidden sm:inline'>Setting</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-72 p-4'>
                <AnimationControls />
              </PopoverContent>
            </Popover>
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
