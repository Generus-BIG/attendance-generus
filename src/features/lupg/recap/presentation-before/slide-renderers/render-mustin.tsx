// Resume Mustin slide renderer — one complete, scrollable kelompok report per slide.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinTemplateRow,
} from '../../../types'
import { AnimateItem } from '../components/animate-element'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette } from '../use-pres-palette'

interface SlideArgs {
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  kelompok: { id: string; value: string }
  reports: MonthlyReportRow[]
  mustinRows: MustinNoteRow[]
  mustinTemplates: MustinTemplateRow[]
  slideNumber: number
  totalSlides: number
}

const DEFAULT_AUTO_SCROLL_SPEED = 15

function sortNotes(
  notes: MustinNoteRow[],
  templateByCode: Map<string, MustinTemplateRow>
): MustinNoteRow[] {
  return [...notes].sort((a, b) => {
    const ta = a.template_code ? templateByCode.get(a.template_code) : undefined
    const tb = b.template_code ? templateByCode.get(b.template_code) : undefined
    const aOrder = ta ? ta.sort_order : 1_000_000 + a.sort_order
    const bOrder = tb ? tb.sort_order : 1_000_000 + b.sort_order
    return aOrder - bOrder
  })
}

function NoteItem({ note, index }: { note: MustinNoteRow; index: number }) {
  const p = usePresPalette()

  return (
    <AnimateItem
      className='flex gap-3 rounded-xl border p-4'
      style={{ borderColor: p.rule }}
    >
      <div
        className='shrink-0 pt-px'
        style={{
          fontFamily: p.fontMono,
          fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
          fontWeight: 600,
          color: p.muted,
          letterSpacing: '0.1em',
          minWidth: '2.5em',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-3'>
        <section>
          <p
            style={{
              color: p.muted,
              fontSize: 'clamp(0.625rem, 0.8vw, 0.75rem)',
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            PEMBAHASAN
          </p>
          <p
            className='mt-1 whitespace-pre-wrap'
            style={{
              color: p.ink,
              fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
              fontWeight: 700,
            }}
          >
            {note.pokok_masalah}
          </p>
        </section>
        <section>
          <p
            style={{
              color: p.muted,
              fontSize: 'clamp(0.625rem, 0.8vw, 0.75rem)',
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            KEPUTUSAN / RENCANA
          </p>
          <p
            className='mt-1 whitespace-pre-wrap'
            style={{
              color: p.ink,
              fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
            }}
          >
            {note.keputusan_rencana || '(kosong)'}
          </p>
        </section>
      </div>
    </AnimateItem>
  )
}

function MustinContent({
  notes,
  slideKey,
}: {
  notes: MustinNoteRow[]
  slideKey: string
}) {
  const p = usePresPalette()
  const reduceMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const previousTimeRef = useRef<number | undefined>(undefined)
  const scrollTopRef = useRef(0)
  const lastAutoScrollTopRef = useRef(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_AUTO_SCROLL_SPEED)

  useEffect(() => {
    if (!isScrolling || reduceMotion) return

    const scroll = (time: number) => {
      const container = scrollRef.current
      if (!container) return
      const elapsed = time - (previousTimeRef.current ?? time)
      previousTimeRef.current = time
      const bottom = container.scrollHeight - container.clientHeight
      scrollTopRef.current += (speed * elapsed) / 1_000
      const nextTop = Math.min(scrollTopRef.current, bottom)
      container.scrollTop = nextTop
      lastAutoScrollTopRef.current = container.scrollTop
      if (nextTop >= bottom) {
        setIsScrolling(false)
        setIsFinished(true)
        return
      }
      frameRef.current = requestAnimationFrame(scroll)
    }

    frameRef.current = requestAnimationFrame(scroll)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      previousTimeRef.current = undefined
    }
  }, [isScrolling, reduceMotion, speed])

  const start = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    if (isFinished) container.scrollTop = 0
    scrollTopRef.current = container.scrollTop
    lastAutoScrollTopRef.current = container.scrollTop
    setIsFinished(false)
    setIsScrolling(true)
  }, [isFinished])

  useEffect(() => {
    const toggle = () => {
      if (reduceMotion || notes.length === 0) return
      if (isScrolling) setIsScrolling(false)
      else start()
    }
    const handleToggle = (event: Event) => {
      if ((event as CustomEvent<string>).detail === slideKey) toggle()
    }
    window.addEventListener('lupg:mustin-toggle-autoscroll', handleToggle)
    return () =>
      window.removeEventListener('lupg:mustin-toggle-autoscroll', handleToggle)
  }, [isScrolling, notes.length, reduceMotion, slideKey, start])

  return (
    <div className='flex h-full min-h-0 items-center gap-3'>
      <div
        className='flex h-full min-h-0 flex-1 flex-col rounded-[1.5rem] border p-6'
        style={{ borderColor: p.rule }}
      >
        <div
          ref={scrollRef}
          className='min-h-0 flex-1 overflow-y-auto pr-3'
          onScroll={(event) => {
            const scrollTop = event.currentTarget.scrollTop
            if (scrollTop !== lastAutoScrollTopRef.current) {
              scrollTopRef.current = scrollTop
              lastAutoScrollTopRef.current = scrollTop
            }
          }}
        >
          {notes.length === 0 ? (
            <p className='italic' style={{ color: p.muted }}>
              Tidak ada catatan.
            </p>
          ) : (
            <div className='flex flex-col gap-3'>
              {notes.map((note, index) => (
                <NoteItem key={note.id} note={note} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        className='group/controls flex shrink-0 items-center rounded-lg border p-1 opacity-35 transition-opacity focus-within:opacity-100 hover:opacity-100'
        style={{
          background: `color-mix(in oklch, ${p.bg} 88%, transparent)`,
          borderColor: p.rule,
        }}
      >
        <label className='sr-only' htmlFor='mustin-auto-scroll-speed'>
          Auto-scroll speed
        </label>
        <input
          id='mustin-auto-scroll-speed'
          className='h-24 w-3 [writing-mode:vertical-lr]'
          type='range'
          min='5'
          max='60'
          step='5'
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          aria-label={`Auto-scroll speed: ${speed} px/s`}
          style={{ accentColor: p.muted }}
        />
        <Button
          size='icon'
          variant='ghost'
          onClick={isScrolling ? () => setIsScrolling(false) : start}
          disabled={reduceMotion || notes.length === 0}
          aria-label={
            isScrolling
              ? 'Pause auto-scroll'
              : isFinished
                ? 'Restart auto-scroll'
                : 'Start auto-scroll'
          }
          style={{ color: p.muted }}
        >
          {isScrolling ? <Pause /> : isFinished ? <RotateCcw /> : <Play />}
        </Button>
      </div>
    </div>
  )
}

export function renderMustinSlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    kelompok,
    reports,
    mustinRows,
    mustinTemplates,
    slideNumber,
    totalSlides,
  } = args
  const templateByCode = new Map(
    mustinTemplates.map((template) => [template.code, template])
  )
  const report = reports.find((item) => item.kelompok_id === kelompok.id)
  const notes = sortNotes(
    report
      ? mustinRows.filter((note) => note.monthly_report_id === report.id)
      : [],
    templateByCode
  )

  return {
    key: `mustin-${kelompok.id}`,
    title: 'Resume Mustin',
    render: () => (
      <SlideFrame
        eyebrow='RESUME MUSTIN'
        title={
          isSingleKelompok
            ? 'Resume Mustin'
            : `Resume Mustin - ${kelompok.value}`
        }
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <MustinContent notes={notes} slideKey={`mustin-${kelompok.id}`} />
      </SlideFrame>
    ),
  }
}
