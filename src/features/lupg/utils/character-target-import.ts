import {
  TARGET_LEVEL_LABELS,
  type CharacterTargetLevel,
} from './character-targets'

export interface WorkbookPreviewRow {
  rowNumber: number
  cells: string[]
}

export interface WorkbookPreviewSheet {
  name: string
  rows: WorkbookPreviewRow[]
}

export interface ParsedItem {
  month_label: string
  month_index: number
  level_code: CharacterTargetLevel
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

export interface ParseResult {
  parser_method: 'deterministic'
  confidence: number
  mapping: Record<string, string | null>
  issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>
  items: ParsedItem[]
  deployment_name?: string
}

export async function readWorkbookPreview(
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

  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  return workbook.worksheets.map((sheet) => {
    const rows: WorkbookPreviewRow[] = []
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = []
      const columnCount = Math.min(Math.max(sheet.columnCount, 12), 24)
      for (let col = 1; col <= columnCount; col += 1) {
        const cell = row.getCell(col)
        cells.push(
          cell.isMerged && cell.master.address !== cell.address
            ? ''
            : cell.text.trim()
        )
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

export function deterministicParse({
  year: _year,
  defaultLevel,
  sheets,
  filename,
}: {
  year: number
  defaultLevel: CharacterTargetLevel
  sheets: WorkbookPreviewSheet[]
  filename?: string
}): ParseResult {
  const items: ParsedItem[] = []
  const issues: ParseResult['issues'] = []

  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue
    const headerRowIndex = findHeaderRowIndex(sheet.rows)
    if (headerRowIndex < 0) continue
    const headingLevel = sheet.rows
      .slice(0, headerRowIndex)
      .map((row) => detectTargetLevel(row.cells.join(' ')))
      .find((level) => level !== null)
    const fileLevel = filename ? detectTargetLevel(filename) : null
    if (
      (headingLevel && headingLevel !== defaultLevel) ||
      (fileLevel && fileLevel !== defaultLevel)
    ) {
      issues.push({
        severity: fileLevel === defaultLevel ? 'info' : 'warning',
        message: `${filename ?? sheet.name}${headingLevel ? ` berjudul ${TARGET_LEVEL_LABELS[headingLevel]}` : ''}. Hasil memakai ${TARGET_LEVEL_LABELS[defaultLevel]} sesuai jenjang impor.`,
      })
    }
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
    let currentMaterial = ''

    for (const row of sheet.rows.slice(headerRowIndex + 1)) {
      const cells = row.cells.map(normalizeText)
      const month = normalizeMonth(cells[mapping.month] ?? '')
      if (month && month.index !== currentMonth?.index) {
        currentMaterial = ''
        currentCategory = ''
      }
      if (month) currentMonth = month
      if (!currentMonth) continue

      const material = normalizeMaterialText(cells[mapping.material])
      const detail = normalizeMaterialText(cells[mapping.detail])
      if (material) currentMaterial = material
      const rawCategory = normalizeText(cells[mapping.category])
      if (isUsefulCategory(rawCategory)) currentCategory = rawCategory
      const category = normalizeCategoryLabel(
        currentCategory,
        currentMaterial,
        defaultLevel
      )

      if (!detail || !currentMaterial) continue
      if (isNonMaterialRow(currentMaterial, detail)) continue

      items.push({
        month_label: currentMonth.label,
        month_index: currentMonth.index,
        level_code: defaultLevel,
        category_label: category,
        material_label: currentMaterial,
        detail_label: detail,
        reference_from:
          mapping.referenceFrom >= 0
            ? normalizeText(cells[mapping.referenceFrom])
            : null,
        reference_to:
          mapping.referenceTo >= 0
            ? normalizeText(cells[mapping.referenceTo])
            : null,
        uses_reference:
          isReferenceMaterialText(currentMaterial, detail) ||
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

export function forceParseLevel(
  result: ParseResult,
  level: CharacterTargetLevel
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

export function normalizeParseResult(result: ParseResult): ParseResult {
  let skippedRows = 0
  const items = result.items.reduce<ParsedItem[]>((acc, item) => {
    const material = normalizeMaterialText(item.material_label)
    const detail = normalizeMaterialText(item.detail_label)
    if (!material || !detail || isNonMaterialRow(material, detail)) {
      skippedRows += 1
      return acc
    }
    acc.push({
      ...item,
      material_label: material,
      detail_label: detail,
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

export function findHeaderRowIndex(rows: WorkbookPreviewRow[]): number {
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
  return index
}

export function detectTargetLevel(value: string): CharacterTargetLevel | null {
  const text = normalizeText(value).toUpperCase()
  if (/\bPAUD\b/.test(text)) return 'PAUD'
  const grade = text.match(
    /(?:\bACR[\s_-]*(?:KELAS[\s_-]*)?|\bKELAS[\s_-]*)([1-6])\b/
  )
  if (grade) return `ACR_${grade[1]}` as CharacterTargetLevel
  return (
    (['APR', 'AR', 'GPN'] as const).find((level) =>
      new RegExp(`\\b${level}\\b`).test(text)
    ) ?? null
  )
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
  const match = MONTHS.find(([label]) =>
    new RegExp(`^${label}\\b`).test(upper.trim())
  )
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
  defaultLevel: CharacterTargetLevel
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
  return defaultLevel === 'PAUD' || defaultLevel.startsWith('ACR_')
    ? 'Akhlakul Karimah'
    : 'Lainnya'
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

export function isReferenceMaterialText(
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
  const detailIndex = findIndex(['detail', 'materi'])
  const materialIndex = lower.findIndex(
    (header, index) => header.includes('materi') && index !== detailIndex
  )
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
