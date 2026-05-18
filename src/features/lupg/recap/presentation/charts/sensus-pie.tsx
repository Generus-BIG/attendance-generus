// Sensus pie chart (kelompok mode) — solid pie of the 5 generus categories with external labels.
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { SENSUS_CATEGORY_COLORS } from '../theme'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { EditorialTooltipShell } from './chart-primitives'

type GenerusCode = 'GPN_A' | 'GPN_B' | 'AR' | 'APR' | 'ACR'

export interface SensusPieDatum {
  code: GenerusCode
  label: string
  male: number
  female: number
  total: number
}

export interface SensusPieProps {
  data: SensusPieDatum[]
}

interface RechartsLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  index?: number
  payload?: SensusPieDatum & { _grandTotal?: number }
  palette: PresPalette
}

function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}` : `${rounded.toFixed(1)}`
}

function ExternalLabel(props: RechartsLabelProps) {
  const { cx, cy, midAngle, outerRadius, payload, palette } = props
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    outerRadius == null ||
    !payload ||
    !payload._grandTotal ||
    payload.total === 0
  ) {
    return null
  }
  const RAD = Math.PI / 180
  const sin = Math.sin(-midAngle * RAD)
  const cos = Math.cos(-midAngle * RAD)
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin
  const mx = cx + (outerRadius + 12) * cos
  const my = cy + (outerRadius + 12) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 18
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'
  const pct = (payload.total / payload._grandTotal) * 100
  const labelText = `${payload.label} · ${payload.total} · ${formatPct(pct)}%`
  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={palette.muted}
        strokeWidth={1}
        fill='none'
      />
      <circle cx={ex} cy={ey} r={2} fill={palette.muted} stroke='none' />
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline='central'
        style={{
          fontFamily: palette.fontMono,
          fontWeight: 700,
          fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
          fill: palette.ink,
        }}
      >
        {labelText}
      </text>
    </g>
  )
}

interface TooltipPayloadEntry {
  payload?: SensusPieDatum & { _grandTotal?: number }
}

interface TipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  palette: PresPalette
}

function CustomTooltip({ active, payload, palette }: TipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload
  if (!datum || !datum._grandTotal) return null
  const pct = (datum.total / datum._grandTotal) * 100
  return (
    <EditorialTooltipShell title={datum.label} palette={palette}>
      <div>Laki-laki: {datum.male}</div>
      <div>Perempuan: {datum.female}</div>
      <div>
        Total: {datum.total} ({formatPct(pct)}%)
      </div>
    </EditorialTooltipShell>
  )
}

export function SensusPie({ data }: SensusPieProps) {
  const palette = usePresPalette()
  const grandTotal = data.reduce((acc, d) => acc + d.total, 0)
  if (grandTotal === 0) {
    return (
      <div
        className='flex h-full w-full items-center justify-center'
        style={{
          fontFamily: palette.fontSans,
          fontSize: 'clamp(1rem, 1.4vw, 1.5rem)',
          color: palette.muted,
        }}
      >
        Belum ada data sensus
      </div>
    )
  }
  const enriched = data.map((d) => ({ ...d, _grandTotal: grandTotal }))
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <PieChart margin={{ top: 24, right: 80, bottom: 24, left: 80 }}>
        <Tooltip
          content={(p) => (
            <CustomTooltip
              {...(p as unknown as Omit<TipProps, 'palette'>)}
              palette={palette}
            />
          )}
        />
        <Pie
          data={enriched}
          dataKey='total'
          nameKey='label'
          cx='50%'
          cy='50%'
          outerRadius='70%'
          innerRadius={0}
          stroke={palette.bg}
          strokeWidth={1}
          isAnimationActive={false}
          label={(p) => (
            <ExternalLabel
              {...(p as unknown as Omit<RechartsLabelProps, 'palette'>)}
              palette={palette}
            />
          )}
          labelLine={false}
        >
          {enriched.map((d) => (
            <Cell key={d.code} fill={SENSUS_CATEGORY_COLORS[d.code]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
