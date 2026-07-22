import { useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReportStatusBadge } from '../../components/report-status-badge'
import {
  useActiveCharacterMonitoringActivities,
  useCharacterMonitoringReports,
  useCharacterTargetItemsForMonth,
  useCharacterTargetReports,
  useSubmitMonthlyReport,
  useUnlockMonthlyReport,
} from '../../hooks/use-lupg-queries'
import { type MonthlyReportRow } from '../../types'
import { normalizeCharacterStatus } from '../../utils/character-monitoring'

interface Props {
  report: MonthlyReportRow
}

export function SubmitCard({ report }: Props) {
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmRevert, setConfirmRevert] = useState(false)

  const markDone = useSubmitMonthlyReport()
  const revert = useUnlockMonthlyReport()
  const year = Number(report.month.slice(0, 4))
  const monthIndex = Number(report.month.slice(5, 7))
  const { data: activities = [] } = useActiveCharacterMonitoringActivities()
  const { data: characterReports = [] } = useCharacterMonitoringReports(
    report.id
  )
  const { data: targetData } = useCharacterTargetItemsForMonth(year, monthIndex)
  const { data: targetReports = [] } = useCharacterTargetReports(report.id)

  const assessedActivityIds = new Set(
    characterReports
      .filter((row) => normalizeCharacterStatus(row.status) !== null)
      .map((row) => row.activity_id)
  )
  const completedTargetIds = new Set(
    targetReports
      .filter(
        (row) =>
          row.realization_percent !== null &&
          row.realization_percent !== undefined
      )
      .map((row) => row.target_item_id)
  )
  const incompleteCharacterCount = activities.filter(
    (activity) => !assessedActivityIds.has(activity.id)
  ).length
  const targetItems = targetData?.items ?? []
  const incompleteTargetCount = targetItems.filter(
    (item) => !completedTargetIds.has(item.id)
  ).length
  const hasIncompleteWork =
    incompleteCharacterCount > 0 || incompleteTargetCount > 0

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
        const msg =
          e instanceof Error ? e.message : 'Gagal mengembalikan status'
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
                <span className='text-xs text-muted-foreground'>
                  Ditandai selesai{' '}
                  {new Date(report.submitted_at).toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              {isDone
                ? 'Laporan ditandai selesai. Anda masih bisa mengedit bagian-bagian di atas jika ada revisi.'
                : 'Tandai laporan sebagai selesai jika seluruh bagian sudah diisi. Anda tetap bisa mengedit setelahnya.'}
            </p>
          </div>
          <div className='flex w-full shrink-0 items-center gap-2 sm:w-auto'>
            {!isDone && (
              <Button
                className='min-h-11 w-full sm:w-auto'
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
                className='min-h-11 w-full sm:w-auto'
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
            {hasIncompleteWork ? (
              <div className='rounded-md bg-muted p-3 text-sm text-muted-foreground'>
                <p className='font-medium text-foreground'>
                  Masih ada isian yang belum lengkap:
                </p>
                <ul className='mt-1 list-disc pl-5'>
                  {incompleteTargetCount > 0 ? (
                    <li>{incompleteTargetCount} target materi belum diisi</li>
                  ) : null}
                  {incompleteCharacterCount > 0 ? (
                    <li>
                      {incompleteCharacterCount} konteks karakter belum dinilai
                    </li>
                  ) : null}
                </ul>
                <p className='mt-2'>
                  Ini hanya pengingat. Anda tetap dapat melanjutkan.
                </p>
              </div>
            ) : null}
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
              Status laporan akan dikembalikan ke <strong>Belum Selesai</strong>
              . Snapshot sensus yang sudah tersimpan tetap ada.
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
