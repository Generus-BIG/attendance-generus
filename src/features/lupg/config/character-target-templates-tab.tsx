import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useActivateCharacterTargetTemplate,
  useCharacterTargetItems,
  useCharacterTargetTemplates,
  useCreateCharacterTargetItem,
  useCreateCharacterTargetTemplate,
  useDeleteCharacterTargetTemplate,
  useReplaceCharacterTargetItems,
  useUpdateCharacterTargetItem,
  useUpdateCharacterTargetTemplate,
} from '../hooks/use-lupg-queries'
import {
  type CharacterMonitoringLevel,
  type CharacterTargetItemInsert,
  type CharacterTargetItemRow,
  type CharacterTargetTemplateRow,
} from '../types'
import {
  CHARACTER_LEVEL_LABELS,
  CHARACTER_LEVELS,
} from '../utils/character-monitoring'

const BUCKET = 'lupg-character-targets'
const MONTH_LABELS = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
] as const

interface WorkbookPreviewRow {
  rowNumber: number
  cells: string[]
}

interface WorkbookPreviewSheet {
  name: string
  rows: WorkbookPreviewRow[]
}

interface ParsedItem {
  month_label: string
  month_index: number
  level_code: CharacterMonitoringLevel
  category_label: string
  material_label: string
  detail_label: string | null
  reference_from: string | null
  reference_to: string | null
  uses_reference: boolean
  source_sheet: string | null
  source_row: number | null
  confidence: number
}

interface ParseResult {
  parser_method: 'deterministic'
  confidence: number
  mapping: Record<string, string | null>
  issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>
  items: ParsedItem[]
  deployment_name?: string
}

type EditableItem = ParsedItem & { localId: string }

interface LogEntry {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

interface ParserHistoryItem {
  id: string
  timestamp: string
  filename: string
  templateName: string
  status: 'success' | 'warning' | 'error'
  parserMethod: 'deterministic'
  itemCount: number
  confidence: number
  logs: LogEntry[]
}

export function CharacterTargetTemplatesTab() {
  const { data: templates = [], isLoading } = useCharacterTargetTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedLogItem, setSelectedLogItem] =
    useState<ParserHistoryItem | null>(null)

  const [logHistory, setLogHistory] = useState<ParserHistoryItem[]>(() => {
    try {
      const saved =
        localStorage.getItem('lupg_parser_history') ??
        localStorage.getItem('lupg_ai_parser_history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('lupg_parser_history', JSON.stringify(logHistory))
  }, [logHistory])

  const handleAddLogHistory = (item: ParserHistoryItem) => {
    setLogHistory((prev) => [item, ...prev].slice(0, 50))
  }

  const handleClearLogHistory = () => {
    setLogHistory([])
  }

  useEffect(() => {
    if (!isLoading && templates.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsImporting(true)
    }
  }, [isLoading, templates.length])

  const selectedTemplate = useMemo(() => {
    if (isImporting) return null
    return (
      templates.find((template) => template.id === selectedId) ?? templates[0]
    )
  }, [selectedId, templates, isImporting])

  const handleCancelImport = () => {
    if (templates.length > 0) {
      setIsImporting(false)
      if (!selectedId) {
        setSelectedId(templates[0].id)
      }
    }
  }

  return (
    <div className='grid grid-cols-1 items-start gap-6 md:grid-cols-[280px_1fr]'>
      {/* Sidebar: Daftar Template */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
            Daftar Template
          </h3>
          <Button
            size='sm'
            variant={isImporting ? 'default' : 'outline'}
            onClick={() => {
              setIsImporting(true)
              setSelectedId(null)
            }}
            className='h-8 px-2.5 text-xs'
          >
            <Plus className='mr-1.5 h-3.5 w-3.5' />
            New Import
          </Button>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-6 text-sm text-muted-foreground'>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className='rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground'>
            No templates yet.
          </div>
        ) : (
          <div className='flex flex-col gap-1'>
            {templates.map((template) => {
              const isSelected =
                !isImporting && template.id === selectedTemplate?.id
              return (
                <button
                  key={template.id}
                  type='button'
                  onClick={() => {
                    setSelectedId(template.id)
                    setIsImporting(false)
                  }}
                  className={[
                    'flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  ].join(' ')}
                >
                  <div className='flex w-full items-start justify-between gap-2'>
                    <span className='block max-w-42.5 truncate font-medium text-foreground'>
                      {template.name}
                    </span>
                    {template.status === 'active' ? (
                      <span className='shrink-0 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-success uppercase'>
                        Active
                      </span>
                    ) : (
                      <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase'>
                        {template.status}
                      </span>
                    )}
                  </div>
                  <span className='block text-[11px] text-muted-foreground/80'>
                    {template.year} · {template.level_code} ·{' '}
                    {template.parser_method}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Divider */}
        <div className='my-2 h-px bg-border/70' />

        {/* Section: Parser Activity Logs */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <h3 className='text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
              Parser Activity Logs
            </h3>
            {logHistory.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleClearLogHistory}
                className='h-6 px-1.5 text-[10px] text-muted-foreground transition-colors hover:text-destructive'
              >
                Clear
              </Button>
            )}
          </div>

          {logHistory.length === 0 ? (
            <div className='rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground'>
              No parser activity yet.
            </div>
          ) : (
            <div className='scrollbar-thin flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1'>
              {logHistory.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setSelectedLogItem(item)}
                  className='group flex w-full flex-col gap-1 rounded-md border border-border/40 bg-card/45 px-2.5 py-2 text-left text-xs transition-all hover:border-border/70 hover:bg-muted/70'
                >
                  <div className='flex w-full items-start justify-between gap-2'>
                    <span className='block max-w-[15ch] truncate font-medium text-foreground transition-colors group-hover:text-primary'>
                      {item.filename}
                    </span>
                    {item.status === 'success' ? (
                      <span className='py-0.2 shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-1 text-[8px] font-bold text-emerald-600 uppercase'>
                        Success
                      </span>
                    ) : item.status === 'warning' ? (
                      <span className='py-0.2 shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1 text-[8px] font-bold text-amber-600 uppercase'>
                        Warning
                      </span>
                    ) : (
                      <span className='py-0.2 shrink-0 rounded border border-red-500/20 bg-red-500/10 px-1 text-[8px] font-bold text-red-600 uppercase'>
                        Error
                      </span>
                    )}
                  </div>
                  <div className='flex items-center justify-between text-[10px] text-muted-foreground/80'>
                    <span>
                      {item.itemCount} items · Conf: {item.confidence}%
                    </span>
                    <span>
                      {item.timestamp.split(', ')[1] || item.timestamp}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className='min-w-0'>
        {isImporting ? (
          <TemplateImportCard
            onSaveSuccess={(newTemplateId) => {
              setSelectedId(newTemplateId)
              setIsImporting(false)
            }}
            onCancel={templates.length > 0 ? handleCancelImport : undefined}
            onAddLogHistory={handleAddLogHistory}
          />
        ) : selectedTemplate ? (
          <Card className='border border-border/70 shadow-sm'>
            <CardHeader className='border-b border-border/50 pb-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <CardTitle className='text-lg font-bold'>
                      {selectedTemplate.name}
                    </CardTitle>
                    {selectedTemplate.status === 'active' ? (
                      <span className='rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold tracking-wider text-success uppercase'>
                        Active
                      </span>
                    ) : (
                      <span className='rounded-md bg-muted px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                        {selectedTemplate.status}
                      </span>
                    )}
                  </div>
                  <CardDescription className='mt-1 text-xs'>
                    Year {selectedTemplate.year} · Level{' '}
                    {selectedTemplate.level_code} · Parsed via{' '}
                    {selectedTemplate.parser_method}
                    {selectedTemplate.source_filename
                      ? ` · File: ${selectedTemplate.source_filename}`
                      : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='pt-6'>
              <TemplateItemsEditor
                template={selectedTemplate}
                onDeleted={() => {
                  setSelectedId(null)
                  setIsImporting(templates.length <= 1)
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className='rounded-md border border-dashed bg-muted/10 p-12 text-center text-sm text-muted-foreground'>
            Select a template from the left panel or click "New Import".
          </div>
        )}
      </div>

      <LogDetailDialog
        item={selectedLogItem}
        open={!!selectedLogItem}
        onOpenChange={(open) => !open && setSelectedLogItem(null)}
      />
    </div>
  )
}

function LogDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ParserHistoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col p-6 sm:max-w-xl'>
        <DialogHeader className='border-b border-border/50 pb-4'>
          <DialogTitle className='flex items-center gap-2 text-base font-bold'>
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                item.status === 'success'
                  ? 'bg-emerald-500'
                  : item.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              )}
            />
            Parser Log Details
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Parsing activity on {item.timestamp} for template "
            {item.templateName}"
          </DialogDescription>
        </DialogHeader>

        <div className='scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1'>
          <div className='grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs'>
            <div>
              <p className='text-muted-foreground'>File Name</p>
              <p className='truncate font-medium text-foreground'>
                {item.filename}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Parser Method</p>
              <p className='font-medium text-foreground uppercase'>
                Local Deterministic
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Extracted Items</p>
              <p className='font-medium text-foreground'>
                {item.itemCount} items
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>Confidence Score</p>
              <p className='font-medium text-foreground'>{item.confidence}%</p>
            </div>
          </div>

          <div className='flex flex-col gap-1.5'>
            <p className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
              Terminal Trace Logs
            </p>
            <div className='scrollbar-thin max-h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[10px] leading-relaxed text-zinc-300'>
              {item.logs.map((log, index) => (
                <div
                  key={index}
                  className='mb-1.5 flex items-start gap-2 last:mb-0'
                >
                  <span className='shrink-0 text-zinc-600 select-none'>
                    [{log.timestamp}]
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded px-1 text-[8px] font-semibold tracking-wide uppercase select-none',
                      log.level === 'success'
                        ? 'border border-emerald-900/50 bg-emerald-950 text-emerald-400'
                        : log.level === 'warning'
                          ? 'border border-amber-900/50 bg-amber-950 text-amber-400'
                          : log.level === 'error'
                            ? 'border border-red-900/50 bg-red-950 text-red-400'
                            : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                    )}
                  >
                    {log.level}
                  </span>
                  <span className='wrap-break-word whitespace-pre-wrap text-zinc-200'>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How parser processed detail inside dialog */}
          <div className='rounded-lg border border-border bg-gradient-to-br from-indigo-50/20 to-violet-50/10 p-3.5 text-xs dark:from-indigo-950/10 dark:to-violet-950/5'>
            <h6 className='mb-1.5 flex items-center gap-1.5 font-bold text-foreground'>
              <WandSparkles className='h-3.5 w-3.5 text-indigo-500' />
              How This Parser Processed the Document
            </h6>
            <p className='leading-normal text-muted-foreground'>
              The local parser reads the Excel file hierarchically. First, it
              identifies the worksheet layout, detects month header rows, and
              maps the column structure. Then it reads material patterns to
              infer categories, removes empty placeholders, and marks rows that
              need Ayat/hal references. Finally, it produces structured data
              that is ready to save.
            </p>
          </div>
        </div>

        <DialogFooter className='border-t border-border/50 pt-2'>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateImportCard({
  onSaveSuccess,
  onCancel,
  onAddLogHistory,
}: {
  onSaveSuccess?: (templateId: string) => void
  onCancel?: () => void
  onAddLogHistory: (item: ParserHistoryItem) => void
}) {
  const createTemplate = useCreateCharacterTargetTemplate()
  const replaceItems = useReplaceCharacterTargetItems()
  const activateTemplate = useActivateCharacterTargetTemplate()
  const [year, setYear] = useState(new Date().getFullYear())
  const [name, setName] = useState(`Target 29 Karakter ${year}`)
  const [defaultLevel, setDefaultLevel] =
    useState<CharacterMonitoringLevel>('GPN')
  const [activateAfterSave, setActivateAfterSave] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  const normalizedItems = useMemo(
    () => items.filter((item) => item.material_label.trim()),
    [items]
  )

  // Auto scroll to latest logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentLogs])

  const parseFile = async () => {
    if (!file) {
      toast.error('Please choose an Excel file first')
      return
    }

    setIsParsing(true)
    setCurrentLogs([])
    setParsed(null)
    setItems([])

    const tempLogs: LogEntry[] = []
    const addLog = (
      level: 'info' | 'success' | 'warning' | 'error',
      message: string
    ) => {
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      tempLogs.push({ timestamp: timeStr, level, message })
      setCurrentLogs([...tempLogs])
    }

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))

    try {
      addLog(
        'info',
        `Starting file parse: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      )
      await delay(120)

      addLog('info', `Opening Excel file and reading sheet previews...`)
      const sheets = await readWorkbookPreview(file)
      await delay(120)

      addLog(
        'info',
        `Found ${sheets.length} sheet(s): ${sheets.map((s) => `"${s.name}"`).join(', ')}.`
      )
      await delay(140)

      addLog(
        'info',
        `Looking for target material headers (Month, Category, Material, Ayat/Hal)...`
      )
      await delay(140)

      const activeSheet = sheets[0]
      const headerRowIndex = findHeaderRowIndex(activeSheet?.rows ?? [])
      addLog(
        'info',
        `Header row detected on sheet "${activeSheet?.name ?? 'Sheet'}" at row ${headerRowIndex + 1}.`
      )
      await delay(120)

      addLog('info', `Mapping columns intelligently...`)
      await delay(120)

      addLog('info', `Running local deterministic parser...`)
      await delay(120)

      let parseResult = deterministicParse({ year, defaultLevel, sheets })
      addLog(
        'success',
        `Local deterministic parser processed the file successfully.`
      )

      parseResult = normalizeParseResult(
        forceParseLevel(parseResult, defaultLevel)
      )

      addLog(
        'info',
        `Balancing material categories and default level "${defaultLevel}"...`
      )
      await delay(120)

      if (parseResult.issues.length > 0) {
        addLog(
          'warning',
          `Found ${parseResult.issues.length} validation note(s):`
        )
        for (const issue of parseResult.issues.slice(0, 3)) {
          addLog('warning', `[Validation] ${issue.message}`)
        }
      }

      const confidencePercent = Math.round(parseResult.confidence * 100)
      addLog(
        'success',
        `Extraction complete. Loaded ${parseResult.items.length} material item(s).`
      )
      addLog(
        'success',
        `Parser confidence score: ${confidencePercent}% via Local Deterministic.`
      )

      setParsed(parseResult)
      setItems(
        parseResult.items.map((item, index) => ({
          ...item,
          localId: `${item.source_sheet ?? 'sheet'}_${item.source_row ?? index}`,
        }))
      )

      // Add to history
      onAddLogHistory({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        filename: file.name,
        templateName: name.trim() || `Target 29 Karakter ${year}`,
        status: parseResult.issues.some((i) => i.severity === 'error')
          ? 'error'
          : parseResult.issues.some((i) => i.severity === 'warning')
            ? 'warning'
            : 'success',
        parserMethod: parseResult.parser_method,
        itemCount: parseResult.items.length,
        confidence: confidencePercent,
        logs: [...tempLogs],
      })

      toast.success(
        `Parser loaded ${parseResult.items.length} item(s) (${parseResult.parser_method})`
      )
    } catch (e) {
      addLog(
        'error',
        `Parsing failed: ${e instanceof Error ? e.message : 'Failed to parse file'}`
      )

      onAddLogHistory({
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        filename: file.name,
        templateName: name.trim() || `Target 29 Karakter ${year}`,
        status: 'error',
        parserMethod: 'deterministic',
        itemCount: 0,
        confidence: 0,
        logs: [...tempLogs],
      })

      toast.error(e instanceof Error ? e.message : 'Failed to parse file')
    } finally {
      setIsParsing(false)
    }
  }

  const saveTemplate = async () => {
    if (!parsed) {
      toast.error('Parse the file before saving')
      return
    }
    if (!file) {
      toast.error('Source file not found')
      return
    }

    try {
      const filePath = await uploadSourceFile(file, year)
      const template = await createTemplate.mutateAsync({
        year,
        level_code: defaultLevel,
        name: name.trim() || `Target 29 Karakter ${year}`,
        status: 'parsed',
        source_filename: file.name,
        source_file_path: filePath,
        source_file_size: file.size,
        parser_method: parsed.parser_method,
        parse_confidence: parsed.confidence,
        mapping_json: parsed.mapping,
        parse_result_json: {
          issues: parsed.issues,
          item_count: normalizedItems.length,
        },
      })

      await replaceItems.mutateAsync({
        templateId: template.id,
        items: normalizedItems.map((item, index) =>
          toInsertItem(template.id, item, index)
        ),
      })

      if (activateAfterSave) {
        await activateTemplate.mutateAsync(template)
      }

      toast.success('Material template saved successfully')
      setParsed(null)
      setItems([])
      setFile(null)
      setCurrentLogs([])
      if (onSaveSuccess) {
        onSaveSuccess(template.id)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save template')
    }
  }

  return (
    <Card className='border border-border/70 shadow-sm'>
      <CardHeader>
        <CardTitle>Import Excel + Local Parser</CardTitle>
        <CardDescription>
          Upload the worksheet, review the deterministic parser result, then
          save it as a template.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-6'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='grid gap-2'>
            <Label htmlFor='target-year'>Year</Label>
            <Input
              id='target-year'
              type='number'
              value={year}
              onChange={(e) => {
                const nextYear = Number(e.target.value)
                setYear(nextYear)
                setName(`Target 29 Karakter ${nextYear}`)
              }}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='target-name'>Template Name</Label>
            <Input
              id='target-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Default Level</Label>
            <Select
              value={defaultLevel}
              onValueChange={(value) =>
                setDefaultLevel(value as CharacterMonitoringLevel)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {CHARACTER_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='target-file'>Excel File</Label>
            <Input
              id='target-file'
              type='file'
              className='cursor-pointer'
              accept='.xlsx,.xls,.csv'
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setParsed(null)
                setItems([])
                setCurrentLogs([])
              }}
            />
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Switch
            checked={activateAfterSave}
            onCheckedChange={setActivateAfterSave}
            id='activate-after-save'
          />
          <Label htmlFor='activate-after-save' className='cursor-pointer'>
            Activate template after saving
          </Label>
        </div>

        <div className='flex flex-wrap gap-2 border-t border-border/50 pt-4'>
          <Button onClick={parseFile} disabled={isParsing || !file}>
            {isParsing ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <WandSparkles className='mr-2 h-4 w-4' />
            )}
            Parse
          </Button>
          <Button
            variant='outline'
            onClick={() =>
              setItems((current) => [
                ...current,
                emptyEditableItem(defaultLevel, current.length),
              ])
            }
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Manual Item
          </Button>
          <Button
            onClick={saveTemplate}
            disabled={
              !parsed ||
              normalizedItems.length === 0 ||
              createTemplate.isPending ||
              replaceItems.isPending ||
              activateTemplate.isPending
            }
          >
            <Save className='mr-2 h-4 w-4' />
            Save Template
          </Button>
          {onCancel && (
            <Button variant='ghost' onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Real-time parser console output */}
        {currentLogs.length > 0 && (
          <div className='mt-2 flex flex-col gap-4'>
            <div className='relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-300 shadow-lg'>
              <div className='mb-3 flex items-center justify-between border-b border-zinc-800 pb-2'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      isParsing ? 'animate-pulse bg-emerald-500' : 'bg-zinc-500'
                    )}
                  />
                  <span className='text-[10px] font-bold tracking-wider text-zinc-400 uppercase'>
                    Parser Terminal Output
                  </span>
                </div>
                <span className='text-[10px] text-zinc-500'>
                  Status: {isParsing ? 'Processing' : 'Finished'}
                </span>
              </div>
              <div className='scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent max-h-60 space-y-1.5 overflow-y-auto pr-1'>
                {currentLogs.map((log, index) => (
                  <div key={index} className='flex items-start gap-2'>
                    <span className='shrink-0 text-zinc-600 select-none'>
                      [{log.timestamp}]
                    </span>
                    <span
                      className={cn(
                        'py-0.2 shrink-0 rounded px-1 text-[9px] font-semibold tracking-wide uppercase select-none',
                        log.level === 'success'
                          ? 'border border-emerald-900/50 bg-emerald-950 text-emerald-400'
                          : log.level === 'warning'
                            ? 'border border-amber-900/50 bg-amber-950 text-amber-400'
                            : log.level === 'error'
                              ? 'border border-red-900/50 bg-red-950 text-red-400'
                              : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                      )}
                    >
                      {log.level}
                    </span>
                    <span className='wrap-break-word whitespace-pre-wrap text-zinc-200'>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <div className='mt-2 flex flex-col gap-2'>
            <h4 className='text-sm font-semibold text-muted-foreground'>
              Preview Hasil Parse:
            </h4>
            <EditableItemsTable items={items} onItemsChange={setItems} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface EditTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: CharacterTargetTemplateRow
  isPending: boolean
  onSave: (patch: {
    name: string
    year: number
    level_code: CharacterMonitoringLevel
  }) => void
}

function EditTemplateDialog({
  open,
  onOpenChange,
  template,
  isPending,
  onSave,
}: EditTemplateDialogProps) {
  const [name, setName] = useState(template.name)
  const [year, setYear] = useState(template.year)
  const [levelCode, setLevelCode] = useState(template.level_code)

  // Note: State resets automatically via key attribute when dialog toggles or template shifts.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit Template Info</DialogTitle>
          <DialogDescription>
            Update this template name, year, or level.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='edit-template-name'>Template Name</Label>
            <Input
              id='edit-template-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-template-year'>Year</Label>
              <Input
                id='edit-template-year'
                type='number'
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-template-level'>Level</Label>
              <Select
                value={levelCode}
                onValueChange={(value) =>
                  setLevelCode(value as CharacterMonitoringLevel)
                }
              >
                <SelectTrigger id='edit-template-level'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              onSave({
                name: name.trim() || `Target 29 Karakter ${year}`,
                year,
                level_code: levelCode,
              })
            }}
          >
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateItemsEditor({
  template,
  onDeleted,
}: {
  template: CharacterTargetTemplateRow
  onDeleted: () => void
}) {
  const { data: items = [], isLoading } = useCharacterTargetItems(template.id)
  const activateTemplate = useActivateCharacterTargetTemplate()
  const updateTemplate = useUpdateCharacterTargetTemplate()
  const deleteTemplate = useDeleteCharacterTargetTemplate()
  const createItem = useCreateCharacterTargetItem()
  const updateItem = useUpdateCharacterTargetItem()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<number, CharacterTargetItemRow[]>()
    for (const item of items) {
      const rows = map.get(item.month_index) ?? []
      rows.push(item)
      map.set(item.month_index, rows)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [items])

  const handleAdd = () => {
    createItem.mutate(
      {
        template_id: template.id,
        month_index: 1,
        month_label: 'JANUARI',
        level_code: template.level_code,
        category_label: 'Akhlakul Karimah',
        material_label: 'New material',
        sort_order: items.length + 1,
      },
      {
        onSuccess: () => toast.success('Item added'),
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : 'Failed to add item'),
      }
    )
  }

  const handleSaveMetadata = (patch: {
    name: string
    year: number
    level_code: CharacterMonitoringLevel
  }) => {
    updateTemplate.mutate(
      { id: template.id, patch },
      {
        onSuccess: () => {
          toast.success('Template info updated')
          setIsEditDialogOpen(false)
        },
        onError: (e: unknown) =>
          toast.error(
            e instanceof Error ? e.message : 'Failed to update template'
          ),
      }
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            disabled={
              template.status === 'active' || activateTemplate.isPending
            }
            onClick={() =>
              activateTemplate.mutate(template, {
                onSuccess: () => toast.success('Template activated'),
                onError: (e: unknown) =>
                  toast.error(
                    e instanceof Error ? e.message : 'Failed to activate'
                  ),
              })
            }
          >
            <CheckCircle2 className='mr-2 h-4 w-4 text-success' />
            Activate
          </Button>
          {template.status !== 'archived' && (
            <Button
              size='sm'
              variant='outline'
              onClick={() =>
                updateTemplate.mutate(
                  { id: template.id, patch: { status: 'archived' } },
                  {
                    onSuccess: () => toast.success('Template archived'),
                    onError: (e: unknown) =>
                      toast.error(
                        e instanceof Error ? e.message : 'Failed to archive'
                      ),
                  }
                )
              }
            >
              Archive
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Edit Info
          </Button>
          <Button size='sm' variant='outline' onClick={handleAdd}>
            <Plus className='mr-2 h-4 w-4' />
            Add Item
          </Button>
        </div>
        <Button
          size='sm'
          variant='ghost'
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
          disabled={deleteTemplate.isPending}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete Template
        </Button>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <Loader2 className='mr-2 h-6 w-6 animate-spin' />
          Loading items...
        </div>
      ) : grouped.length === 0 ? (
        <div className='rounded-md border border-dashed bg-muted/10 p-12 text-center text-sm text-muted-foreground'>
          This template has no items yet. Click "Add Item" to get started.
        </div>
      ) : (
        <div className='max-h-152 overflow-auto rounded-md border border-border/70 shadow-sm'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='w-35'>Month</TableHead>
                <TableHead className='w-20'>Level</TableHead>
                <TableHead className='w-45'>Category</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className='w-45'>Ayat/hal</TableHead>
                <TableHead className='w-25'>Status</TableHead>
                <TableHead className='w-15'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.flatMap(([monthIndex, rows]) =>
                rows.map((item, index) => (
                  <StoredItemRow
                    key={item.id}
                    item={item}
                    showMonth={index === 0}
                    monthRowSpan={rows.length}
                    monthLabel={
                      MONTH_LABELS[monthIndex - 1] ?? item.month_label
                    }
                    editing={editingId === item.id}
                    onEdit={() => setEditingId(item.id)}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) =>
                      updateItem.mutate(
                        { id: item.id, patch },
                        {
                          onSuccess: () => {
                            toast.success('Item updated')
                            setEditingId(null)
                          },
                          onError: (e: unknown) =>
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : 'Failed to update item'
                            ),
                        }
                      )
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EditTemplateDialog
        key={`${template.id}_${isEditDialogOpen}`}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        template={template}
        isPending={updateTemplate.isPending}
        onSave={handleSaveMetadata}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target 29 template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <strong>{template.name}</strong>, all material items, and
              monitoring data linked to this template will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() =>
                deleteTemplate.mutate(template.id, {
                  onSuccess: () => {
                    toast.success('Template deleted')
                    setDeleteOpen(false)
                    onDeleted()
                  },
                  onError: (e: unknown) => {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : 'Failed to delete template'
                    )
                  },
                })
              }
            >
              {deleteTemplate.isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StoredItemRow({
  item,
  showMonth,
  monthRowSpan,
  monthLabel,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  item: CharacterTargetItemRow
  showMonth: boolean
  monthRowSpan: number
  monthLabel: string
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (patch: Partial<CharacterTargetItemInsert>) => void
}) {
  const [draft, setDraft] = useState({
    level_code: item.level_code,
    category_label: item.category_label,
    material_label: item.material_label,
    detail_label: item.detail_label ?? '',
    reference_from: item.reference_from ?? '',
    reference_to: item.reference_to ?? '',
    uses_reference:
      item.uses_reference ||
      Boolean(item.reference_from || item.reference_to) ||
      isReferenceMaterialText(item.material_label, item.detail_label),
    active: item.active,
  })

  if (editing) {
    return (
      <TableRow>
        {showMonth ? (
          <TableCell rowSpan={monthRowSpan} className='align-top font-medium'>
            {monthLabel}
          </TableCell>
        ) : null}
        <TableCell>
          <Select
            value={draft.level_code}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                level_code: value as CharacterMonitoringLevel,
              }))
            }
          >
            <SelectTrigger className='w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHARACTER_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Input
            value={draft.category_label}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                category_label: e.target.value,
              }))
            }
          />
        </TableCell>
        <TableCell>
          <div className='flex flex-col gap-2'>
            <Input
              value={draft.material_label}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  material_label: e.target.value,
                }))
              }
            />
            <Input
              value={draft.detail_label}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  detail_label: e.target.value,
                }))
              }
              placeholder='Material detail'
            />
          </div>
        </TableCell>
        <TableCell>
          <div className='flex min-w-44 flex-col gap-2'>
            <div className='flex items-center justify-between rounded-md border px-3 py-2'>
              <span className='text-xs font-medium text-muted-foreground'>
                Ayat/hal reference
              </span>
              <Switch
                checked={draft.uses_reference}
                onCheckedChange={(usesReference) =>
                  setDraft((current) => ({
                    ...current,
                    uses_reference: usesReference,
                    reference_from: usesReference ? current.reference_from : '',
                    reference_to: usesReference ? current.reference_to : '',
                  }))
                }
              />
            </div>
            {draft.uses_reference ? (
              <>
                <Input
                  value={draft.reference_from}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      reference_from: e.target.value,
                    }))
                  }
                  placeholder='From'
                />
                <Input
                  value={draft.reference_to}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      reference_to: e.target.value,
                    }))
                  }
                  placeholder='To'
                />
              </>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Do not show Ayat/hal reference fields in reports.
              </p>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Switch
            checked={draft.active}
            onCheckedChange={(active) =>
              setDraft((current) => ({ ...current, active }))
            }
          />
        </TableCell>
        <TableCell>
          <div className='flex justify-end gap-1'>
            <Button
              size='sm'
              onClick={() =>
                onSave({
                  ...draft,
                  detail_label: draft.detail_label.trim() || null,
                  reference_from: draft.uses_reference
                    ? draft.reference_from.trim() || null
                    : null,
                  reference_to: draft.uses_reference
                    ? draft.reference_to.trim() || null
                    : null,
                })
              }
            >
              Save
            </Button>
            <Button size='sm' variant='ghost' onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      {showMonth ? (
        <TableCell rowSpan={monthRowSpan} className='align-top font-medium'>
          {monthLabel}
        </TableCell>
      ) : null}
      <TableCell className='font-semibold text-muted-foreground'>
        {item.level_code}
      </TableCell>
      <TableCell className='max-w-[18ch] wrap-break-word whitespace-normal'>
        {item.category_label}
      </TableCell>
      <TableCell className='max-w-[34ch] wrap-break-word whitespace-normal'>
        <p className='font-medium'>{item.material_label}</p>
        {item.detail_label ? (
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.detail_label}
          </p>
        ) : null}
      </TableCell>
      <TableCell className='max-w-[18ch] text-xs wrap-break-word whitespace-normal text-muted-foreground'>
        {item.uses_reference ? (
          <>
            <span className='inline-flex rounded-md bg-muted px-2 py-0.5 font-medium text-foreground'>
              Ayat/hal
            </span>
            <p className='mt-1'>
              {[item.reference_from, item.reference_to]
                .filter(Boolean)
                .join(' - ') || 'Reference enabled'}
            </p>
          </>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>{item.active ? 'Active' : 'Inactive'}</TableCell>
      <TableCell className='text-right'>
        <Button
          size='icon'
          variant='ghost'
          className='h-8 w-8'
          onClick={onEdit}
        >
          <Pencil className='h-4 w-4' />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function EditableItemsTable({
  items,
  onItemsChange,
}: {
  items: EditableItem[]
  onItemsChange: (items: EditableItem[]) => void
}) {
  const update = (localId: string, patch: Partial<EditableItem>) => {
    onItemsChange(
      items.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item
      )
    )
  }

  return (
    <div className='max-h-128 overflow-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Ayat/hal</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.localId}>
              <TableCell>
                <Select
                  value={String(item.month_index)}
                  onValueChange={(value) => {
                    const monthIndex = Number(value)
                    update(item.localId, {
                      month_index: monthIndex,
                      month_label:
                        MONTH_LABELS[monthIndex - 1] ?? item.month_label,
                    })
                  }}
                >
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((label, index) => (
                      <SelectItem key={label} value={String(index + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={item.level_code}
                  onValueChange={(value) =>
                    update(item.localId, {
                      level_code: value as CharacterMonitoringLevel,
                    })
                  }
                >
                  <SelectTrigger className='w-24'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARACTER_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  value={item.category_label}
                  onChange={(e) =>
                    update(item.localId, { category_label: e.target.value })
                  }
                  className='min-w-40'
                />
              </TableCell>
              <TableCell>
                <div className='flex min-w-64 flex-col gap-2'>
                  <Input
                    value={item.material_label}
                    onChange={(e) =>
                      update(item.localId, { material_label: e.target.value })
                    }
                  />
                  <Input
                    value={item.detail_label ?? ''}
                    onChange={(e) =>
                      update(item.localId, {
                        detail_label: e.target.value || null,
                      })
                    }
                    placeholder='Material detail'
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className='flex min-w-44 flex-col gap-2'>
                  <div className='flex items-center justify-between rounded-md border px-3 py-2'>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Ayat/hal reference
                    </span>
                    <Switch
                      checked={item.uses_reference}
                      onCheckedChange={(usesReference) =>
                        update(item.localId, {
                          uses_reference: usesReference,
                          reference_from: usesReference
                            ? item.reference_from
                            : null,
                          reference_to: usesReference
                            ? item.reference_to
                            : null,
                        })
                      }
                    />
                  </div>
                  {item.uses_reference ? (
                    <>
                      <Input
                        value={item.reference_from ?? ''}
                        onChange={(e) =>
                          update(item.localId, {
                            reference_from: e.target.value || null,
                          })
                        }
                        placeholder='From'
                      />
                      <Input
                        value={item.reference_to ?? ''}
                        onChange={(e) =>
                          update(item.localId, {
                            reference_to: e.target.value || null,
                          })
                        }
                        placeholder='To'
                      />
                    </>
                  ) : (
                    <p className='text-xs text-muted-foreground'>
                      Do not show Ayat/hal reference fields.
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className='text-right tabular-nums'>
                {Math.round(item.confidence * 100)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

async function readWorkbookPreview(
  file: File
): Promise<WorkbookPreviewSheet[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text()
    return [
      {
        name: 'CSV',
        rows: text.split(/\r?\n/).map((line, index) => ({
          rowNumber: index + 1,
          cells: line
            .split(',')
            .map((cell) => cell.trim())
            .slice(0, 24),
        })),
      },
    ]
  }

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  return workbook.worksheets.map((sheet) => {
    const rows: WorkbookPreviewRow[] = []
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = []
      const columnCount = Math.min(Math.max(sheet.columnCount, 12), 24)
      for (let col = 1; col <= columnCount; col += 1) {
        cells.push(row.getCell(col).text.trim())
      }
      if (cells.some(Boolean)) rows.push({ rowNumber, cells })
    })
    return { name: sheet.name, rows }
  })
}

const MONTHS = [
  ['JANUARI', 1],
  ['FEBRUARI', 2],
  ['MARET', 3],
  ['APRIL', 4],
  ['MEI', 5],
  ['JUNI', 6],
  ['JULI', 7],
  ['AGUSTUS', 8],
  ['SEPTEMBER', 9],
  ['OKTOBER', 10],
  ['NOVEMBER', 11],
  ['DESEMBER', 12],
] as const

function deterministicParse({
  year: _year,
  defaultLevel,
  sheets,
}: {
  year: number
  defaultLevel: CharacterMonitoringLevel
  sheets: WorkbookPreviewSheet[]
}): ParseResult {
  const items: ParsedItem[] = []
  const issues: ParseResult['issues'] = []

  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue
    const headerRowIndex = findHeaderRowIndex(sheet.rows)
    const first = sheet.rows[headerRowIndex]?.cells ?? []
    const second = sheet.rows[headerRowIndex + 1]?.cells ?? []
    const headers = Array.from({
      length: Math.max(first.length, second.length, 12),
    }).map((_, index) => {
      const firstValue = normalizeText(first[index])
      const secondValue = normalizeText(second[index])
      return firstValue === secondValue
        ? firstValue
        : normalizeText(`${firstValue} ${secondValue}`)
    })
    const mapping = makeMapping(headers)
    let currentMonth: { label: string; index: number } | null = null
    let currentCategory = ''

    for (const row of sheet.rows.slice(headerRowIndex + 1)) {
      const cells = row.cells.map(normalizeText)
      const rowText = cells.join(' ')
      const month = normalizeMonth(rowText)
      if (month) currentMonth = month
      if (!currentMonth) continue

      const material = normalizeMaterialText(cells[mapping.material])
      const detail = normalizeMaterialText(cells[mapping.detail])
      const rawCategory = normalizeText(cells[mapping.category])
      if (isUsefulCategory(rawCategory)) currentCategory = rawCategory
      const category = normalizeCategoryLabel(
        currentCategory,
        material,
        defaultLevel
      )

      if (!material && !detail) continue
      if (isNonMaterialRow(material, detail)) continue
      if (shouldSkipMaterialOnlyRow(material, detail)) continue

      items.push({
        month_label: currentMonth.label,
        month_index: currentMonth.index,
        level_code: defaultLevel,
        category_label: category,
        material_label: material || detail,
        detail_label: detail || null,
        reference_from:
          mapping.referenceFrom >= 0
            ? normalizeText(cells[mapping.referenceFrom])
            : null,
        reference_to:
          mapping.referenceTo >= 0
            ? normalizeText(cells[mapping.referenceTo])
            : null,
        uses_reference:
          isReferenceMaterialText(material, detail) ||
          Boolean(
            mapping.referenceFrom >= 0 &&
            normalizeText(cells[mapping.referenceFrom])
          ) ||
          Boolean(
            mapping.referenceTo >= 0 &&
            normalizeText(cells[mapping.referenceTo])
          ),
        source_sheet: sheet.name,
        source_row: row.rowNumber,
        confidence: 0.62,
      })
    }
  }

  if (items.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Tidak ada baris materi yang bisa dibaca dari workbook.',
    })
  }

  return {
    parser_method: 'deterministic',
    confidence: items.length > 0 ? 0.78 : 0,
    mapping: {
      month_column: 'Bulan',
      level_column: null,
      category_column: 'Kategori terakhir',
      material_column: 'Materi',
      detail_column: 'Detail Materi',
      reference_from_column: 'Dari',
      reference_to_column: 'Sampai',
    },
    issues,
    items,
  }
}

function forceParseLevel(
  result: ParseResult,
  level: CharacterMonitoringLevel
): ParseResult {
  return {
    ...result,
    mapping: {
      ...result.mapping,
      level_column: `Default Jenjang (${level})`,
    },
    items: result.items.map((item) => ({
      ...item,
      level_code: level,
      material_label: normalizeMaterialText(item.material_label),
      detail_label: normalizeMaterialText(item.detail_label) || null,
    })),
  }
}

function normalizeParseResult(result: ParseResult): ParseResult {
  let skippedRows = 0
  const items = result.items.reduce<ParsedItem[]>((acc, item) => {
    const material = normalizeMaterialText(item.material_label)
    const detail = normalizeMaterialText(item.detail_label)
    if (!material && !detail) {
      skippedRows += 1
      return acc
    }
    if (isNonMaterialRow(material, detail)) {
      skippedRows += 1
      return acc
    }
    if (shouldSkipMaterialOnlyRow(material, detail)) {
      skippedRows += 1
      return acc
    }
    acc.push({
      ...item,
      material_label: material || detail,
      detail_label: detail || null,
      reference_from: normalizeMaterialText(item.reference_from) || null,
      reference_to: normalizeMaterialText(item.reference_to) || null,
      uses_reference:
        item.uses_reference ||
        isReferenceMaterialText(material, detail) ||
        Boolean(item.reference_from || item.reference_to),
    })
    return acc
  }, [])

  return {
    ...result,
    issues:
      skippedRows > 0
        ? [
            ...result.issues,
            {
              severity: 'info',
              message: `${skippedRows} baris kosong/placeholder diabaikan saat parsing.`,
            },
          ]
        : result.issues,
    items,
  }
}

function findHeaderRowIndex(rows: WorkbookPreviewRow[]): number {
  const index = rows.findIndex((row) => {
    const text = normalizeText(row.cells.join(' ')).toLowerCase()
    return (
      text.includes('bulan') &&
      text.includes('materi') &&
      (text.includes('realisasi') ||
        text.includes('ayat') ||
        text.includes('hal'))
    )
  })
  return index >= 0 ? index : 0
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeMaterialText(value: unknown): string {
  const text = normalizeText(value)
  if (/^(?:0|[-–—])$/.test(text)) return ''
  return text
}

function normalizeMonth(
  value: string
): { label: string; index: number } | null {
  const upper = value.toUpperCase()
  const match = MONTHS.find(([label]) => upper.includes(label))
  if (!match) return null
  return { label: match[0], index: match[1] }
}

function isUsefulCategory(value: string): boolean {
  const lower = value.toLowerCase()
  if (!lower) return false
  if (lower.includes('kategori')) return false
  if (lower.includes('29 karakter')) return false
  if (lower.includes('bulan')) return false
  return true
}

function normalizeCategoryLabel(
  value: string,
  material: string,
  defaultLevel: CharacterMonitoringLevel
): string {
  const lower = `${value} ${material}`.toLowerCase()
  if (lower.includes('akhlak')) return 'Akhlakul Karimah'
  if (lower.includes('kemandirian')) return 'Kemandirian'
  if (lower.includes('monitoring') || lower.includes('penerapan 29')) {
    return 'Monitoring'
  }
  if (
    lower.includes('faqih') ||
    lower.includes('faham') ||
    lower.includes('jamaah') ||
    lower.includes('surga') ||
    lower.includes('praktik ibadah')
  ) {
    return 'Faqih'
  }
  if (
    lower.includes('alim') ||
    lower.includes('quran') ||
    lower.includes('hadist') ||
    lower.includes('hafalan') ||
    lower.includes('doa') ||
    lower.includes('arab')
  ) {
    return 'Alim'
  }
  return defaultLevel === 'ACR' ? 'Akhlakul Karimah' : 'Lainnya'
}

function isNonMaterialRow(material: string, detail: string): boolean {
  const lower = `${material} ${detail}`.toLowerCase()
  if (lower.includes('rata-rata')) return true
  if (lower.includes('bulan') && lower.includes('materi')) return true
  if (lower.includes('realisasi') && lower.includes('kurang materi'))
    return true
  if (lower.includes('paraf')) return true
  return false
}

function shouldSkipMaterialOnlyRow(material: string, detail: string): boolean {
  if (!material || detail) return false
  return !isReferenceMaterial(material)
}

function isReferenceMaterial(material: string): boolean {
  const lower = material.toLowerCase()
  return /\bmakna\s+qur/.test(lower) || /\bhadi[st]/.test(lower)
}

function isReferenceMaterialText(
  material: string | null,
  detail: string | null
): boolean {
  const lower = `${material ?? ''} ${detail ?? ''}`.toLowerCase()
  return (
    lower.includes('quran') ||
    lower.includes('qur') ||
    lower.includes('hadist') ||
    lower.includes('hadis')
  )
}

function makeMapping(headers: string[]) {
  const lower = headers.map((header) => header.toLowerCase())
  const findIndex = (terms: string[]) =>
    lower.findIndex((header) => terms.every((term) => header.includes(term)))
  const kategoriColumns = lower.reduce<
    Array<{ header: string; index: number }>
  >((columns, header, index) => {
    if (header.includes('kategori')) columns.push({ header, index })
    return columns
  }, [])
  const materialIndex = findIndex(['materi'])
  const detailIndex = findIndex(['detail', 'materi'])
  const dariIndex = findIndex(['dari'])
  const sampaiIndex = findIndex(['sampai'])
  const ayatIndex = findIndex(['ayat'])
  const halIndex = findIndex(['hal'])
  const categoryIndex =
    materialIndex > 0
      ? materialIndex - 1
      : kategoriColumns.length > 1
        ? kategoriColumns[kategoriColumns.length - 1].index
        : findIndex(['kategori'])

  return {
    month: Math.max(findIndex(['bulan']), 0),
    level: findIndex(['jenjang']),
    category: categoryIndex,
    material: materialIndex >= 0 ? materialIndex : 3,
    detail: detailIndex >= 0 ? detailIndex : 4,
    referenceFrom: dariIndex >= 0 ? dariIndex : ayatIndex,
    referenceTo: sampaiIndex >= 0 ? sampaiIndex : halIndex,
  }
}

async function uploadSourceFile(file: File, year: number): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const path = `${year}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

function toInsertItem(
  templateId: string,
  item: EditableItem,
  index: number
): CharacterTargetItemInsert {
  return {
    template_id: templateId,
    month_index: item.month_index,
    month_label: item.month_label,
    level_code: item.level_code,
    category_label: item.category_label.trim() || 'Lainnya',
    material_label: item.material_label.trim(),
    detail_label: item.detail_label?.trim() || null,
    reference_from: item.uses_reference
      ? item.reference_from?.trim() || null
      : null,
    reference_to: item.uses_reference
      ? item.reference_to?.trim() || null
      : null,
    uses_reference: item.uses_reference,
    source_sheet: item.source_sheet,
    source_row: item.source_row,
    sort_order: index + 1,
    active: true,
  }
}

function emptyEditableItem(
  level: CharacterMonitoringLevel,
  index: number
): EditableItem {
  return {
    localId: `manual_${Date.now()}_${index}`,
    month_label: 'JANUARI',
    month_index: 1,
    level_code: level,
    category_label: 'Akhlakul Karimah',
    material_label: '',
    detail_label: null,
    reference_from: null,
    reference_to: null,
    uses_reference: false,
    source_sheet: null,
    source_row: null,
    confidence: 1,
  }
}
