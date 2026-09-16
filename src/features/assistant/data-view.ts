import { z } from 'zod'

export const sourceRoutes = {
  absensi: [
    '/admin/dashboard',
    '/admin/attendance',
    '/admin/participants',
    '/admin/forms',
    '/admin/approvals',
  ],
  lupg: [
    '/admin/lupg/dashboard',
    '/admin/lupg/sensus',
    '/admin/lupg/programs',
    '/admin/lupg/phq/summary',
    '/admin/lupg/phq/participants',
    '/admin/lupg/phq/attendance',
    '/admin/lupg/phq/progress',
    '/admin/lupg/reports',
    '/admin/lupg/mustin',
    '/admin/lupg/recap',
    '/admin/lupg/presentation',
    '/admin/lupg/config',
    '/admin/lupg/apr-intensif',
    '/admin/lupg/ar-intensif',
  ],
} as const

const text = z.string().min(1).max(500)
const key = z.string().regex(/^[a-z][a-zA-Z0-9_]{0,63}$/)
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
function isCalendarLabel(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value)
  )
    return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return false
  if (day === undefined) return true
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return (
    day <=
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  )
}

const sourceSchema = z
  .object({
    workspace: z.enum(['absensi', 'lupg']),
    scope: text,
    month: monthSchema.optional(),
    route: text,
    section: text,
  })
  .strict()
  .refine(
    (source) =>
      (sourceRoutes[source.workspace] as readonly string[]).includes(
        source.route
      ),
    'Invalid source route'
  )
const tableSchema = z
  .object({
    summary: text,
    retrievedAt: z.string().datetime().optional(),
    pagination: z
      .object({
        offset: z.number().int().nonnegative(),
        limit: z.number().int().min(1).max(50),
        totalRows: z.number().int().nonnegative(),
        hasMore: z.boolean(),
      })
      .strict()
      .optional(),
    coverage: z
      .object({ complete: z.boolean(), reason: text.optional() })
      .strict()
      .optional(),
    source: sourceSchema,
    columns: z
      .array(
        z
          .object({
            key,
            label: text,
            format: z.enum(['text', 'number', 'percent', 'date']),
          })
          .strict()
      )
      .min(1)
      .max(10),
    rows: z
      .array(
        z.record(
          key,
          z.union([z.string().max(500), z.number().finite(), z.null()])
        )
      )
      .max(50),
  })
  .strict()
  .superRefine((data, ctx) => {
    const keys = data.columns.map((column) => column.key)
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate column' })
    for (const row of data.rows) {
      if (
        Object.keys(row).length !== keys.length ||
        Object.keys(row).some((k) => !keys.includes(k))
      ) {
        ctx.addIssue({ code: 'custom', message: 'Row must match columns' })
      }
      for (const column of data.columns) {
        const value = row[column.key]
        if (value === null) continue
        const numeric =
          column.format === 'number' || column.format === 'percent'
        if (column.format === 'date' && !isCalendarLabel(value))
          ctx.addIssue({ code: 'custom', message: 'Invalid calendar date' })
        if (typeof value !== (numeric ? 'number' : 'string'))
          ctx.addIssue({ code: 'custom', message: 'Invalid cell type' })
      }
    }
  })
const presentationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('table') }).strict(),
  z
    .object({
      kind: z.literal('cartesian'),
      chartType: z.enum(['bar', 'line', 'area', 'stacked-bar']),
      xKey: key,
      series: z
        .array(
          z
            .object({
              key,
              label: text,
              valueType: z.enum(['number', 'percent']),
            })
            .strict()
        )
        .min(1)
        .max(8),
    })
    .strict(),
  z
    .object({ kind: z.literal('pie'), categoryKey: key, valueKey: key })
    .strict(),
])

export const dataViewSchema = tableSchema
  .safeExtend({ presentation: presentationSchema })
  .superRefine((data, ctx) => {
    const p = data.presentation
    const issue = () =>
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid chart',
        path: ['presentation'],
      })
    const numeric = (k: string) =>
      data.columns.some(
        (c) => c.key === k && (c.format === 'number' || c.format === 'percent')
      )
    if (p.kind === 'table') return
    const xKey = p.kind === 'pie' ? p.categoryKey : p.xKey
    if (!data.columns.some((c) => c.key === xKey)) issue()
    if (p.kind === 'pie') {
      if (
        !numeric(p.valueKey) ||
        data.rows.length > 5 ||
        data.rows.some(
          (r) =>
            typeof r[p.valueKey] !== 'number' || (r[p.valueKey] as number) < 0
        ) ||
        data.rows.reduce(
          (sum, r) =>
            sum +
            (typeof r[p.valueKey] === 'number' ? (r[p.valueKey] as number) : 0),
          0
        ) <= 0
      )
        issue()
    } else {
      if (
        new Set(p.series.map((s) => s.key)).size !== p.series.length ||
        p.series.some(
          (s) =>
            !numeric(s.key) ||
            !data.columns.some(
              (c) => c.key === s.key && c.format === s.valueType
            )
        )
      )
        issue()
      if (p.chartType === 'area' || p.chartType === 'line') {
        if (!data.columns.some((c) => c.key === p.xKey && c.format === 'date'))
          issue()
        const dates = data.rows.map((r) => r[p.xKey])
        if (
          dates.some(
            (d, i) =>
              !isCalendarLabel(d) ||
              d.length !== String(dates[0]).length ||
              (i > 0 && String(dates[i - 1]) >= d)
          )
        )
          issue()
      }
    }
  })
export type AssistantDataResult = z.infer<typeof dataViewSchema>

export function parseDataView(input: unknown):
  | { status: 'validation-error' }
  | {
      status: 'complete' | 'empty' | 'chart-unavailable'
      data: AssistantDataResult
    } {
  const result = dataViewSchema.safeParse(input)
  if (result.success)
    return {
      status: result.data.rows.length ? 'complete' : 'empty',
      data: result.data,
    }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { status: 'validation-error' }
  const { presentation: _presentation, ...table } = input as Record<
    string,
    unknown
  >
  const validTable = tableSchema.safeParse(table)
  if (!validTable.success) return { status: 'validation-error' }
  return {
    status: validTable.data.rows.length ? 'chart-unavailable' : 'empty',
    data: { ...validTable.data, presentation: { kind: 'table' } },
  }
}
