import { Link } from '@tanstack/react-router'
import { ArrowUpRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseNikahClusterExtras } from '../../programs/types'
import { type ProgramReportRow } from '../../types'

interface ProgramDefLite {
  code: string
  name: string
}

interface Props {
  program: ProgramDefLite
  kelompokName: string
  monthLabel: string
  monthlyReportId: string | undefined
  row: ProgramReportRow | undefined
  onClose: () => void
}

export function ProgramDrillDrawer({
  program,
  kelompokName,
  monthLabel,
  monthlyReportId,
  row,
  onClose,
}: Props) {
  const notes = row?.notes?.trim()
  const isNikahJm = program.code === 'NIKAH_JM'
  const cluster = isNikahJm ? parseNikahClusterExtras(row?.extras) : null

  const noteLabel = program.code === 'SHOLAT_ACR' ? 'Keterangan' : 'Hasil Temuan'

  return (
    <div className='border-border/70 bg-muted/20 mt-3 rounded-lg border px-4 py-4'>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <div className='text-muted-foreground text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
            {kelompokName} · {monthLabel}
          </div>
          <div className='mt-0.5 text-base font-semibold tracking-tight'>
            {program.name}
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='-mr-1 -mt-1 h-7 w-7 shrink-0'
          onClick={onClose}
          aria-label='Tutup'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <section>
          <div className='text-muted-foreground mb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
            {noteLabel}
          </div>
          {notes ? (
            <p className='whitespace-pre-wrap text-sm leading-relaxed'>
              {notes}
            </p>
          ) : (
            <p className='text-muted-foreground text-sm italic'>
              Belum ada catatan.
            </p>
          )}
        </section>

        {cluster && (
          <section>
            <div className='text-muted-foreground mb-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em]'>
              Breakdown 3 Cluster
            </div>
            <dl className='divide-border/70 border-border/70 bg-background grid grid-cols-3 divide-x rounded-md border'>
              <ClusterCell label='Belum Siap' value={cluster.not_ready} />
              <ClusterCell label='Siap' value={cluster.ready} />
              <ClusterCell label='Menikah' value={cluster.married} />
            </dl>
          </section>
        )}
      </div>

      {monthlyReportId && (
        <div className='mt-4'>
          <Link
            to='/admin/lupg/reports/$monthlyReportId'
            params={{ monthlyReportId }}
            className='text-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center gap-1 rounded text-xs font-medium transition-colors'
          >
            Buka laporan bulan ini
            <ArrowUpRight className='h-3.5 w-3.5' strokeWidth={2.25} />
          </Link>
        </div>
      )}
    </div>
  )
}

function ClusterCell({ label, value }: { label: string; value: number }) {
  return (
    <div className='flex flex-col items-center justify-center px-2 py-2.5'>
      <dt className='text-muted-foreground text-[0.625rem] font-medium uppercase tracking-widest'>
        {label}
      </dt>
      <dd className='mt-0.5 text-xl font-semibold tabular-nums'>{value}</dd>
    </div>
  )
}
