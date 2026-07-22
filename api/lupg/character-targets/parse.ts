import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

type Role = 'super_admin' | 'admin' | 'team_manager' | 'member'
type CharacterLevel = 'ACR' | 'APR' | 'AR' | 'GPN'

interface WorkbookPreviewRow {
  rowNumber: number
  cells: string[]
}

interface WorkbookPreviewSheet {
  name: string
  rows: WorkbookPreviewRow[]
}

interface ParseRequest {
  year: number
  defaultLevel: CharacterLevel
  sheets: WorkbookPreviewSheet[]
}

interface ParsedItem {
  month_label: string
  month_index: number
  level_code: CharacterLevel
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

interface ParseIssue {
  severity: 'info' | 'warning' | 'error'
  message: string
}

interface ParseResult {
  parser_method: 'deterministic'
  confidence: number
  mapping: Record<string, string | null>
  issues: ParseIssue[]
  items: ParsedItem[]
  deployment_name?: string
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

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown
) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function getBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 1_500_000) throw new Error('Payload terlalu besar')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
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

function normalizeMonth(value: string): { label: string; index: number } | null {
  const upper = value.toUpperCase()
  const match = MONTHS.find(([label]) => upper.includes(label))
  if (!match) return null
  return { label: match[0], index: match[1] }
}

function makeMapping(headers: string[]) {
  const lower = headers.map((h) => h.toLowerCase())
  const findIndex = (terms: string[]) =>
    lower.findIndex((header) => terms.every((term) => header.includes(term)))
  const kategoriColumns = lower
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header.includes('kategori'))
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

function findHeaderRowIndex(rows: WorkbookPreviewRow[]): number {
  const index = rows.findIndex((row) => {
    const text = normalizeText(row.cells.join(' ')).toLowerCase()
    return (
      text.includes('bulan') &&
      text.includes('materi') &&
      (text.includes('realisasi') || text.includes('ayat') || text.includes('hal'))
    )
  })
  return index >= 0 ? index : 0
}

function isUsefulCategory(value: string): boolean {
  const lower = value.toLowerCase()
  if (!lower) return false
  if (lower.includes('kategori')) return false
  if (lower.includes('29 karakter')) return false
  if (lower.includes('bulan')) return false
  return true
}

function normalizeCategoryLabel(value: string, material: string): string {
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
  return 'Lainnya'
}

function isNonMaterialRow(material: string, detail: string): boolean {
  const lower = `${material} ${detail}`.toLowerCase()
  if (lower.includes('rata-rata')) return true
  if (lower.includes('bulan') && lower.includes('materi')) return true
  if (lower.includes('realisasi') && lower.includes('kurang materi')) return true
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

function normalizeParseResult(
  result: ParseResult,
  defaultLevel: CharacterLevel
): ParseResult {
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
      level_code: defaultLevel,
      category_label: normalizeCategoryLabel(item.category_label, material),
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
    mapping: {
      ...result.mapping,
      level_column: `Default Jenjang (${defaultLevel})`,
    },
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

function deterministicParse(input: ParseRequest): ParseResult {
  const items: ParsedItem[] = []
  const issues: ParseIssue[] = []

  for (const sheet of input.sheets) {
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
      const category = normalizeCategoryLabel(currentCategory, material)
      if (!material && !detail) continue
      if (isNonMaterialRow(material, detail)) continue
      if (shouldSkipMaterialOnlyRow(material, detail)) continue

      items.push({
        month_label: currentMonth.label,
        month_index: currentMonth.index,
        level_code: input.defaultLevel,
        category_label: category || 'Lainnya',
        material_label: material || detail,
        detail_label: detail || null,
        reference_from:
          mapping.referenceFrom >= 0
            ? normalizeText(cells[mapping.referenceFrom])
            : null,
        reference_to:
          mapping.referenceTo >= 0 ? normalizeText(cells[mapping.referenceTo]) : null,
        uses_reference:
          isReferenceMaterialText(material, detail) ||
          Boolean(
            mapping.referenceFrom >= 0 &&
              normalizeText(cells[mapping.referenceFrom])
          ) ||
          Boolean(
            mapping.referenceTo >= 0 && normalizeText(cells[mapping.referenceTo])
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
    confidence: items.length > 0 ? 0.62 : 0,
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
    deployment_name: 'deterministic',
  }
}

function isParseRequest(value: unknown): value is ParseRequest {
  const input = value as Partial<ParseRequest>
  return (
    typeof input.year === 'number' &&
    ['ACR', 'APR', 'AR', 'GPN'].includes(String(input.defaultLevel)) &&
    Array.isArray(input.sheets)
  )
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const token = getBearerToken(req)
  if (!token) {
    sendJson(res, 401, { error: 'Session tidak ditemukan' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl || !supabaseKey) {
    sendJson(res, 500, { error: 'Supabase env belum lengkap' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.getUser(token)
  const role = data?.user?.app_metadata?.role as Role | undefined
  if (error || !role) {
    sendJson(res, 401, { error: 'Session tidak valid' })
    return
  }
  if (role !== 'super_admin' && role !== 'admin') {
    sendJson(res, 403, { error: 'Hanya admin yang dapat import template' })
    return
  }

  try {
    const body = await readJsonBody(req)
    if (!isParseRequest(body)) {
      sendJson(res, 400, { error: 'Payload parser tidak valid' })
      return
    }

    const deterministicResult = normalizeParseResult(
      deterministicParse(body),
      body.defaultLevel
    )
    sendJson(res, 200, deterministicResult)
  } catch (e) {
    sendJson(res, 500, {
      error: e instanceof Error ? e.message : 'Gagal parsing template',
    })
  }
}
