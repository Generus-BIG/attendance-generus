import { useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
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
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmRevert, setConfirmRevert] = useState(false)

  const markDone = useSubmitMonthlyReport()
  const revert = useUnlockMonthlyReport()

  const isDone = report.status === 'submitted'

  const handleMarkDone = () => {
    markDone.mutate(report.id, {
      onSuccess: () => {
        toast.success('Laporan ditandai Selesai. Masih bisa diedit kapan saja.')
        setConfirmDone(false)
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Gagal menandai selesai'
        toast.error(msg)
      },
    })
  }

  const handleRevert = () => {
    revert.mutate(report.id, {
      onSuccess: () => {
        toast.success('Laporan dikembalikan ke status Belum Selesai.')
        setConfirmRevert(false)
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Gagal mengembalikan status'
        toast.error(msg)
      },
    })
  }

  return (
    <>
      <Card>
        <CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-col gap-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <ReportStatusBadge
                status={report.status as 'draft' | 'submitted'}
                locked={report.locked}
              />
              {report.submitted_at && (
                <span className='text-muted-foreground text-xs'>
                  Ditandai selesai{' '}
                  {new Date(report.submitted_at).toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <p className='text-muted-foreground text-xs'>
              {isDone
                ? 'Laporan ditandai selesai. Anda masih bisa mengedit bagian-bagian di atas jika ada revisi.'
                : 'Tandai laporan sebagai selesai jika seluruh bagian sudah diisi. Anda tetap bisa mengedit setelahnya.'}
            </p>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            {!isDone && (
              <Button
                onClick={() => setConfirmDone(true)}
                disabled={markDone.isPending}
              >
                {markDone.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                )}
                Tandai Selesai
              </Button>
            )}
            {isDone && (
              <Button
                variant='outline'
                onClick={() => setConfirmRevert(true)}
                disabled={revert.isPending}
              >
                {revert.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <RotateCcw className='mr-2 h-4 w-4' />
                )}
                Buka Kembali
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDone} onOpenChange={setConfirmDone}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai laporan sebagai selesai?</AlertDialogTitle>
            <AlertDialogDescription>
              Status laporan akan berubah menjadi <strong>Selesai</strong> dan
              snapshot sensus akan disimpan. Anda tetap bisa mengedit laporan
              setelah ditandai selesai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkDone}>
              Ya, Tandai Selesai
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRevert} onOpenChange={setConfirmRevert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan ke Belum Selesai?</AlertDialogTitle>
            <AlertDialogDescription>
              Status laporan akan dikembalikan ke <strong>Belum Selesai</strong>.
              Snapshot sensus yang sudah tersimpan tetap ada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              Ya, Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
