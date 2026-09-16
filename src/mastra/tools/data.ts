import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

export const callerSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['super_admin', 'admin']),
  accessToken: z.string().min(1),
  workspace: z.enum(['absensi', 'lupg']),
  modelId: z.string().min(1),
})
export type DataConfig = { url: string; key: string; fetch?: typeof fetch }

export function callerDatabase(
  config: DataConfig,
  accessToken: string,
  abortSignal?: AbortSignal
) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(15_000),
    ...(abortSignal ? [abortSignal] : []),
  ])
  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: config.fetch,
    },
  })
  return { client, signal }
}

export async function readRows<T>(
  schema: z.ZodType<T>,
  signal: AbortSignal,
  query: (
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  // Pagination prevents silently treating a capped Supabase response as a complete aggregate.
  for (let offset = 0; ; offset += 500) {
    signal.throwIfAborted()
    const { data, error } = await query(offset, offset + 499)
    if (error) throw new Error('QUERY_ERROR')
    const page = z.array(schema).parse(data)
    rows.push(...page)
    if (page.length < 500) return rows
    if (rows.length >= 10000) throw new Error('QUERY_LIMIT')
  }
}

export function currentReportingMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`
}

// Half-open UTC instants for an Asia/Jakarta calendar month. Jakarta is
// UTC+7 year-round, so these bounds are exact without DST handling.
export function monthRange(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const next =
    mon === 12
      ? `${year + 1}-01`
      : `${year}-${String(mon + 1).padStart(2, '0')}`
  return {
    start: `${month}-01T00:00:00+07:00`,
    end: `${next}-01T00:00:00+07:00`,
  }
}

export function jakartaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  return ['year', 'month', 'day']
    .map((kind) => parts.find((part) => part.type === kind)!.value)
    .join('-')
}
export function defaultReportMonth(now = new Date()) {
  const date = jakartaDate(now)
  const [year, month, day] = date.split('-').map(Number)
  if (day >= 8) return date.slice(0, 7)
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`
}
export const scopeFields = {
  kelompok: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Exact kelompok name; use allGroups to clear previous scope.'),
  kelompokId: z.string().uuid().optional(),
  allGroups: z.boolean().optional(),
  offset: z.number().int().min(0).max(10000).default(0),
  limit: z.number().int().min(1).max(50).default(50),
}
export type ScopeInput = {
  kelompok?: string
  kelompokId?: string
  allGroups?: boolean
  offset?: number
  limit?: number
}
export const groupRow = z.object({ id: z.string().uuid(), value: z.string() })
export type ResolvedScope = {
  id?: string
  label: string
  groups: z.infer<typeof groupRow>[]
  unresolved?: string[]
}
export async function resolveScope(
  client: ReturnType<typeof callerDatabase>['client'],
  signal: AbortSignal,
  input: ScopeInput
): Promise<ResolvedScope> {
  const groups = await readRows(groupRow, signal, (from, to) =>
    client
      .from('lookup_values')
      .select('id,value')
      .eq('type', 'GROUP')
      .order('value')
      .order('id')
      .range(from, to)
      .abortSignal(signal)
  )
  if (input.allGroups || (!input.kelompok && !input.kelompokId))
    return { label: 'Seluruh kelompok', groups }
  const normalize = (name: string) =>
    name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id')
  const name = input.kelompok ? normalize(input.kelompok) : undefined
  const exact = groups.filter(
    (g) =>
      (!input.kelompokId || g.id === input.kelompokId) &&
      (!name || normalize(g.value) === name)
  )
  if (exact.length === 1)
    return { id: exact[0].id, label: exact[0].value, groups: exact }
  return {
    label: input.kelompok ?? input.kelompokId!,
    groups: [],
    unresolved: groups
      .filter((g) => name && normalize(g.value).includes(name))
      .map((g) => g.value),
  }
}
