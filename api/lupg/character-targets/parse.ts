import { createClient } from '@supabase/supabase-js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  deterministicParse,
  normalizeParseResult,
  type WorkbookPreviewSheet,
} from '../../../src/features/lupg/utils/character-target-import'
import {
  TARGET_LEVELS,
  type CharacterTargetLevel,
} from '../../../src/features/lupg/utils/character-targets'

type Role = 'super_admin' | 'admin' | 'team_manager' | 'mt' | 'member'
interface ParseRequest {
  year: number
  defaultLevel: CharacterTargetLevel
  sheets: WorkbookPreviewSheet[]
  filename?: string
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
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

export function isParseRequest(value: unknown): value is ParseRequest {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<ParseRequest>
  return (
    Number.isInteger(input.year) &&
    Number(input.year) >= 2000 &&
    Number(input.year) <= 2100 &&
    TARGET_LEVELS.includes(input.defaultLevel as CharacterTargetLevel) &&
    Array.isArray(input.sheets) &&
    input.sheets.every(
      (sheet) =>
        sheet &&
        typeof sheet.name === 'string' &&
        Array.isArray(sheet.rows) &&
        sheet.rows.every(
          (row) =>
            row &&
            Number.isInteger(row.rowNumber) &&
            row.rowNumber > 0 &&
            Array.isArray(row.cells) &&
            row.cells.every((cell) => typeof cell === 'string')
        )
    ) &&
    (input.filename === undefined || typeof input.filename === 'string')
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

    const deterministicResult = normalizeParseResult(deterministicParse(body))
    sendJson(res, 200, deterministicResult)
  } catch (e) {
    sendJson(res, 500, {
      error: e instanceof Error ? e.message : 'Gagal parsing template',
    })
  }
}
