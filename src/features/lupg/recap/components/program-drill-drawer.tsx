import { Link } from '@tanstack/react-router'
import { ExternalLink, X } from 'lucide-react'
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
    <div className='bg-muted/30 mt-2 rounded-md border p-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div>
          <div className='text-muted-foreground text-xs uppercase tracking-wide'>
            {kelompokName} · {monthLabel}
          </div>
          <div className='text-sm font-semibold'>{program.name}</div>
        </div>
        <Button variant='ghost' size='sm' onClick={onClose} aria-label='Tutup'>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <section>
          <div className='text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide'>
            {noteLabel}
          </div>
          {notes ? (
            <p className='whitespace-pre-wrap text-sm'>{notes}</p>
          ) : (
            <p className='text-muted-foreground text-sm italic'>
              Belum ada catatan.
            </p>
          )}
        </section>

        {cluster && (
          <section>
            <div className='text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide'>
              Breakdown 3 Cluster
            </div>
            <dl className='grid grid-cols-3 gap-2 text-sm'>
              <div className='bg-card rounded border p-2'>
                <dt className='text-muted-foreground text-xs'>Belum Siap</dt>
                <dd className='font-mono text-lg tabular-nums'>
                  {cluster.not_ready}
                </dd>
              </div>
              <div className='bg-card rounded border p-2'>
                <dt className='text-muted-foreground text-xs'>Siap</dt>
                <dd className='font-mono text-lg tabular-nums'>
                  {cluster.ready}
                </dd>
              </div>
              <div className='bg-card rounded border p-2'>
                <dt className='text-muted-foreground text-xs'>Menikah</dt>
                <dd className='font-mono text-lg tabular-nums'>
                  {cluster.married}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {monthlyReportId && (
        <div className='mt-3'>
          <Link
            to='/admin/lupg/reports/$monthlyReportId'
            params={{ monthlyReportId }}
            className='text-primary hover:underline inline-flex items-center gap-1 text-xs'
          >
            Buka laporan bulan ini
            <ExternalLink className='h-3 w-3' />
          </Link>
        </div>
      )}
    </div>
  )
}
