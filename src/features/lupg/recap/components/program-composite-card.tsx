import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type ProgramReportRow } from '../../types'
import { formatMonthLabel } from '../../utils/month-utils'
import { ProgramDrillDrawer } from './program-drill-drawer'
import { ProgramHeatmapTable, type HeatmapRow } from './program-heatmap-table'
import {
  ProgramStatusStrip,
  type StatusStripEntry,
} from './program-status-strip'

interface ProgramDefLite {
  code: string
  name: string
  denominator_label: string
  count_label: string
}

export interface ProgramCompositeCardData {
  /** Oldest → newest. Length 5. */
  monthKeys: string[]
  /** The active (last) month key from monthKeys. */
  currentMonthKey: string
  /** Heatmap rows — one per kelompok. */
  rows: HeatmapRow[]
  /** Map kelompokId → monthly_report_id for the CURRENT month (for drawer link). */
  monthlyReportIdByKelompok: Map<string, string>
  /** Map kelompokId → program_report row for the CURRENT month (for drawer contents). */
  currentRowByKelompok: Map<string, ProgramReportRow>
}

interface Props {
  program: ProgramDefLite
  data: ProgramCompositeCardData
}

export function ProgramCompositeCard({ program, data }: Props) {
  // Drawer state resets naturally when the parent passes a new `key` on month
  // change (see call site in recap/index.tsx) — no useEffect needed.
  const [selectedKelompokId, setSelectedKelompokId] = useState<string | null>(
    null
  )

  const statusEntries: StatusStripEntry[] = data.rows.map((r) => {
    const lastIdx = r.cells.length - 1
    const current = r.cells[lastIdx]?.value ?? null
    const prev = lastIdx > 0 ? (r.cells[lastIdx - 1]?.value ?? null) : null
    return {
      kelompokId: r.kelompokId,
      kelompokName: r.kelompokName,
      currentPct: current,
      prevPct: prev,
      onClick: () =>
        setSelectedKelompokId((cur) =>
          cur === r.kelompokId ? null : r.kelompokId
        ),
      isActive: selectedKelompokId === r.kelompokId,
    }
  })

  const handleRowClick = (kelompokId: string) => {
    setSelectedKelompokId((cur) => (cur === kelompokId ? null : kelompokId))
  }

  const selectedRow = selectedKelompokId
    ? data.rows.find((r) => r.kelompokId === selectedKelompokId)
    : null
  const selectedKelompokName = selectedRow?.kelompokName ?? ''
  const selectedProgramRow = selectedKelompokId
    ? data.currentRowByKelompok.get(selectedKelompokId)
    : undefined
  const selectedMonthlyReportId = selectedKelompokId
    ? data.monthlyReportIdByKelompok.get(selectedKelompokId)
    : undefined

  return (
    <Card className='print:break-inside-avoid print:shadow-none'>
      <CardHeader>
        <CardTitle>{program.name}</CardTitle>
        <CardDescription>
          {program.denominator_label} → {program.count_label}
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <ProgramStatusStrip entries={statusEntries} />
        <ProgramHeatmapTable
          monthKeys={data.monthKeys}
          rows={data.rows}
          selectedKelompokId={selectedKelompokId}
          onRowClick={handleRowClick}
        />
        {selectedKelompokId && (
          <ProgramDrillDrawer
            program={program}
            kelompokName={selectedKelompokName}
            monthLabel={formatMonthLabel(data.currentMonthKey)}
            monthlyReportId={selectedMonthlyReportId}
            row={selectedProgramRow}
            onClose={() => setSelectedKelompokId(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
