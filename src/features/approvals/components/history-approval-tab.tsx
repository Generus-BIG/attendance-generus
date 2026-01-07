'use client'

import { useEffect } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type PendingParticipant } from '@/lib/schema'
import { approvalService } from '../services'
import { useQuery } from '@tanstack/react-query'

export function HistoryApprovalTab() {
  const historyQuery = useQuery({
    queryKey: ['approvals', 'history'],
    queryFn: approvalService.getHistory,
  })

  const historyList = (historyQuery.data ?? []) as PendingParticipant[]

  useEffect(() => {
    if (historyQuery.error) {
      toast.error('Gagal memuat riwayat persetujuan')
    }
  }, [historyQuery.error])

  if (historyList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>History Approval</CardTitle>
          <CardDescription>
            Riwayat persetujuan dan penolakan peserta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-center justify-center text-muted-foreground'>
            Tidak ada riwayat
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>History Approval</CardTitle>
        <CardDescription>
          Riwayat {historyList.length} pengajuan terakhir
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Saran Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Proses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyList.map((item) => (
              <TableRow key={item.id}>
                <TableCell className='font-medium'>{item.name}</TableCell>
                <TableCell>
                  <div className='flex flex-col gap-1 text-sm text-muted-foreground'>
                    <span>{item.suggestedKelompok} - {item.suggestedKategori}</span>
                    <span>{item.suggestedGender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    {item.birthPlace && item.birthDate && (
                      <span className='text-xs'>
                        Lahir: {item.birthPlace}, {format(item.birthDate, 'dd MMM yyyy', { locale: idLocale })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === 'approved' ? 'default' : 'destructive'}
                  >
                    {item.status === 'approved' ? (
                      <div className='flex items-center gap-1'>
                        <Check className='h-3 w-3' /> Disetujui
                      </div>
                    ) : (
                      <div className='flex items-center gap-1'>
                        <X className='h-3 w-3' /> Ditolak
                      </div>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                   {format(item.updatedAt, 'dd MMM yyyy HH:mm', { locale: idLocale })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
