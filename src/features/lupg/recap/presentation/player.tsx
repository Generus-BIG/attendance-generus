import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from 'framer-motion'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { PresentationLoadingState } from '../../presentation/presentation-loading-state'
import { formatMonthLabel } from '../../utils/month-utils'
import {
  AnimationProvider,
  usePresentationAnimation,
} from './context/animation-context'
import {
  getMouseNavigationDirection,
  getSwipeNavigationDirection,
  isNavigationExcluded,
} from './navigation'
import './navigation.css'
import { type Slide } from './slides'
import { usePresPalette } from './use-pres-palette'

interface PresentationPlayerProps {
  monthKey: string
  slides: Slide[]
  isLoading: boolean
  onExit?: () => void
}

const PRESENTATION_INTRO_SEEN_KEY = 'lupg:presentation-intro-seen'

export function PresentationPlayer(props: PresentationPlayerProps) {
  const [isPrepared, setIsPrepared] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return sessionStorage.getItem(PRESENTATION_INTRO_SEEN_KEY) === 'true'
    } catch {
      return false
    }
  })
  const reduceMotion = useReducedMotion()
  const completeLoading = useCallback(() => setIsPrepared(true), [])

  useEffect(() => {
    try {
      sessionStorage.setItem(PRESENTATION_INTRO_SEEN_KEY, 'true')
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }, [])

  return (
    <LazyMotion features={domAnimation}>
      <div className='fixed inset-0 isolate z-50 bg-background'>
        <AnimatePresence initial={false}>
          {!isPrepared ? (
            <m.div
              key='loading'
              className='absolute inset-0 overflow-y-auto'
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeIn' }}
            >
              <PresentationLoadingState
                isLoading={props.isLoading}
                onComplete={completeLoading}
              />
            </m.div>
          ) : props.isLoading ? null : (
            <m.div
              key='presentation'
              data-presentation-ready='true'
              className='absolute inset-0'
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.3,
                ease: [0.2, 0, 0, 1],
              }}
            >
              <AnimationProvider>
                <PresentationPlayerInner {...props} />
              </AnimationProvider>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
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
                <m.span
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
  onExit,
}: PresentationPlayerProps) {
  const p = usePresPalette()
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const thumbnailListRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{
    pointerId: number
    x: number
    y: number
    excluded: boolean
    multitouch: boolean
  } | null>(null)
  const navigationPendingRef = useRef(false)
  const [scale, setScale] = useState(1)
  const [slideIndex, setSlideIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowThumbnails(true), 700)
    return () => window.clearTimeout(timeout)
  }, [])

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

  const clampedIndex = Math.min(slideIndex, Math.max(slides.length - 1, 0))
  const currentSlide = slides[clampedIndex]

  const handleNext = useCallback(() => {
    if (navigationPendingRef.current || clampedIndex >= slides.length - 1)
      return
    navigationPendingRef.current = true
    setDirection(1)
    setSlideIndex(clampedIndex + 1)
  }, [clampedIndex, slides.length])

  const handlePrev = useCallback(() => {
    if (navigationPendingRef.current || clampedIndex <= 0) return
    navigationPendingRef.current = true
    setDirection(-1)
    setSlideIndex(clampedIndex - 1)
  }, [clampedIndex])

  const selectSlide = useCallback(
    (index: number) => {
      if (navigationPendingRef.current || index === slideIndex) return
      navigationPendingRef.current = true
      setDirection(index > slideIndex ? 1 : -1)
      setSlideIndex(index)
    },
    [slideIndex]
  )

  const isMustinSlide = currentSlide?.key.startsWith('mustin-') ?? false

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector('[data-radix-popper-content-wrapper]') ||
        isNavigationExcluded(event.target, document.documentElement)
      )
        return
      if (event.key === ' ' && isMustinSlide) {
        event.preventDefault()
        window.dispatchEvent(
          new CustomEvent('lupg:mustin-toggle-autoscroll', {
            detail: currentSlide?.key,
          })
        )
      } else if (
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
        selectSlide(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        selectSlide(Math.max(slides.length - 1, 0))
      } else if (event.key === 'Escape' && !isFullscreen && onExit) {
        event.preventDefault()
        onExit()
      }
    },
    [
      handleNext,
      handlePrev,
      isFullscreen,
      isMustinSlide,
      onExit,
      currentSlide,
      selectSlide,
      slides,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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

  useEffect(() => {
    thumbnailListRef.current
      ?.querySelector<HTMLButtonElement>(`[data-slide-index="${clampedIndex}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [clampedIndex])

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
                  aria-label='Pengaturan presentasi'
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
                aria-label='Layar penuh'
                onClick={requestFullscreen}
                className='min-h-11 min-w-11 sm:min-w-0'
              >
                <Maximize2 className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>Fullscreen</span>
              </Button>
            )}
            {onExit && (
              <Button
                variant='ghost'
                size='sm'
                aria-label='Keluar presentasi'
                onClick={onExit}
                className='min-h-11 min-w-11 sm:min-w-0'
              >
                <X className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>Exit</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className='relative flex min-h-0 flex-1 items-stretch overflow-hidden'>
        <div
          ref={parentRef}
          className='relative flex min-w-0 flex-1 items-center justify-center overflow-hidden'
        >
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
            className='presentation-canvas relative flex items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
            data-presentation-canvas
            role='region'
            aria-roledescription='slide'
            aria-label={currentSlide?.title ?? 'Presentasi'}
            tabIndex={0}
            onKeyDown={(event) => {
              event.stopPropagation()
              handleKeyDown(event.nativeEvent)
            }}
            data-can-previous={clampedIndex > 0}
            data-can-next={clampedIndex < slides.length - 1}
            onPointerDown={(event) => {
              if (event.pointerType !== 'touch') return
              if (touchRef.current) {
                touchRef.current.multitouch = true
                return
              }
              touchRef.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                excluded: isNavigationExcluded(
                  event.target,
                  event.currentTarget
                ),
                multitouch: false,
              }
            }}
            onPointerUp={(event) => {
              const touch = touchRef.current
              if (
                event.pointerType !== 'touch' ||
                touch?.pointerId !== event.pointerId
              )
                return
              touchRef.current = null
              if (touch.excluded || touch.multitouch) return
              const swipeDirection = getSwipeNavigationDirection(
                touch.x,
                event.clientX,
                touch.y,
                event.clientY,
                clampedIndex,
                slides.length
              )
              if (!swipeDirection) return
              event.preventDefault()
              if (swipeDirection === -1) handlePrev()
              else handleNext()
            }}
            onPointerCancel={() => {
              touchRef.current = null
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== 'mouse') return
              const canvas = event.currentTarget
              const cursorDirection = !isNavigationExcluded(
                event.target,
                canvas
              )
                ? getMouseNavigationDirection(
                    isFullscreen,
                    event.clientX,
                    canvas.getBoundingClientRect(),
                    clampedIndex,
                    slides.length
                  )
                : 0
              canvas.dataset.navigation =
                cursorDirection === -1
                  ? 'previous'
                  : cursorDirection === 1
                    ? 'next'
                    : 'none'
            }}
            onPointerLeave={(event) => {
              event.currentTarget.dataset.navigation = 'none'
            }}
            onClick={(event) => {
              if (
                !isFullscreen ||
                event.defaultPrevented ||
                event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                !window.matchMedia('(hover: hover) and (pointer: fine)')
                  .matches ||
                ('pointerType' in event.nativeEvent &&
                  event.nativeEvent.pointerType === 'touch') ||
                isNavigationExcluded(event.target, event.currentTarget)
              )
                return
              const direction = getMouseNavigationDirection(
                isFullscreen,
                event.clientX,
                event.currentTarget.getBoundingClientRect(),
                clampedIndex,
                slides.length
              )
              if (direction === -1) handlePrev()
              if (direction === 1) handleNext()
            }}
          >
            <AnimatePresence mode='wait' custom={direction}>
              {!currentSlide ? (
                <div className='flex h-full items-center justify-center text-muted-foreground'>
                  <Loader2 className='mr-2 h-6 w-6 animate-spin' />
                  Loading...
                </div>
              ) : (
                <m.div
                  key={clampedIndex}
                  custom={direction}
                  variants={{
                    enter: (slideDirection: number) => ({
                      x: reduceMotion ? 0 : slideDirection > 0 ? '5vw' : '-5vw',
                      opacity: 0,
                    }),
                    center: { x: 0, opacity: 1 },
                    exit: (slideDirection: number) => ({
                      x: reduceMotion ? 0 : slideDirection > 0 ? '-5vw' : '5vw',
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
                  onAnimationComplete={(definition) => {
                    if (definition === 'center')
                      navigationPendingRef.current = false
                  }}
                  className='h-full w-full overflow-hidden'
                >
                  <Suspense
                    fallback={
                      <div className='flex h-full w-full items-center justify-center text-muted-foreground'>
                        <Loader2 className='mr-2 h-6 w-6 animate-spin' />
                        Loading...
                      </div>
                    }
                  >
                    <div className='h-full w-full select-none'>
                      {currentSlide.render()}
                    </div>
                  </Suspense>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {!isFullscreen && slides.length > 0 && (
        <div className='border-t bg-background px-3 pt-3 sm:px-6'>
          <ScrollArea orientation='horizontal' className='w-full'>
            <div ref={thumbnailListRef} className='flex w-max gap-2 pb-3'>
              {slides.map((slide, index) => {
                const active = index === clampedIndex
                return (
                  <button
                    key={slide.key}
                    data-slide-index={index}
                    type='button'
                    onClick={() => selectSlide(index)}
                    aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'w-36 shrink-0 overflow-hidden rounded-md border-2 bg-muted text-left transition-[border-color,box-shadow] duration-150 outline-none',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      active
                        ? 'border-primary shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_20%,transparent)]'
                        : 'border-transparent hover:border-border'
                    )}
                  >
                    <div className='relative aspect-video overflow-hidden bg-background'>
                      <div
                        className='pointer-events-none absolute top-0 left-0 h-180 w-320 origin-top-left scale-[0.1125]'
                        aria-hidden='true'
                        inert
                        style={{ containerType: 'size' }}
                      >
                        {showThumbnails && (
                          <Suspense fallback={null}>{slide.render()}</Suspense>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 truncate px-2 py-1.5 text-[11px] font-medium',
                        active ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-sm text-[10px] tabular-nums',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted-foreground/10 text-muted-foreground'
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className='truncate'>{slide.title}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className='border-t'>
        <div
          className='h-1 bg-primary transition-[width] duration-200 motion-reduce:duration-0'
          style={{ width: `${progress}%` }}
        />
        <div className='flex min-h-14 items-center justify-between gap-3 px-3 py-1.5 text-xs text-muted-foreground sm:min-h-0 sm:px-6 sm:py-2'>
          <Button
            variant='ghost'
            size='icon'
            className='size-11 shrink-0'
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
              · Gunakan ←/→ atau geser; klik sisi kiri/kanan saat fullscreen
              {onExit ? ' · Esc untuk keluar' : ''}
            </span>
          </p>
          <Button
            variant='ghost'
            size='icon'
            className='size-11 shrink-0'
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
