export const expectedHeaders = [
  'No',
  'Kelompok',
  'KK',
  'Nama',
  'Jenis Kelamin',
  'Tanggal Lahir',
  'Usia',
  'Kategori',
  'Status',
  'Keterangan',
]

const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function decodeEntities(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return namedEntities[code.toLowerCase()] ?? entity
    const hexadecimal = code[1]?.toLowerCase() === 'x'
    const point = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
    try {
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity
    } catch {
      return entity
    }
  })
}

function cellText(html: string): string {
  const options = [...html.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
  if (options.length > 0) {
    // Data-cell <select> (source Keterangan): read the selected option. A cell
    // with options but no selected attribute is indeterminate — return '' so
    // keepRow drops it instead of staging the concatenated option list.
    const selected = options.find(([, attributes]) =>
      /(?:^|\s)selected(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?(?:\s|$)/i.test(attributes),
    )
    if (!selected) return ''
    return decodeEntities(selected[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
  }
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

// Header cells carry filter <select>/<br> controls whose option text must not
// leak into the header comparison (live: "KK Semua", "Jenis Kelamin Semua …").
// Strip nested controls first, then compare direct text only. Data cells keep
// cellText so the selected Keterangan option is still read.
function headerCellText(html: string): string {
  const withoutControls = html
    .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
  return decodeEntities(withoutControls.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function parseTableRows(html: string): string[][] {
  for (const tableMatch of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)) {
    const rawRows = [...tableMatch[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(([row]) =>
      [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cell[1]),
    )
    const headerIndex = rawRows.findIndex(
      (row) =>
        row.length === expectedHeaders.length &&
        row.every((cell, index) => headerCellText(cell) === expectedHeaders[index]),
    )
    if (headerIndex < 0) continue

    const dataRows = rawRows
      .slice(headerIndex + 1)
      .filter((row) => row.length > 0)
      .map((row) => row.map(cellText))
    if (dataRows.length === 0 || dataRows.some((row) => row.length !== expectedHeaders.length)) {
      throw new Error('Source table structure changed: invalid data rows')
    }
    return dataRows
  }
  throw new Error('Source table structure changed: exact headers not found')
}
