// Resume Mustin slide renderer — per-kelompok cards (2-col desa, single full-width kelompok).
import {
  MUSTIN_STATUS_LABELS,
} from '../../../constants'
import {
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinStatus,
  type MustinTemplateRow,
} from '../../../types'
import { SlideFrame } from '../components/slide-frame'
import { type Slide } from '../slides'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { AnimateItem } from '../components/animate-element'

interface SlideArgs {
  monthLabel: string
  scope: string
  isSingleKelompok: boolean
  effectiveKelompokList: { id: string; value: string }[]
  reports: MonthlyReportRow[]
  mustinRows: MustinNoteRow[]
  mustinTemplates: MustinTemplateRow[]
  slideNumber: number
  totalSlides: number
}

// Sort: template-coded first by template.sort_order; non-template by note.sort_order + 1_000_000.
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

// Pill colors per status — load-bearing semantic mapping (done = success/green,
// in_progress = primary/navy, open = muted). Tinted backgrounds per Principle 2.
function pillStyle(
  status: MustinStatus,
  p: PresPalette
): { background: string; color: string; fontWeight: 700 } {
  if (status === 'done') {
    return {
      background: `color-mix(in oklch, ${p.success} 18%, ${p.bg})`,
      color: p.success,
      fontWeight: 700,
    }
  }
  if (status === 'in_progress') {
    return { background: p.primary, color: p.primaryFg, fontWeight: 700 }
  }
  return {
    background: `color-mix(in oklch, ${p.muted} 14%, ${p.bg})`,
    color: p.muted,
    fontWeight: 700,
  }
}

interface NoteItemProps {
  note: MustinNoteRow
  index: number
}

function NoteItem({ note, index }: NoteItemProps) {
  const p = usePresPalette()
  const status = note.status as MustinStatus
  const { background, color, fontWeight } = pillStyle(status, p)
  return (
    <AnimateItem className='flex gap-3'>
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
      <div className='flex flex-1 flex-col gap-0.5'>
        <span
          className='inline-block rounded'
          style={{
            background,
            color,
            padding: '2px 6px',
            fontSize: 'clamp(0.75rem, 1vw, 1rem)',
            fontWeight,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: p.fontMono,
            width: 'fit-content',
          }}
        >
          {MUSTIN_STATUS_LABELS[status]}
        </span>
        <div
          style={{
            fontWeight: 700,
            fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
            color: p.ink,
          }}
        >
          {note.pokok_masalah}
        </div>
        <div
          style={{
            fontStyle: 'italic',
            fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
            color: p.muted,
          }}
        >
          {note.keputusan_rencana || '(kosong)'}
        </div>
      </div>
    </AnimateItem>
  )
}

interface KelompokCardProps {
  name: string
  notes: MustinNoteRow[]
}

function KelompokCard({ name, notes }: KelompokCardProps) {
  const p = usePresPalette()
  return (
    <div className='flex flex-col gap-3 py-2'>
      <div
        className='flex items-baseline gap-3 pb-2'
        style={{ borderBottom: `2px solid ${p.brandAccent}` }}
      >
        <h3
          style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
            color: p.primary,
          }}
        >
          {name}
        </h3>
      </div>
      {notes.length === 0 ? (
        <div
          style={{
            fontStyle: 'italic',
            fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
            color: p.muted,
          }}
        >
          Tidak ada catatan.
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {notes.map((n, idx) => (
            <NoteItem key={n.id} note={n} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

export function renderMustinSlide(args: SlideArgs): Slide {
  const {
    monthLabel,
    scope,
    isSingleKelompok,
    effectiveKelompokList,
    reports,
    mustinRows,
    mustinTemplates,
    slideNumber,
    totalSlides,
  } = args

  const templateByCode = new Map<string, MustinTemplateRow>()
  for (const t of mustinTemplates) templateByCode.set(t.code, t)

  const reportByKelompok = new Map<string, MonthlyReportRow>()
  for (const r of reports) reportByKelompok.set(r.kelompok_id, r)

  const notesByReport = new Map<string, MustinNoteRow[]>()
  for (const n of mustinRows) {
    const arr = notesByReport.get(n.monthly_report_id) ?? []
    arr.push(n)
    notesByReport.set(n.monthly_report_id, arr)
  }

  return {
    key: 'mustin',
    title: 'Resume Mustin',
    render: () => (
      <SlideFrame
        eyebrow='RESUME MUSTIN'
        title='Resume Mustin'
        meta={monthLabel}
        scope={scope}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
      >
        <div
          className={
            isSingleKelompok
              ? 'h-full overflow-auto'
              : 'grid h-full grid-cols-2 gap-6 overflow-auto'
          }
        >
          {effectiveKelompokList.map((k) => {
            const report = reportByKelompok.get(k.id)
            const rawNotes = report
              ? (notesByReport.get(report.id) ?? [])
              : []
            const notes = sortNotes(rawNotes, templateByCode)
            return <KelompokCard key={k.id} name={k.value} notes={notes} />
          })}
        </div>
      </SlideFrame>
    ),
  }
}
