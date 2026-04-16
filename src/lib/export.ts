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
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName ?? 'Sheet1')

  if (data.length > 0) {
    const headers = Object.keys(data[0])
    worksheet.columns = headers.map((key) => ({ header: key, key }))
    worksheet.addRows(data)
  }

  // Browser-safe export
  const buffer = await workbook.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
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
