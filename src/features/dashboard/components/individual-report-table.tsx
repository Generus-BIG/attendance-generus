'use client'

import { useState } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { statsService } from '@/lib/storage'

type IndividualReport = {
  id: string
  name: string
  kelompok: string
  kategori: string
  totalHadir: number
  totalIzin: number
  totalRecords: number
  attendanceRate: number
}

export function IndividualReportTable() {
  const [data] = useState<IndividualReport[]>(() => {
    const now = new Date()
    const startDate = startOfMonth(now)
    const endDate = endOfMonth(now)

    const report = statsService.getIndividualReport(startDate, endDate)
    // Sort by attendance rate descending
    report.sort((a, b) => b.attendanceRate - a.attendanceRate)
    return report
  })

  if (data.length === 0) {
    return (
      <div className='flex h-32 items-center justify-center text-muted-foreground'>
        Belum ada data absensi
      </div>
    )
  }

  return (
    <div className='max-h-100 overflow-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Kelompok</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className='text-center'>Hadir</TableHead>
            <TableHead className='text-center'>Izin</TableHead>
            <TableHead>Tingkat Kehadiran</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='font-medium'>{row.name}</TableCell>
              <TableCell>{row.kelompok}</TableCell>
              <TableCell>
                <Badge variant='outline'>Kategori {row.kategori}</Badge>
              </TableCell>
              <TableCell className='text-center'>
                <span className='text-teal-600 font-medium'>{row.totalHadir}</span>
              </TableCell>
              <TableCell className='text-center'>
                <span className='text-amber-600 font-medium'>{row.totalIzin}</span>
              </TableCell>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <Progress
                    value={row.attendanceRate}
                    className='h-2 w-24'
                  />
                  <span className='text-sm text-muted-foreground w-12'>
                    {row.attendanceRate}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
