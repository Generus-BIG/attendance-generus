"use client"

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Check, X, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type PendingParticipant } from '@/lib/schema'
import { approvalService } from '../services'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function HistoryApprovalTab() {
  const queryClient = useQueryClient()

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalService.delete(id),
    onSuccess: () => {
      toast.success('Berhasil menghapus riwayat')
      queryClient.invalidateQueries({ queryKey: ['approvals', 'history'] })
      setDeleteId(null)
    },
    onError: () => {
      toast.error('Gagal menghapus riwayat')
    },
  })

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
              <TableHead>Name</TableHead>
              <TableHead>Biodata</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className='w-10'>Clear History</TableHead>
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
                <TableCell>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title='Hapus Riwayat'
        desc='Apakah Anda yakin ingin menghapus riwayat persetujuan ini? Tindakan ini tidak dapat dibatalkan.'
        confirmText='Hapus'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </Card>
  )
}
