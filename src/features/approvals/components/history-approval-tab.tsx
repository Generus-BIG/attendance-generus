'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { id as idLocale } from 'date-fns/locale'
import { Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { type PendingParticipant } from '@/lib/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatKategoriLabel } from '../approval-utils'
import { approvalService } from '../services'

export function HistoryApprovalTab() {
  const queryClient = useQueryClient()

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalService.delete(id),
    onSuccess: () => {
      toast.success('Approval history deleted')
      queryClient.invalidateQueries({ queryKey: ['approvals', 'history'] })
      setDeleteId(null)
    },
    onError: () => {
      toast.error('Could not delete approval history')
    },
  })

  const historyQuery = useQuery({
    queryKey: ['approvals', 'history'],
    queryFn: approvalService.getHistory,
  })

  const historyList = (historyQuery.data ?? []) as PendingParticipant[]

  useEffect(() => {
    if (historyQuery.error) {
      toast.error('Could not load approval history')
    }
  }, [historyQuery.error])

  if (historyList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
          <CardDescription>
            Participant approval and rejection history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-32 items-center justify-center text-muted-foreground'>
            No history yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval History</CardTitle>
        <CardDescription>
          Latest {historyList.length} submissions
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
                    <span>
                      {item.suggestedKelompok} -{' '}
                      {formatKategoriLabel(item.suggestedKategori)}
                    </span>
                    <span>
                      {item.suggestedGender === 'L' ? 'Male' : 'Female'}
                    </span>
                    {item.birthPlace && item.birthDate && (
                      <span className='text-xs'>
                        Born: {item.birthPlace},{' '}
                        {format(item.birthDate, 'dd MMM yyyy', {
                          locale: idLocale,
                        })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === 'approved' ? 'default' : 'destructive'
                    }
                  >
                    {item.status === 'approved' ? (
                      <div className='flex items-center gap-1'>
                        <Check className='h-3 w-3' /> Approved
                      </div>
                    ) : (
                      <div className='flex items-center gap-1'>
                        <X className='h-3 w-3' /> Rejected
                      </div>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(item.updatedAt, 'dd MMM yyyy HH:mm', {
                    locale: idLocale,
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-11 w-11 text-destructive hover:bg-destructive/10 hover:text-destructive'
                    aria-label='Delete approval history'
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
        title='Delete History'
        desc='Are you sure you want to delete this approval history entry? This cannot be undone.'
        confirmText='Delete'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </Card>
  )
}
