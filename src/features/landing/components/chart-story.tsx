import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { chartProgress, demoRows } from './chart-progress'

// Illustrative demo values, deliberately separate from the authentic hero captures.
const groups = [
  ['Meruyung', 92],
  ['BIG 2', 88],
  ['Limo', 84],
  ['Cakra', 81],
  ['BIG 1', 78],
] as const
const categories = [
  ['GPN A', 91],
  ['GPN B', 86],
  ['AR', 82],
  ['APR', 88],
] as const
const attendance = [
  ['Present', 86],
  ['Excused', 8],
  ['Absent', 6],
] as const
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
const trend = [62, 66, 65, 72, 76, 75, 81, 84, 89].map((value, index) => ({
  label: months[index],
  value,
}))
const rows = (values: readonly (readonly [string, number])[]) =>
  values.map(([label, value]) => ({ label, value }))
const stories = {
  absensi: [
    {
      title: 'See where attendance differs.',
      description:
        'Compare groups on the same percentage scale. The recap gives your team a starting point for follow-up.',
      chart: 'Attendance by group',
      type: 'bar',
      data: rows(groups),
      note: 'Average attendance by group · illustrative percentages',
    },
    {
      title: 'Look closer at each category.',
      description:
        'Break attendance down by age category to understand which groups need a closer look.',
      chart: 'Attendance by category',
      type: 'bar',
      data: rows(categories),
      note: 'Categories with recorded attendance · illustrative percentages',
    },
    {
      title: 'Keep absence in the picture.',
      description:
        'Separate recorded attendance, excused absence, and absence. Each tells your team something different about the meeting.',
      chart: 'Attendance breakdown',
      type: 'donut',
      data: rows(attendance),
      note: 'Share of all attendance slots · illustrative percentages',
    },
  ],
  lupg: [
    {
      title: 'Follow the year, month by month.',
      description:
        'A monthly result is easier to understand in context. Review the village average across the year before deciding what comes next.',
      chart: 'Village program trend',
      type: 'line',
      data: trend,
      note: 'January–September · illustrative village average',
    },
    {
      title: 'Give the review a clear reference.',
      description:
        'Compare recent village averages with the dashboard’s 80% program target. Use the gap to focus the next review.',
      chart: 'Recent results against target',
      type: 'target',
      data: trend.slice(-3),
      note: 'Village averages · dashed line marks the 80% target',
    },
  ],
} as const
const config = { value: { label: 'Percentage', color: 'var(--chart-1)' } }
const colors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
const percent = (value: number) => `${value}%`

function PreviewChart({
  step,
  progress,
}: {
  step: (typeof stories)[keyof typeof stories][number]
  progress: number
}) {
  const axis = (
    <>
      <CartesianGrid vertical={false} strokeDasharray='3 4' />
      <XAxis
        dataKey='label'
        axisLine={false}
        tickLine={false}
        tickMargin={12}
        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
      />
      <YAxis
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        tickFormatter={percent}
        axisLine={false}
        tickLine={false}
        width={42}
        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
      />
    </>
  )
  const tooltip = (
    <ChartTooltip
      content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
    />
  )
  return (
    <ChartContainer config={config} className='landing-live-chart'>
      {step.type === 'donut' ? (
        <PieChart accessibilityLayer>
          <Pie
            data={step.data}
            dataKey='value'
            nameKey='label'
            innerRadius='58%'
            outerRadius='86%'
            startAngle={90}
            endAngle={90 - 360 * progress}
            paddingAngle={3 * progress}
            isAnimationActive={false}
          >
            {step.data.map((row, i) => (
              <Cell key={row.label} fill={colors[i]} />
            ))}
          </Pie>
          {tooltip}
        </PieChart>
      ) : step.type === 'line' ? (
        <LineChart
          accessibilityLayer
          data={step.data}
          margin={{ top: 20, right: 12, bottom: 12, left: 0 }}
        >
          {axis}
          <ReferenceLine
            y={80}
            stroke='var(--muted-foreground)'
            strokeDasharray='5 5'
          />
          <Line
            type='linear'
            dataKey='value'
            stroke='var(--chart-1)'
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--background)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {tooltip}
        </LineChart>
      ) : (
        <BarChart
          accessibilityLayer
          data={step.data}
          margin={{ top: 24, right: 12, bottom: 12, left: 0 }}
        >
          {axis}
          {step.type === 'target' && (
            <ReferenceLine
              y={80}
              stroke='var(--muted-foreground)'
              strokeDasharray='5 5'
            />
          )}
          <Bar
            dataKey='value'
            radius={[5, 5, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          >
            {step.data.map((row, i) => (
              <Cell
                key={row.label}
                fill={step.type === 'target' ? colors[0] : colors[i]}
              />
            ))}
            <LabelList
              dataKey='value'
              position='top'
              formatter={(value) => `${value}%`}
              fill='var(--foreground)'
              fontSize={12}
            />
          </Bar>
          {tooltip}
        </BarChart>
      )}
    </ChartContainer>
  )
}

export function ChartStory({ workspace }: { workspace: keyof typeof stories }) {
  const root = useRef<HTMLDivElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [progress, setProgress] = useState<number[]>([])
  const [active, setActive] = useState(0)
  const steps = stories[workspace]

  useEffect(() => {
    const media = window.matchMedia(
      '(min-width: 1024px) and (min-height: 800px) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    )
    let frame = 0
    const update = () => {
      frame = 0
      if (!media.matches || !root.current) return
      const panels = [
        ...root.current.querySelectorAll<HTMLElement>('.landing-chart-panel'),
      ]
      const tops = panels.map((panel) => panel.getBoundingClientRect().top)
      const next = tops.map(
        (top) => Math.round(chartProgress(top, window.innerHeight) * 100) / 100
      )
      let current = 0
      tops.forEach((top, index) => {
        if (top <= window.innerHeight * 0.55) current = index
      })
      setActive(current)
      setProgress((previous) =>
        previous.every((value, i) => value === next[i]) &&
        previous.length === next.length
          ? previous
          : next
      )
    }
    const schedule = () => {
      if (!frame && media.matches) frame = requestAnimationFrame(update)
    }
    const sync = () => {
      setEnhanced(media.matches)
      schedule()
    }
    sync()
    media.addEventListener('change', sync)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      media.removeEventListener('change', sync)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div
      ref={root}
      className='landing-chart-story'
      data-enhanced={enhanced}
      style={{ '--story-count': steps.length } as CSSProperties}
    >
      {steps.map((source, index) => {
        const fill = enhanced ? (progress[index] ?? 0) : 1
        const step = {
          ...source,
          data: demoRows(source.data, fill),
        }
        return (
          <section
            className='landing-chart-step'
            key={step.chart}
            style={{ '--step-row': index + 1 } as CSSProperties}
            data-active={index === active}
            onFocusCapture={() => setActive(index)}
            aria-labelledby={`${workspace}-step-${index}`}
          >
            <div
              className='landing-chart-narrative'
              aria-hidden={enhanced && index !== active}
            >
              <span className='landing-chart-eyebrow'>
                {workspace === 'absensi' ? 'Absensi' : 'LUPG'} / 0{index + 1}
              </span>
              <h4 id={`${workspace}-step-${index}`}>{step.title}</h4>
              <p>{step.description}</p>
            </div>
            <figure className='landing-chart-panel' aria-label={step.chart}>
              <figcaption>
                <span>{step.chart}</span>
                <small>Demo data · illustrative results</small>
              </figcaption>
              <PreviewChart step={step} progress={fill} />
              {step.type === 'donut' && (
                <ul className='landing-chart-legend'>
                  {step.data.map((row, i) => (
                    <li key={row.label}>
                      <i style={{ background: colors[i] }} />
                      {row.label}
                      <strong>{row.value}%</strong>
                    </li>
                  ))}
                </ul>
              )}
              <p className='landing-chart-note'>{step.note}</p>
              <p className='sr-only'>
                {step.data
                  .map((row) => `${row.label}: ${row.value}%`)
                  .join(', ')}
              </p>
            </figure>
          </section>
        )
      })}
    </div>
  )
}
