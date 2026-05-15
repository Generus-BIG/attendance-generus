import { useMemo, useState, type KeyboardEvent } from 'react'
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useActiveMustinTemplates,
  useCreateMustinNote,
  useDeleteMustinNote,
  useMustinNotes,
  useSeedMustinFromTemplates,
  useUpdateMustinNote,
} from '../../hooks/use-lupg-queries'
import {
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinTemplateRow,
} from '../../types'
import { SectionHeading } from '../components/section-heading'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

function subItemsArray(value: MustinTemplateRow['sub_items']): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

// 3-level bullet list (Notion/Word-style visual markers).
// Level 0 = •, Level 1 = ◦, Level 2 = ▪
// 4-space indent per level so nesting is visually distinct in the textarea.
const LIST_INDENTS = ['', '    ', '        '] as const
const LEVEL_MARKERS = ['•', '◦', '▪'] as const
const BULLET_RE = /^(\s*)([•◦▪\-*])\s(.*)$/

function levelFromIndent(indent: string): 0 | 1 | 2 {
  if (indent.length >= 8) return 2
  if (indent.length >= 4) return 1
  return 0
}

function markerForLevel(level: 0 | 1 | 2): string {
  return LEVEL_MARKERS[level]
}

function buildBulletPrefix(level: 0 | 1 | 2): string {
  return `${LIST_INDENTS[level]}${markerForLevel(level)} `
}

function handleSmartListKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  setValue: (v: string) => void
) {
  if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key !== 'Enter' && e.key !== 'Tab' && e.key !== ' ') return
  if (e.key === 'Enter' && e.shiftKey) return

  const ta = e.currentTarget
  const { value, selectionStart, selectionEnd } = ta
  if (selectionStart !== selectionEnd) return

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const lineEndIdx = value.indexOf('\n', selectionStart)
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
  const currentLine = value.slice(lineStart, lineEnd)
  const cursorInLine = selectionStart - lineStart

  const insertAtCursor = (insert: string) => {
    const next =
      value.slice(0, selectionStart) + insert + value.slice(selectionEnd)
    const cursor = selectionStart + insert.length
    setValue(next)
    requestAnimationFrame(() => ta.setSelectionRange(cursor, cursor))
  }

  const replaceLine = (newLine: string, cursorOffsetFromLineStart: number) => {
    const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd)
    const cursor = lineStart + cursorOffsetFromLineStart
    setValue(next)
    requestAnimationFrame(() => ta.setSelectionRange(cursor, cursor))
  }

  const exitList = () => {
    const next = value.slice(0, lineStart) + '\n' + value.slice(lineEnd)
    const cursor = lineStart + 1
    setValue(next)
    requestAnimationFrame(() => ta.setSelectionRange(cursor, cursor))
  }

  // Space after a lone `-` or `*` at the start of a line → transform to `• `
  if (e.key === ' ') {
    if ((currentLine === '-' || currentLine === '*') && cursorInLine === 1) {
      e.preventDefault()
      replaceLine('• ', 2)
    }
    return
  }

  const bullet = currentLine.match(BULLET_RE)

  if (e.key === 'Enter') {
    if (!bullet) return
    const [, indent, marker, content] = bullet
    const prefixLen = indent.length + marker.length + 1
    // Empty bullet → exit list
    if (content.length === 0 && cursorInLine === prefixLen) {
      e.preventDefault()
      exitList()
      return
    }
    e.preventDefault()
    // Normalize ASCII `-` / `*` to the unicode marker for the current level
    const level = levelFromIndent(indent)
    const normalizedMarker =
      marker === '-' || marker === '*' ? markerForLevel(level) : marker
    insertAtCursor(`\n${indent}${normalizedMarker} `)
    return
  }

  // Tab / Shift+Tab — cycles levels: • → ◦ → ▪
  if (!bullet) return // non-list line: default Tab (focus change)
  const dir = e.shiftKey ? -1 : 1
  const [, indent, , content] = bullet
  const currentLevel = levelFromIndent(indent)
  const newLevel = Math.max(0, Math.min(2, currentLevel + dir)) as 0 | 1 | 2
  if (newLevel === currentLevel) {
    e.preventDefault()
    return
  }
  e.preventDefault()
  const prefix = buildBulletPrefix(newLevel)
  const newLine = `${prefix}${content}`
  const delta = newLine.length - currentLine.length
  const newCursorInLine = Math.max(prefix.length, cursorInLine + delta)
  replaceLine(newLine, newCursorInLine)
}

function defaultPlaceholder(template: MustinTemplateRow): string {
  const subs = subItemsArray(template.sub_items)
  if (subs.length === 0) {
    return `Tulis temuan / keputusan untuk ${template.label}...`
  }
  const letters = 'abcdefghijklmnop'
  const lines = subs.map((s, i) => `${letters[i] ?? '-'}. ${s} — ...`)
  return `Tulis temuan untuk:\n${lines.join('\n')}`
}

export function MustinSection({ report, readOnly }: Props) {
  const { data: notes = [], isLoading: notesLoading } = useMustinNotes(report.id)
  const { data: templates = [], isLoading: templatesLoading } =
    useActiveMustinTemplates()
  const create = useCreateMustinNote()
  const seed = useSeedMustinFromTemplates()

  const templateByCode = useMemo(() => {
    const m = new Map<string, MustinTemplateRow>()
    for (const t of templates) m.set(t.code, t)
    return m
  }, [templates])

  const { templateBackedNotes, freeNotes, missingTemplates } = useMemo(() => {
    const byCode = new Map<string, MustinNoteRow>()
    const free: MustinNoteRow[] = []
    for (const n of notes) {
      if (n.template_code && templateByCode.has(n.template_code)) {
        byCode.set(n.template_code, n)
      } else {
        free.push(n)
      }
    }
    const backed: Array<{ template: MustinTemplateRow; note: MustinNoteRow }> =
      []
    const missing: MustinTemplateRow[] = []
    for (const t of templates) {
      const n = byCode.get(t.code)
      if (n) backed.push({ template: t, note: n })
      else missing.push(t)
    }
    free.sort((a, b) => a.sort_order - b.sort_order)
    return {
      templateBackedNotes: backed,
      freeNotes: free,
      missingTemplates: missing,
    }
  }, [notes, templates, templateByCode])

  const handleSeed = () => {
    seed.mutate(
      {
        monthlyReportId: report.id,
        templates: templates.map((t) => ({
          code: t.code,
          label: t.label,
          sort_order: t.sort_order,
        })),
      },
      {
        onSuccess: () => toast.success('Template resume mustin dimuat'),
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal memuat template')
        },
      }
    )
  }

  const handleAddTemplate = (template: MustinTemplateRow) => {
    create.mutate(
      {
        monthly_report_id: report.id,
        pokok_masalah: template.label,
        keputusan_rencana: '',
        sort_order: template.sort_order,
        template_code: template.code,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menambah')
        },
      }
    )
  }

  const handleAddFree = () => {
    const nextSort =
      (freeNotes[freeNotes.length - 1]?.sort_order ?? 900) + 10
    create.mutate(
      {
        monthly_report_id: report.id,
        pokok_masalah: '',
        keputusan_rencana: '',
        sort_order: Math.max(nextSort, 1000),
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menambah')
        },
      }
    )
  }

  const isLoading = notesLoading || templatesLoading
  const canSeed = !readOnly && templates.length > 0 && notes.length === 0

  return (
    <section
      id='section-mustin'
      className='bg-card text-card-foreground scroll-mt-24 flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:p-6'
    >
      <SectionHeading
        kicker='Resume Mustin'
        description='Findings dan keputusan musyawarah bulan ini.'
        action={
          !readOnly && notes.length > 0 ? (
            <Button
              onClick={handleAddFree}
              size='sm'
              variant='outline'
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Plus className='mr-2 h-4 w-4' />
              )}
              Catatan lain
            </Button>
          ) : undefined
        }
      />
      <div className='flex flex-col gap-3'>
        {isLoading ? (
          <div className='text-muted-foreground flex items-center justify-center py-8'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat...
          </div>
        ) : canSeed ? (
          <div className='flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center'>
            <Sparkles className='text-muted-foreground h-6 w-6' />
            <div className='text-sm'>
              <div className='font-medium'>Belum ada catatan Mustin</div>
              <div className='text-muted-foreground'>
                Muat template ({templates.length} topik) untuk memulai, atau
                tambah catatan bebas.
              </div>
            </div>
            <div className='flex flex-wrap justify-center gap-2'>
              <Button
                onClick={handleSeed}
                disabled={seed.isPending}
                size='sm'
              >
                {seed.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Sparkles className='mr-2 h-4 w-4' />
                )}
                Muat Template Resume Mustin
              </Button>
              <Button
                onClick={handleAddFree}
                variant='outline'
                size='sm'
                disabled={create.isPending}
              >
                <Plus className='mr-2 h-4 w-4' />
                Catatan bebas saja
              </Button>
            </div>
          </div>
        ) : notes.length === 0 && readOnly ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
            Belum ada catatan.
          </div>
        ) : (
          <>
            {templateBackedNotes.map(({ template, note }) => (
              <MustinTemplateRowView
                key={note.id}
                template={template}
                note={note}
                monthlyReportId={report.id}
                readOnly={readOnly}
              />
            ))}

            {!readOnly && missingTemplates.length > 0 && (
              <div className='flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3'>
                <span className='text-muted-foreground text-xs'>
                  Topik template yang belum ditambahkan:
                </span>
                {missingTemplates.map((t) => (
                  <Button
                    key={t.code}
                    variant='outline'
                    size='sm'
                    className='h-7'
                    onClick={() => handleAddTemplate(t)}
                    disabled={create.isPending}
                  >
                    <Plus className='mr-1 h-3 w-3' />
                    {t.label}
                  </Button>
                ))}
              </div>
            )}

            {freeNotes.length > 0 && (
              <div className='mt-2 flex flex-col gap-3'>
                <div className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                  Catatan lain
                </div>
                {freeNotes.map((note) => (
                  <MustinFreeRowView
                    key={note.id}
                    note={note}
                    monthlyReportId={report.id}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

interface TemplateRowProps {
  template: MustinTemplateRow
  note: MustinNoteRow
  monthlyReportId: string
  readOnly: boolean
}

function MustinTemplateRowView({
  template,
  note,
  monthlyReportId,
  readOnly,
}: TemplateRowProps) {
  const update = useUpdateMustinNote()
  const del = useDeleteMustinNote()
  const [keputusan, setKeputusan] = useState(note.keputusan_rencana)
  const subs = subItemsArray(template.sub_items)

  const save = () => {
    if (keputusan === note.keputusan_rencana) return
    update.mutate(
      {
        id: note.id,
        monthlyReportId,
        patch: { keputusan_rencana: keputusan },
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const handleDelete = () => {
    del.mutate(
      { id: note.id, monthlyReportId },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
        },
      }
    )
  }

  return (
    <div className='grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
      <div className='bg-muted/30 flex flex-col rounded-md border p-3'>
        <div className='text-sm font-semibold uppercase tracking-wide'>
          {template.label}
        </div>
        {subs.length > 0 && (
          <ol className='text-muted-foreground mt-2 list-[lower-alpha] pl-5 text-xs leading-relaxed'>
            {subs.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </div>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between'>
          <Label className='sr-only'>Keputusan / Rencana</Label>
          {!readOnly && (
            <Button
              variant='ghost'
              size='sm'
              className='ms-auto h-6 px-2 text-xs'
              onClick={handleDelete}
              disabled={del.isPending}
            >
              <Trash2 className='mr-1 h-3 w-3' />
              Hapus
            </Button>
          )}
        </div>
        <Textarea
          value={keputusan}
          onChange={(e) => setKeputusan(e.target.value)}
          onKeyDown={(e) => handleSmartListKeyDown(e, setKeputusan)}
          onBlur={save}
          disabled={readOnly}
          rows={6}
          placeholder={template.placeholder ?? defaultPlaceholder(template)}
          className='h-full resize-y'
        />
      </div>
    </div>
  )
}

interface FreeRowProps {
  note: MustinNoteRow
  monthlyReportId: string
  readOnly: boolean
}

function MustinFreeRowView({ note, monthlyReportId, readOnly }: FreeRowProps) {
  const update = useUpdateMustinNote()
  const del = useDeleteMustinNote()
  const [pokokMasalah, setPokokMasalah] = useState(note.pokok_masalah)
  const [keputusan, setKeputusan] = useState(note.keputusan_rencana)

  const save = () => {
    if (
      pokokMasalah === note.pokok_masalah &&
      keputusan === note.keputusan_rencana
    ) {
      return
    }
    update.mutate(
      {
        id: note.id,
        monthlyReportId,
        patch: {
          pokok_masalah: pokokMasalah,
          keputusan_rencana: keputusan,
        },
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const handleDelete = () => {
    del.mutate(
      { id: note.id, monthlyReportId },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
        },
      }
    )
  }

  return (
    <div className='grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
      <div className='flex flex-col gap-1'>
        <Label className='text-xs'>Pokok Masalah</Label>
        <Input
          value={pokokMasalah}
          onChange={(e) => setPokokMasalah(e.target.value)}
          onBlur={save}
          disabled={readOnly}
          placeholder='Judul pembahasan...'
        />
      </div>
      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs'>Keputusan / Rencana</Label>
          {!readOnly && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
              onClick={handleDelete}
              disabled={del.isPending}
            >
              <Trash2 className='mr-1 h-3 w-3' />
              Hapus
            </Button>
          )}
        </div>
        <Textarea
          value={keputusan}
          onChange={(e) => setKeputusan(e.target.value)}
          onKeyDown={(e) => handleSmartListKeyDown(e, setKeputusan)}
          onBlur={save}
          disabled={readOnly}
          rows={4}
          placeholder='Findings / keputusan...'
        />
      </div>
    </div>
  )
}
