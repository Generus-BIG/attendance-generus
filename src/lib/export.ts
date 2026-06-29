type ExportToExcelOptions = {
  sheetName?: string
  title?: string
  description?: string
  metadata?: Record<string, string | undefined>
}

function sanitizeFileName(fileName: string) {
  return (fileName || 'export')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .slice(0, 150)
}

export async function exportToExcel(
  data: Array<Record<string, unknown>>,
  fileName: string,
  options: ExportToExcelOptions = {}
) {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName ?? 'Sheet1')

  let currentRowIdx = 1

  // Add Title Block
  if (options.title) {
    worksheet.addRow([]) // Row 1 (Empty spacing)
    
    const kickerRow = worksheet.addRow(['ABSENSI MUMIBIG']) // Row 2
    kickerRow.getCell(1).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF71717A' } }
    
    const titleRow = worksheet.addRow([options.title]) // Row 3
    titleRow.getCell(1).font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF78350F' } } // Terracotta Brown/Amber
    
    if (options.description) {
      const descRow = worksheet.addRow([options.description]) // Row 4
      descRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF71717A' } }
    }
    
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        if (value) {
          const metaRow = worksheet.addRow([`${key}: ${value}`])
          metaRow.getCell(1).font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF3F3F46' } }
        }
      })
    }
    
    worksheet.addRow([]) // Spacer
    currentRowIdx = worksheet.rowCount + 1
  }

  if (data.length > 0) {
    const headers = Object.keys(data[0])
    
    // Add table header row
    const headerRow = worksheet.addRow(headers)
    headerRow.height = 28
    
    // Style headers
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9A3412' }, // Warm Terracotta primary color
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        bottom: { style: 'double', color: { argb: 'FF78350F' } },
        right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
      }
    })

    // Add data rows
    data.forEach((rowObj, idx) => {
      const rowValues = headers.map(h => rowObj[h])
      const row = worksheet.addRow(rowValues)
      row.height = 21

      const isEven = idx % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF18181B' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
          left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
          bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
          right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        }

        // Alignment based on header key/type
        const headerName = headers[colNumber - 1].toLowerCase()
        if (
          headerName.includes('tanggal') ||
          headerName.includes('waktu') ||
          headerName.includes('gender') ||
          headerName.includes('kategori') ||
          headerName.includes('status')
        ) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else if (headerName.includes('usia') || headerName.includes('jumlah') || headerName.includes('count')) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' }
        }
      })
    })

    // Auto-fit columns width
    worksheet.columns.forEach((column) => {
      let maxLen = 12
      column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        // Skip title rows when calculating column widths
        if (options.title && rowNumber < currentRowIdx) return
        const valStr = cell.value ? String(cell.value) : ''
        if (valStr.length > maxLen) {
          maxLen = valStr.length
        }
      })
      column.width = Math.min(maxLen + 4, 40) // cap width to 40 max
    })
  }

  // Save/Download Excel file
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
