import { parseDataView, type AssistantDataResult } from './data-view'

export type CopyPart = {
  type: string
  text?: unknown
  toolName?: unknown
  result?: unknown
  output?: unknown
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

function formatCell(value: string | number | null, format: string): string {
  if (value === null) return '—'
  if (typeof value === 'number')
    return `${value}${format === 'percent' ? '%' : ''}`
  return escapeCell(value)
}

export function dataViewToMarkdown(data: AssistantDataResult): string {
  const head = [
    `## ${data.source.section}`,
    `${data.source.workspace.toUpperCase()} · ${data.source.month ?? 'Current data'} · ${data.source.scope}`,
    data.summary,
  ]
  if (!data.rows.length) return head.join('\n')
  return [
    ...head,
    `| ${data.columns.map((column) => escapeCell(column.label)).join(' | ')} |`,
    `| ${data.columns.map(() => '---').join(' | ')} |`,
    ...data.rows.map(
      (row) =>
        `| ${data.columns.map((column) => formatCell(row[column.key] ?? null, column.format)).join(' | ')} |`
    ),
  ].join('\n')
}

export function buildCopyMarkdown(parts: ReadonlyArray<CopyPart>): string {
  const blocks: string[] = []
  for (const part of parts) {
    if (
      part.type === 'text' &&
      typeof part.text === 'string' &&
      part.text.trim()
    ) {
      blocks.push(part.text.trim())
    } else if (part.type === 'tool-call' || part.type.startsWith('tool-')) {
      const parsed = parseDataView(part.output ?? part.result)
      if (parsed.status !== 'validation-error')
        blocks.push(dataViewToMarkdown(parsed.data))
    }
  }
  return blocks.join('\n\n')
}

export function hasExportableContent(parts: ReadonlyArray<CopyPart>): boolean {
  return buildCopyMarkdown(parts).length > 0
}
