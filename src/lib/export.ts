type ExportToExcelOptions = {
  sheetName?: string
}

function sanitizeFileName(fileName: string) {
  return (fileName || 'export')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .slice(0, 150)
}

export async function exportToExcel(
  data: any[],
  fileName: string,
  options: ExportToExcelOptions = {}
) {
  const xlsxModule = await import('xlsx')
  const XLSX = (xlsxModule as any).default ?? xlsxModule

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName ?? 'Sheet1')

  // Browser-safe export
  const arrayBuffer: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = sanitizeFileName(fileName)

  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName}.xlsx`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
