import { useState } from 'react'
import { Loader2, Send, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReportStatusBadge } from '../../components/report-status-badge'
import {
  useSubmitMonthlyReport,
  useUnlockMonthlyReport,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow } from '../../types'

interface Props {
  report: MonthlyReportRow
}

export function SubmitCard({ report }: Props) {
  const { role } = useAuthStore((s) => s.auth)
  const isAdmin = role === 'super_admin' || role === 'admin'
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmUnlock, setConfirmUnlock] = useState(false)

  const submit = useSubmitMonthlyReport()
  const unlock = useUnlockMonthlyReport()

  const isSubmitted = report.status === 'submitted'

  const handleSubmit = () => {
    submit.mutate(report.id, {
      onSuccess: () => {
        toast.success('Laporan berhasil disubmit dan dikunci.')
        setConfirmSubmit(false)
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Gagal submit'
        toast.error(msg)
      },
    })
  }

  const handleUnlock = () => {
    unlock.mutate(report.id, {
      onSuccess: () => {
        toast.success('Laporan di-unlock. Status kembali ke Draft.')
        setConfirmUnlock(false)
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Gagal unlock'
        toast.error(msg)
      },
    })
  }

  return (
    <>
      <Card>
        <CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2'>
            <ReportStatusBadge
              status={report.status as 'draft' | 'submitted'}
              locked={report.locked}
            />
            {report.submitted_at && (
              <span className='text-xs text-muted-foreground'>
                Disubmit{' '}
                {new Date(report.submitted_at).toLocaleString('id-ID')}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {!isSubmitted && (
              <Button
                onClick={() => setConfirmSubmit(true)}
                disabled={submit.isPending}
              >
                {submit.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Send className='mr-2 h-4 w-4' />
                )}
                Submit Laporan
              </Button>
            )}
            {isSubmitted && isAdmin && (
              <Button
                variant='outline'
                onClick={() => setConfirmUnlock(true)}
                disabled={unlock.isPending}
              >
                {unlock.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Unlock className='mr-2 h-4 w-4' />
                )}
                Unlock
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit laporan bulan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Setelah submit, laporan akan <strong>terkunci</strong> dan
              data sensus saat ini akan disimpan sebagai snapshot. Hanya
              admin yang bisa unlock laporan untuk revisi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Ya, Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnlock} onOpenChange={setConfirmUnlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelompok akan bisa mengedit laporan ini lagi. Snapshot sensus
              yang sudah terbuat tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock}>
              Ya, Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
