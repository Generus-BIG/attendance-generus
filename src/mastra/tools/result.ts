import {
  dataViewSchema,
  type AssistantDataResult,
} from '../../features/assistant/data-view'
import { type ScopeInput, type ResolvedScope } from './data'

type Cell = string | number | null
export function resultView(
  source: AssistantDataResult['source'],
  summary: string,
  columns: AssistantDataResult['columns'],
  rows: Record<string, Cell>[],
  input: ScopeInput = {},
  incomplete?: string,
  presentation: AssistantDataResult['presentation'] = { kind: 'table' }
): AssistantDataResult {
  const offset = input.offset ?? 0,
    limit = input.limit ?? 50
  const chart = presentation.kind !== 'table'
  // ponytail: charts are already aggregated; cap at the existing 50-row contract, add chart pagination only when a real chart needs more marks.
  const visible = chart ? rows.slice(0, 50) : rows.slice(offset, offset + limit)
  return dataViewSchema.parse({
    source,
    summary: summary.slice(0, 500),
    columns,
    rows: visible.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.slice(0, 500) : value,
        ])
      )
    ),
    retrievedAt: new Date().toISOString(),
    pagination: {
      offset: chart ? 0 : offset,
      limit,
      totalRows: rows.length,
      hasMore: !chart && offset + limit < rows.length,
    },
    coverage: {
      complete: !incomplete,
      ...(incomplete ? { reason: incomplete } : {}),
    },
    presentation,
  })
}
export function scopeResult(
  scope: ResolvedScope,
  workspace: 'lupg' | 'absensi'
) {
  return resultView(
    {
      workspace,
      scope: scope.label,
      route:
        workspace === 'lupg' ? '/admin/lupg/dashboard' : '/admin/dashboard',
      section: 'Kelompok',
    },
    'Kelompok belum dapat dipastikan. Pilih nama kelompok yang tepat.',
    [{ key: 'kelompok', label: 'Kandidat kelompok', format: 'text' }],
    (scope.unresolved ?? []).map((kelompok) => ({ kelompok })),
    {},
    'Cakupan belum terselesaikan; data domain tidak dibaca.'
  )
}
export const col = (
  key: string,
  label: string,
  format: AssistantDataResult['columns'][number]['format'] = 'text'
) => ({ key, label, format })
